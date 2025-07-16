import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { emailAlerts } from '../emailAlerts';
import { storage } from '../storage';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for development
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections for Vite HMR
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    await emailAlerts.sendSecurityAlert(
      'rate_limit_exceeded',
      'medium',
      `Rate limit exceeded for IP: ${ipAddress}`,
      { ip: ipAddress, userAgent: req.headers['user-agent'] }
    );
    
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  },
});

// Authentication-specific rate limiting
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    await emailAlerts.sendSecurityAlert(
      'auth_rate_limit_exceeded',
      'high',
      `Authentication rate limit exceeded for IP: ${ipAddress}`,
      { ip: ipAddress, userAgent: req.headers['user-agent'] }
    );
    
    res.status(429).json({
      error: 'Too many login attempts, please try again later.'
    });
  },
});

// Audit logging middleware
export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';
  
  // Skip logging for static assets and frequent requests
  if (req.path.includes('/src/') || req.path.includes('.js') || req.path.includes('.css') || req.path.includes('.tsx')) {
    return next();
  }
  
  // Log the request
  const auditData = {
    userId,
    action: `${req.method} ${req.path}`,
    entityType: 'http_request',
    entityId: req.path,
    description: `${req.method} request to ${req.path}`,
    ipAddress,
    userAgent,
    severity: 'low',
    metadata: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
      timestamp: new Date().toISOString(),
    }
  };

  // Store audit log (for now, just console.log)
  console.log('Audit Log:', auditData);

  // Continue to next middleware
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`Request completed: ${req.method} ${req.path} - ${res.statusCode} in ${duration}ms`);
  });
  
  next();
};

// Input validation middleware
export const inputValidation = async (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/i, // SQL injection
    /<script[^>]*>.*?<\/script>/gi, // XSS
    /javascript:/i, // JavaScript protocol
    /vbscript:/i, // VBScript protocol
    /onload=/i, // Event handlers
    /onerror=/i,
    /onclick=/i,
  ];

  const checkForSuspiciousContent = (obj: any, path = ''): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForSuspiciousContent(obj[key], `${path}.${key}`)) {
          return true;
        }
      }
    }
    
    return false;
  };

  const requestData = { ...req.body, ...req.query, ...req.params };
  
  if (checkForSuspiciousContent(requestData)) {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    await emailAlerts.sendSecurityAlert(
      'suspicious_input_detected',
      'high',
      `Suspicious input detected from IP: ${ipAddress}`,
      { 
        ip: ipAddress, 
        userAgent: req.headers['user-agent'],
        requestData,
        path: req.path
      }
    );
    
    return res.status(400).json({
      error: 'Invalid input detected'
    });
  }
  
  next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      emailAlerts.sendSecurityAlert(
        'unauthorized_ip_access',
        'high',
        `Access attempt from unauthorized IP: ${clientIP}`,
        { ip: clientIP, userAgent: req.headers['user-agent'] }
      );
      
      return res.status(403).json({
        error: 'Access denied'
      });
    }
    
    next();
  };
};

// Request size limit middleware
export const requestSizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const limitInBytes = parseLimit(limit);
      
      if (sizeInBytes > limitInBytes) {
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        
        emailAlerts.sendSecurityAlert(
          'request_size_limit_exceeded',
          'medium',
          `Request size limit exceeded from IP: ${ipAddress}`,
          { ip: ipAddress, size: sizeInBytes, limit: limitInBytes }
        );
        
        return res.status(413).json({
          error: 'Request entity too large'
        });
      }
    }
    
    next();
  };
};

function parseLimit(limit: string): number {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024,
  };
  
  const match = limit.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024; // Default to 10MB
  
  const [, size, unit] = match;
  return parseInt(size, 10) * (units[unit as keyof typeof units] || 1);
}

// CORS configuration
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// File upload security middleware
export const fileUploadSecurity = (allowedMimeTypes: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file type
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type'
        });
      }
      
      // Check file size (already handled by multer, but double-check)
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return res.status(400).json({
          error: 'File too large'
        });
      }
      
      // Log file upload
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      console.log(`File upload: ${file.originalname} (${file.mimetype}) from IP: ${ipAddress}`);
    }
    
    next();
  };
};