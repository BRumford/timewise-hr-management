import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { SecurityMonitor, IntrusionDetection, SecurityEventType, SecuritySeverity } from "./monitoring";
import { db } from "../db";
import { auditLogs } from "@shared/schema";

// Security Headers Middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Rate Limiting Middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await SecurityMonitor.recordSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecuritySeverity.MEDIUM,
      `Rate limit exceeded for IP: ${req.ip}`,
      undefined,
      req.ip,
      req.get('User-Agent'),
      { endpoint: req.path, method: req.method }
    );
    
    res.status(429).json({
      error: "Too many requests from this IP, please try again later."
    });
  }
});

// Strict Rate Limiting for Authentication Endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 authentication attempts per windowMs
  message: {
    error: "Too many authentication attempts, please try again later."
  },
  handler: async (req: Request, res: Response) => {
    await SecurityMonitor.recordSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecuritySeverity.HIGH,
      `Authentication rate limit exceeded for IP: ${req.ip}`,
      undefined,
      req.ip,
      req.get('User-Agent'),
      { endpoint: req.path, method: req.method }
    );
    
    res.status(429).json({
      error: "Too many authentication attempts, please try again later."
    });
  }
});

// Audit Logging Middleware
export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Get user info if available
  const user = (req as any).user;
  const userId = user?.id || user?.userId || 'anonymous';
  
  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody: any = null;
  
  // Override response methods to capture response
  res.send = function(body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };
  
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Continue with request processing
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determine severity based on status code and endpoint
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (statusCode >= 500) {
      severity = 'high';
    } else if (statusCode >= 400) {
      severity = 'medium';
    } else if (req.path.includes('login') || req.path.includes('auth')) {
      severity = 'medium';
    }
    
    // Log sensitive operations
    const sensitiveEndpoints = [
      '/api/auth/',
      '/api/users/',
      '/api/payroll/',
      '/api/employees/',
      '/api/leave-requests/',
      '/api/documents/'
    ];
    
    const isSensitive = sensitiveEndpoints.some(endpoint => 
      req.path.startsWith(endpoint)
    );
    
    if (isSensitive || statusCode >= 400) {
      try {
        await db.insert(auditLogs).values({
          userId,
          action: `${req.method}_${req.path}`,
          entityType: req.path.split('/')[2] || 'unknown',
          entityId: req.params.id || '',
          description: `${req.method} ${req.path} - ${statusCode} (${duration}ms)`,
          ipAddress: req.ip || '',
          userAgent: req.get('User-Agent') || '',
          severity,
          metadata: JSON.stringify({
            statusCode,
            duration,
            responseSize: res.get('Content-Length') || 0,
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined
          })
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    }
    
    // Log security events for failed requests
    if (statusCode === 401) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.MEDIUM,
        `Unauthorized access attempt to ${req.path}`,
        userId,
        req.ip,
        req.get('User-Agent'),
        { endpoint: req.path, method: req.method }
      );
    } else if (statusCode === 403) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.HIGH,
        `Forbidden access attempt to ${req.path}`,
        userId,
        req.ip,
        req.get('User-Agent'),
        { endpoint: req.path, method: req.method }
      );
    }
  });
  
  next();
};

// Input Validation and Sanitization Middleware
export const inputValidation = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const userId = user?.id || user?.userId || 'anonymous';
  
  // Run intrusion detection
  const isRequestSafe = await IntrusionDetection.analyzeRequest(
    userId,
    req.ip || '',
    req.get('User-Agent') || '',
    req.path,
    req.method
  );
  
  if (!isRequestSafe) {
    return res.status(400).json({
      error: "Request contains potentially malicious content"
    });
  }
  
  next();
};

// IP Whitelist Middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.includes(clientIP || '')) {
      next();
    } else {
      SecurityMonitor.recordSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.HIGH,
        `Access denied from non-whitelisted IP: ${clientIP}`,
        undefined,
        clientIP,
        req.get('User-Agent'),
        { endpoint: req.path, method: req.method }
      );
      
      res.status(403).json({
        error: "Access denied from this IP address"
      });
    }
  };
};

// Request Size Limit Middleware
export const requestSizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const limitBytes = parseLimit(limit);
    
    if (contentLength > limitBytes) {
      SecurityMonitor.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        `Request size exceeded limit: ${contentLength} bytes`,
        undefined,
        req.ip,
        req.get('User-Agent'),
        { endpoint: req.path, method: req.method, size: contentLength }
      );
      
      return res.status(413).json({
        error: "Request entity too large"
      });
    }
    
    next();
  };
};

// Helper function to parse size limits
function parseLimit(limit: string): number {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = limit.match(/^(\d+)([a-z]+)$/i);
  if (!match) return 1024 * 1024; // Default 1MB
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  return value * (units[unit as keyof typeof units] || 1);
}

// CORS Security Configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      'https://localhost:3000',
      'https://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.REPLIT_DOMAIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      SecurityMonitor.recordSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.MEDIUM,
        `CORS violation from origin: ${origin}`,
        undefined,
        undefined,
        undefined,
        { origin, allowedOrigins }
      );
      
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// File Upload Security Middleware
export const fileUploadSecurity = (allowedMimeTypes: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    
    if (!file) {
      return next();
    }
    
    // Check file type
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        `Attempted upload of disallowed file type: ${file.mimetype}`,
        (req as any).user?.id,
        req.ip,
        req.get('User-Agent'),
        { filename: file.originalname, mimetype: file.mimetype }
      );
      
      return res.status(400).json({
        error: "File type not allowed"
      });
    }
    
    // Check file size (additional to multer limits)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        `Attempted upload of oversized file: ${file.size} bytes`,
        (req as any).user?.id,
        req.ip,
        req.get('User-Agent'),
        { filename: file.originalname, size: file.size }
      );
      
      return res.status(400).json({
        error: "File size too large"
      });
    }
    
    next();
  };
};