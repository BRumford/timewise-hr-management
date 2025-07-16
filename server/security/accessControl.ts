import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';
import { DataEncryption } from './encryption';

// JWT secret for token signing
const JWT_SECRET = process.env.JWT_SECRET || DataEncryption.generateSecureToken(64);

export interface SecureUser {
  id: string;
  role: 'employee' | 'admin' | 'hr';
  employee?: any;
  sessionId: string;
  permissions: string[];
}

// Role-based permissions system
export const PERMISSIONS = {
  // Employee data permissions
  VIEW_OWN_PROFILE: 'view_own_profile',
  VIEW_ALL_EMPLOYEES: 'view_all_employees',
  EDIT_OWN_PROFILE: 'edit_own_profile',
  EDIT_ALL_EMPLOYEES: 'edit_all_employees',
  DELETE_EMPLOYEES: 'delete_employees',
  
  // Payroll permissions
  VIEW_OWN_PAYROLL: 'view_own_payroll',
  VIEW_ALL_PAYROLL: 'view_all_payroll',
  PROCESS_PAYROLL: 'process_payroll',
  
  // Leave management permissions
  REQUEST_LEAVE: 'request_leave',
  APPROVE_LEAVE: 'approve_leave',
  VIEW_ALL_LEAVE: 'view_all_leave',
  
  // Document permissions
  UPLOAD_DOCUMENTS: 'upload_documents',
  VIEW_ALL_DOCUMENTS: 'view_all_documents',
  DELETE_DOCUMENTS: 'delete_documents',
  
  // System administration
  MANAGE_USERS: 'manage_users',
  SYSTEM_SETTINGS: 'system_settings',
  AUDIT_LOGS: 'audit_logs',
  
  // Data security
  ENCRYPT_DATA: 'encrypt_data',
  EXPORT_DATA: 'export_data',
  ARCHIVE_DATA: 'archive_data'
};

// Role permission mappings
export const ROLE_PERMISSIONS = {
  employee: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.VIEW_OWN_PAYROLL,
    PERMISSIONS.REQUEST_LEAVE,
    PERMISSIONS.UPLOAD_DOCUMENTS
  ],
  admin: [
    // All employee permissions plus admin-specific
    ...Object.values(PERMISSIONS).filter(p => 
      !p.includes('ENCRYPT_DATA') && !p.includes('SYSTEM_SETTINGS')
    )
  ],
  hr: Object.values(PERMISSIONS) // HR has all permissions
};

// Enhanced authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        code: 'TOKEN_MISSING' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get user from database with current role
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid token - user not found',
        code: 'USER_NOT_FOUND' 
      });
    }

    // Check if session is still valid
    const sessionValid = await validateSession(decoded.sessionId, user.id);
    if (!sessionValid) {
      return res.status(401).json({ 
        message: 'Session expired or invalid',
        code: 'SESSION_INVALID' 
      });
    }

    // Get user permissions
    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    
    // Get employee record if exists
    let employee = null;
    if (user.role === 'employee') {
      employee = await storage.getEmployeeByUserId(user.id);
    }

    // Add user to request
    (req as any).user = {
      id: user.id,
      role: user.role,
      employee,
      sessionId: decoded.sessionId,
      permissions
    } as SecureUser;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      message: 'Invalid or expired token',
      code: 'TOKEN_INVALID' 
    });
  }
};

// Permission-based access control
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as SecureUser;
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    if (!user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: requiredPermission 
      });
    }

    next();
  };
};

// Multi-factor authentication check
export const requireMFA = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as SecureUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if MFA is required for this user/action
  const mfaRequired = await storage.isMFARequired(user.id);
  
  if (mfaRequired) {
    const mfaToken = req.headers['x-mfa-token'] as string;
    
    if (!mfaToken) {
      return res.status(403).json({ 
        message: 'MFA token required',
        code: 'MFA_REQUIRED' 
      });
    }

    const mfaValid = await storage.verifyMFAToken(user.id, mfaToken);
    if (!mfaValid) {
      return res.status(403).json({ 
        message: 'Invalid MFA token',
        code: 'MFA_INVALID' 
      });
    }
  }

  next();
};

// Data access control - ensure users can only access their own data
export const enforceDataIsolation = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as SecureUser;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Admin and HR can access all data
  if (user.role === 'admin' || user.role === 'hr') {
    return next();
  }

  // Employees can only access their own data
  if (user.role === 'employee') {
    const resourceId = req.params.id || req.params.employeeId;
    
    if (resourceId && user.employee) {
      const requestedId = parseInt(resourceId);
      
      if (requestedId !== user.employee.id) {
        return res.status(403).json({ 
          message: 'Access denied - can only access your own records',
          code: 'DATA_ISOLATION_VIOLATION' 
        });
      }
    }
  }

  next();
};

// Session validation
async function validateSession(sessionId: string, userId: string): Promise<boolean> {
  try {
    // Check if session exists and is still valid
    const session = await storage.getSession(sessionId);
    return session && session.userId === userId && session.expiresAt > new Date();
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

// Generate secure JWT token
export function generateAuthToken(user: SecureUser, sessionId: string): string {
  return jwt.sign(
    { 
      userId: user.id, 
      role: user.role,
      sessionId,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: '8h' } // 8 hour token expiry
  );
}

// Logout and session cleanup
export const secureLogout = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as SecureUser;
    
    if (user && user.sessionId) {
      // Invalidate session
      await storage.invalidateSession(user.sessionId);
      
      // Log security event
      await storage.logSecurityEvent({
        userId: user.id,
        action: 'LOGOUT',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        timestamp: new Date()
      });
    }

    res.json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

// Rate limiting for sensitive operations
export const sensitiveOperationLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many sensitive operations from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// IP whitelist for admin operations
export const adminIPWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip;
  const allowedIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
  
  // Skip IP check in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    return res.status(403).json({ 
      message: 'Access denied from this IP address',
      code: 'IP_BLOCKED' 
    });
  }
  
  next();
};