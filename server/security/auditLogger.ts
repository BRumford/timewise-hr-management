import { storage } from '../storage';
import { DataEncryption } from './encryption';
import type { Request } from 'express';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  errorMessage?: string;
}

export interface SecurityEvent {
  userId: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class AuditLogger {
  // Log user actions for compliance
  static async logUserAction(
    req: Request,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'anonymous';
      
      const logEntry: AuditLogEntry = {
        userId,
        action,
        resource,
        resourceId,
        details: details ? DataEncryption.maskSensitiveData(details) : undefined,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        severity: this.determineSeverity(action, resource),
        success,
        errorMessage
      };

      await storage.createAuditLog(logEntry);
      
      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${userId} ${action} ${resource} ${resourceId || ''} - ${success ? 'SUCCESS' : 'FAILED'}`);
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  // Log security events
  static async logSecurityEvent(
    userId: string,
    action: string,
    ipAddress: string,
    userAgent: string,
    details?: any,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        userId,
        action,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        details: details ? DataEncryption.maskSensitiveData(details) : undefined,
        riskLevel
      };

      await storage.createSecurityEvent(securityEvent);
      
      // Alert on high-risk events
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.alertSecurityTeam(securityEvent);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Determine severity based on action and resource
  private static determineSeverity(action: string, resource: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalActions = ['DELETE', 'EXPORT', 'ARCHIVE', 'ROLE_CHANGE'];
    const criticalResources = ['EMPLOYEE', 'PAYROLL', 'TAXES', 'SETTINGS'];
    
    if (criticalActions.includes(action) && criticalResources.includes(resource)) {
      return 'CRITICAL';
    }
    
    if (criticalActions.includes(action) || criticalResources.includes(resource)) {
      return 'HIGH';
    }
    
    const mediumActions = ['UPDATE', 'CREATE', 'APPROVE'];
    if (mediumActions.includes(action)) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  // Alert security team for high-risk events
  private static async alertSecurityTeam(event: SecurityEvent): Promise<void> {
    try {
      // In production, this would send alerts to security team
      console.warn(`[SECURITY ALERT] ${event.riskLevel} - ${event.action} by ${event.userId} from ${event.ipAddress}`);
      
      // Log to security log file or external security system
      await storage.createSecurityAlert({
        userId: event.userId,
        action: event.action,
        riskLevel: event.riskLevel,
        ipAddress: event.ipAddress,
        details: event.details,
        timestamp: event.timestamp,
        status: 'PENDING'
      });
    } catch (error) {
      console.error('Failed to alert security team:', error);
    }
  }

  // Generate audit report
  static async generateAuditReport(
    startDate: Date,
    endDate: Date,
    userId?: string,
    action?: string,
    resource?: string
  ): Promise<AuditLogEntry[]> {
    try {
      return await storage.getAuditLogs({
        startDate,
        endDate,
        userId,
        action,
        resource
      });
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      return [];
    }
  }

  // Monitor for suspicious activity patterns
  static async detectSuspiciousActivity(userId: string, timeWindow: number = 3600000): Promise<boolean> {
    try {
      const recent = new Date(Date.now() - timeWindow);
      const recentLogs = await storage.getAuditLogs({
        startDate: recent,
        endDate: new Date(),
        userId
      });

      // Check for suspicious patterns
      const failedLogins = recentLogs.filter(log => 
        log.action === 'LOGIN' && !log.success
      ).length;

      const multipleIPAddresses = new Set(
        recentLogs.map(log => log.ipAddress)
      ).size;

      const highRiskActions = recentLogs.filter(log =>
        log.severity === 'HIGH' || log.severity === 'CRITICAL'
      ).length;

      // Flag as suspicious if:
      // - More than 5 failed login attempts
      // - Access from more than 3 different IPs
      // - More than 10 high-risk actions
      if (failedLogins > 5 || multipleIPAddresses > 3 || highRiskActions > 10) {
        await this.logSecurityEvent(
          userId,
          'SUSPICIOUS_ACTIVITY_DETECTED',
          'system',
          'system',
          {
            failedLogins,
            multipleIPAddresses,
            highRiskActions
          },
          'HIGH'
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
      return false;
    }
  }

  // Data access monitoring
  static async monitorDataAccess(
    userId: string,
    dataType: string,
    recordId: string,
    accessType: 'READ' | 'WRITE' | 'DELETE'
  ): Promise<void> {
    try {
      const sensitiveDataTypes = ['EMPLOYEE_SSN', 'PAYROLL_DATA', 'MEDICAL_RECORDS', 'BANKING_INFO'];
      
      if (sensitiveDataTypes.includes(dataType)) {
        await this.logSecurityEvent(
          userId,
          `SENSITIVE_DATA_${accessType}`,
          'system',
          'system',
          {
            dataType,
            recordId,
            accessType
          },
          'HIGH'
        );
      }
    } catch (error) {
      console.error('Failed to monitor data access:', error);
    }
  }
}

// Middleware to automatically log all API requests
export const auditMiddleware = (req: Request, res: any, next: any) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Capture response data
  res.send = function(data: any) {
    const success = res.statusCode < 400;
    const errorMessage = success ? undefined : data?.message || 'Unknown error';
    
    // Log the action
    AuditLogger.logUserAction(
      req,
      req.method,
      req.path,
      req.params.id,
      { query: req.query, body: DataEncryption.maskSensitiveData(req.body) },
      success,
      errorMessage
    );
    
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    const success = res.statusCode < 400;
    const errorMessage = success ? undefined : data?.message || 'Unknown error';
    
    // Log the action
    AuditLogger.logUserAction(
      req,
      req.method,
      req.path,
      req.params.id,
      { query: req.query, body: DataEncryption.maskSensitiveData(req.body) },
      success,
      errorMessage
    );
    
    return originalJson.call(this, data);
  };

  next();
};