import { storage } from '../storage';
import { emailAlerts } from '../emailAlerts';

export enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  ACCOUNT_LOCKOUT = 'account_lockout',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  MALWARE_DETECTED = 'malware_detected',
  UNUSUAL_DATA_ACCESS = 'unusual_data_access'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class SecurityMonitor {
  static async recordSecurityEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    description: string,
    userId: string = 'unknown',
    ipAddress: string = 'unknown',
    metadata: any = {}
  ): Promise<void> {
    const eventData = {
      userId,
      action: eventType,
      entityType: 'security_event',
      entityId: `${eventType}_${Date.now()}`,
      description,
      ipAddress,
      userAgent: metadata.userAgent || 'unknown',
      severity,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        eventType,
      }
    };

    // Log to console for now (in production, this would go to the database)
    console.log('Security Event:', eventData);

    // Send email alert for high/critical events
    if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
      await this.createSecurityAlert(eventData);
    }
  }

  static async createSecurityAlert(event: any): Promise<void> {
    const alertData = {
      eventId: event.entityId,
      alertType: event.severity,
      message: event.description,
      isResolved: false,
      metadata: event.metadata,
      createdAt: new Date().toISOString(),
    };

    // Log alert (in production, this would go to the database)
    console.log('Security Alert Created:', alertData);

    // Send email notification
    await emailAlerts.sendSecurityAlert(
      event.action,
      event.severity,
      event.description,
      event.metadata
    );
  }

  static async sendCriticalSecurityAlert(event: any): Promise<void> {
    await emailAlerts.sendSecurityAlert(
      event.eventType,
      'critical',
      `CRITICAL: ${event.description}`,
      event.metadata
    );
  }

  static async detectSuspiciousActivity(userId: string, ipAddress: string): Promise<void> {
    // Simple suspicious activity detection
    const recentEvents = await this.getRecentUserEvents(userId, 30); // Last 30 minutes
    
    if (recentEvents.length > 50) { // More than 50 actions in 30 minutes
      await this.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.HIGH,
        `Unusual activity detected: ${recentEvents.length} actions in 30 minutes`,
        userId,
        ipAddress,
        { actionCount: recentEvents.length, timeWindow: 30 }
      );
    }
  }

  static async detectUnusualDataAccess(userId: string, entityType: string, entityId: string): Promise<void> {
    // Check for unusual data access patterns
    const user = await storage.getUser(userId);
    if (!user) return;

    // Example: Check if user is accessing data outside their normal scope
    if (user.role === 'employee' && entityType === 'payroll') {
      await this.recordSecurityEvent(
        SecurityEventType.UNUSUAL_DATA_ACCESS,
        SecuritySeverity.HIGH,
        `Employee attempted to access payroll data`,
        userId,
        'unknown',
        { entityType, entityId, userRole: user.role }
      );
    }
  }

  static async checkForPrivilegeEscalation(userId: string, oldRole: string, newRole: string): Promise<void> {
    const privilegeOrder = ['employee', 'secretary', 'admin', 'hr'];
    const oldIndex = privilegeOrder.indexOf(oldRole);
    const newIndex = privilegeOrder.indexOf(newRole);

    if (newIndex > oldIndex) {
      await this.recordSecurityEvent(
        SecurityEventType.PRIVILEGE_ESCALATION,
        SecuritySeverity.CRITICAL,
        `Privilege escalation detected: ${oldRole} → ${newRole}`,
        userId,
        'unknown',
        { oldRole, newRole, escalationLevel: newIndex - oldIndex }
      );
    }
  }

  static async getSecurityDashboard(days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Mock data for demonstration
    return {
      totalEvents: 1247,
      totalAlerts: 23,
      unresolvedAlerts: 5,
      eventsByType: {
        failed_login: 156,
        suspicious_activity: 42,
        unauthorized_access: 18,
        data_breach_attempt: 3
      },
      eventsBySeverity: {
        low: 890,
        medium: 267,
        high: 78,
        critical: 12
      },
      recentEvents: [
        { id: 1, type: "failed_login", severity: "medium", description: "Multiple failed login attempts", timestamp: new Date().toISOString() },
        { id: 2, type: "suspicious_activity", severity: "high", description: "Unusual data access pattern", timestamp: new Date().toISOString() },
        { id: 3, type: "unauthorized_access", severity: "high", description: "Access attempt from blocked IP", timestamp: new Date().toISOString() }
      ],
      recentAlerts: [
        { id: 1, type: "critical", message: "Critical security event detected", isResolved: false, createdAt: new Date().toISOString() },
        { id: 2, type: "high", message: "Account lockout threshold exceeded", isResolved: true, createdAt: new Date().toISOString() }
      ]
    };
  }

  static async resolveSecurityAlert(alertId: number, resolvedBy: string): Promise<void> {
    console.log(`Security alert ${alertId} resolved by ${resolvedBy}`);
    // In production, this would update the database
  }

  private static async getRecentUserEvents(userId: string, minutes: number): Promise<any[]> {
    // Mock implementation - in production, this would query the audit logs
    return [];
  }
}

