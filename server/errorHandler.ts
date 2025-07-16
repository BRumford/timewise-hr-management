import type { Request, Response, NextFunction } from 'express';
import { emailAlerts } from './emailAlerts';

export interface ErrorWithContext extends Error {
  statusCode?: number;
  context?: string;
  userId?: string;
  endpoint?: string;
}

// Global error handler middleware
export const globalErrorHandler = (
  err: ErrorWithContext,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('Global error handler caught:', err);

  // Determine error severity and send email alert
  const endpoint = `${req.method} ${req.path}`;
  const userId = (req as any).user?.id;
  
  // Send email alert based on error type
  if (err.message.includes('database') || err.message.includes('connection')) {
    emailAlerts.sendDatabaseError(err, err.context);
  } else if (err.message.includes('auth') || err.statusCode === 401) {
    emailAlerts.sendAuthenticationError(err, userId);
  } else if (err.message.includes('payroll')) {
    emailAlerts.sendPayrollError(err, err.context);
  } else if (err.statusCode >= 500) {
    emailAlerts.sendSystemError(err, err.context);
  } else {
    // For API errors, use the system error handler
    emailAlerts.sendSystemError(err, err.context || endpoint);
  }

  // Send appropriate response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

// Async error wrapper for route handlers
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Database error handler
export const handleDatabaseError = (error: Error, context?: string) => {
  console.error('Database error:', error);
  emailAlerts.sendDatabaseError(error, context);
  
  const dbError = new Error('Database operation failed') as ErrorWithContext;
  dbError.statusCode = 500;
  dbError.context = context;
  throw dbError;
};

// Authentication error handler
export const handleAuthError = (error: Error, userId?: string) => {
  console.error('Authentication error:', error);
  emailAlerts.sendAuthenticationError(error, userId);
  
  const authError = new Error('Authentication failed') as ErrorWithContext;
  authError.statusCode = 401;
  authError.userId = userId;
  throw authError;
};

// Payroll error handler
export const handlePayrollError = (error: Error, context?: string) => {
  console.error('Payroll error:', error);
  emailAlerts.sendPayrollError(error, context);
  
  const payrollError = new Error('Payroll processing failed') as ErrorWithContext;
  payrollError.statusCode = 500;
  payrollError.context = context;
  throw payrollError;
};

// Generic API error handler
export const handleAPIError = (error: Error, endpoint: string, userId?: string) => {
  console.error('API error:', error);
  emailAlerts.sendAPIError(error, endpoint, userId);
  
  const apiError = new Error('API request failed') as ErrorWithContext;
  apiError.statusCode = 500;
  apiError.endpoint = endpoint;
  apiError.userId = userId;
  throw apiError;
};

// Critical system error handler
export const handleCriticalError = (error: Error, context?: string) => {
  console.error('Critical system error:', error);
  emailAlerts.sendSystemError(error, context);
  
  const criticalError = new Error('Critical system error') as ErrorWithContext;
  criticalError.statusCode = 500;
  criticalError.context = context;
  throw criticalError;
};