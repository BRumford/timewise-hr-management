import { Request, Response, NextFunction } from 'express';
import { emailAlerts } from '../emailAlerts';

// Rate limiting for error alerts to prevent spam
const errorRateLimit = new Map<string, { count: number; lastReset: number }>();

const resetRateLimit = (errorKey: string) => {
  errorRateLimit.set(errorKey, { count: 0, lastReset: Date.now() });
};

const shouldSendAlert = (errorKey: string): boolean => {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  if (!errorRateLimit.has(errorKey)) {
    resetRateLimit(errorKey);
    return true;
  }
  
  const limit = errorRateLimit.get(errorKey)!;
  
  // Reset counter if an hour has passed
  if (now - limit.lastReset > hourInMs) {
    resetRateLimit(errorKey);
    return true;
  }
  
  // Check if we've exceeded the limit
  if (limit.count >= 5) { // Max 5 alerts per hour per error type
    return false;
  }
  
  limit.count++;
  return true;
};

// Middleware to capture and report database errors
export const reportDatabaseErrors = (req: Request, res: Response, next: NextFunction) => {
  const originalQuery = req.query;
  
  // Override response methods to catch database errors
  const originalJson = res.json;
  res.json = function(data: any) {
    if (res.statusCode >= 500 && data?.message?.includes('database')) {
      const errorKey = `database_error_${req.path}`;
      
      if (shouldSendAlert(errorKey)) {
        emailAlerts.sendDatabaseError(
          new Error(data.message || 'Database operation failed'),
          `Database error on ${req.method} ${req.path}`
        );
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to capture and report payroll errors
export const reportPayrollErrors = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to payroll-related routes
  if (!req.path.includes('/payroll')) {
    return next();
  }
  
  const originalJson = res.json;
  res.json = function(data: any) {
    if (res.statusCode >= 500 || (data?.message && data.message.includes('payroll'))) {
      const errorKey = `payroll_error_${req.path}`;
      
      if (shouldSendAlert(errorKey)) {
        emailAlerts.sendPayrollError(
          new Error(data.message || 'Payroll operation failed'),
          `Payroll error on ${req.method} ${req.path}`
        );
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to capture and report authentication errors
export const reportAuthErrors = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function(data: any) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const errorKey = `auth_error_${req.path}`;
      
      if (shouldSendAlert(errorKey)) {
        const userId = (req as any).user?.id;
        emailAlerts.sendAuthenticationError(
          new Error(data.message || 'Authentication failed'),
          userId
        );
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware to capture and report API errors
export const reportAPIErrors = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function(data: any) {
    if (res.statusCode >= 500) {
      const errorKey = `api_error_${req.method}_${req.path}`;
      
      if (shouldSendAlert(errorKey)) {
        const userId = (req as any).user?.id;
        emailAlerts.sendAPIError(
          new Error(data.message || 'API request failed'),
          `${req.method} ${req.path}`,
          userId
        );
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};