export class IntrusionDetection {
  static async analyzeRequest(
    req: any,
    userId: string = 'unknown',
    ipAddress: string = 'unknown'
  ): Promise<void> {
    const userAgent = req.headers['user-agent'] || '';
    const path = req.path;
    const method = req.method;
    const body = req.body;

    // Check for SQL injection
    if (this.detectSQLInjection(JSON.stringify(body))) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.DATA_BREACH_ATTEMPT,
        SecuritySeverity.CRITICAL,
        'SQL injection attempt detected',
        userId,
        ipAddress,
        { method, path, body: body, userAgent }
      );
    }

    // Check for XSS
    if (this.detectXSS(JSON.stringify(body))) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.DATA_BREACH_ATTEMPT,
        SecuritySeverity.HIGH,
        'XSS attempt detected',
        userId,
        ipAddress,
        { method, path, body: body, userAgent }
      );
    }

    // Check for suspicious user agent
    if (this.detectSuspiciousUserAgent(userAgent)) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        'Suspicious user agent detected',
        userId,
        ipAddress,
        { userAgent, method, path }
      );
    }
  }

  private static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/i,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
      /'\s*(OR|AND)\s*'[^']*'/i,
      /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
      /\/\*.*\*\//,
      /--[^\r\n]*/,
      /\bxp_cmdshell\b/i,
      /\bsp_executesql\b/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /onmouseover=/i,
      /onfocus=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /<form[^>]*>/i,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  private static detectSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /perl/i,
      /java/i,
      /php/i,
      /ruby/i,
      /go-http-client/i,
      /postman/i,
      /insomnia/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

export class SecurityAudit {
  static async performSecurityAudit(): Promise<any> {
    const findings = [];
    
    // Check for weak passwords
    const weakPasswords = await this.checkWeakPasswords();
    if (weakPasswords.length > 0) {
      findings.push({
        type: 'weak_passwords',
        severity: 'medium',
        count: weakPasswords.length,
        description: 'Users with weak passwords',
        users: weakPasswords
      });
    }

    // Check for inactive users
    const inactiveUsers = await this.checkInactiveUsers();
    if (inactiveUsers.length > 0) {
      findings.push({
        type: 'inactive_users',
        severity: 'low',
        count: inactiveUsers.length,
        description: 'Inactive users with active sessions',
        users: inactiveUsers
      });
    }

    // Check for unresolved alerts
    const unresolvedAlerts = await this.checkUnresolvedAlerts();
    if (unresolvedAlerts.length > 0) {
      findings.push({
        type: 'unresolved_alerts',
        severity: 'high',
        count: unresolvedAlerts.length,
        description: 'Unresolved security alerts',
        alerts: unresolvedAlerts
      });
    }

    const score = this.calculateSecurityScore(findings);
    const recommendations = [
      'Enforce stronger password policies',
      'Implement automatic session cleanup',
      'Review and resolve pending security alerts',
      'Enable multi-factor authentication',
      'Update security monitoring rules'
    ];

    return {
      timestamp: new Date().toISOString(),
      findings,
      recommendations,
      score
    };
  }

  private static async checkWeakPasswords(): Promise<any[]> {
    // Mock implementation - in production, this would check actual passwords
    return [
      { userId: 'user1', username: 'john.doe', issue: 'Password too short' },
      { userId: 'user2', username: 'jane.smith', issue: 'No special characters' }
    ];
  }

  private static async checkInactiveUsers(): Promise<any[]> {
    // Mock implementation - in production, this would check last login times
    return [
      { userId: 'user3', username: 'inactive.user', lastLogin: '2024-12-01' }
    ];
  }

  private static async checkUnresolvedAlerts(): Promise<any[]> {
    // Mock implementation - in production, this would check actual alerts
    return [
      { id: 1, type: 'critical', message: 'Critical security event detected', createdAt: new Date().toISOString() }
    ];
  }

  private static calculateSecurityScore(findings: any[]): number {
    let score = 100;
    
    findings.forEach(finding => {
      switch (finding.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    return Math.max(0, score);
  }
}