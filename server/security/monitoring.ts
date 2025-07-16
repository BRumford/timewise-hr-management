import { db } from "../db";
import { securityEvents, securityAlerts, auditLogs } from "@shared/schema";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { emailAlerts } from "../emailAlerts";

// Security Event Types
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

// Security Monitoring Service
export class SecurityMonitor {
  static async recordSecurityEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    description: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any
  ): Promise<void> {
    const event = await db.insert(securityEvents).values({
      eventType,
      severity,
      description,
      userId,
      ipAddress,
      userAgent,
      metadata: metadata ? JSON.stringify(metadata) : null,
      timestamp: new Date()
    }).returning();

    // Auto-create alert for high/critical events
    if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
      await this.createSecurityAlert(event[0]);
    }

    // Send email notification for critical events
    if (severity === SecuritySeverity.CRITICAL) {
      await this.sendCriticalSecurityAlert(event[0]);
    }
  }

  static async createSecurityAlert(event: any): Promise<void> {
    await db.insert(securityAlerts).values({
      securityEventId: event.id,
      alertType: event.eventType,
      severity: event.severity,
      message: event.description,
      isResolved: false,
      createdAt: new Date()
    });
  }

  static async sendCriticalSecurityAlert(event: any): Promise<void> {
    try {
      await emailAlerts.sendSystemError(
        new Error(`Critical Security Event: ${event.description}`),
        `Security Event ID: ${event.id}, Type: ${event.eventType}, IP: ${event.ipAddress}`
      );
    } catch (error) {
      console.error('Failed to send critical security alert:', error);
    }
  }

  static async detectSuspiciousActivity(userId: string, ipAddress: string): Promise<void> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Check for multiple failed logins
    const failedLogins = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.action, 'failed_login'),
          gte(auditLogs.timestamp, last24Hours)
        )
      );

    if (failedLogins[0]?.count > 10) {
      await this.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.HIGH,
        `Multiple failed login attempts detected for user ${userId}`,
        userId,
        ipAddress,
        undefined,
        { failedAttempts: failedLogins[0].count }
      );
    }

    // Check for access from multiple IP addresses
    const recentIPs = await db
      .select({ ipAddress: auditLogs.ipAddress })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          gte(auditLogs.timestamp, last24Hours)
        )
      )
      .groupBy(auditLogs.ipAddress);

    if (recentIPs.length > 3) {
      await this.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        `User ${userId} accessed from multiple IP addresses`,
        userId,
        ipAddress,
        undefined,
        { ipAddresses: recentIPs.map(ip => ip.ipAddress) }
      );
    }
  }

  static async detectUnusualDataAccess(userId: string, entityType: string, entityId: string): Promise<void> {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Check for unusual data access patterns
    const accessCount = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId),
          gte(auditLogs.timestamp, last7Days)
        )
      );

    // If user has accessed this record more than 20 times in a week, flag it
    if (accessCount[0]?.count > 20) {
      await this.recordSecurityEvent(
        SecurityEventType.UNUSUAL_DATA_ACCESS,
        SecuritySeverity.MEDIUM,
        `Unusual data access pattern detected for user ${userId}`,
        userId,
        undefined,
        undefined,
        { entityType, entityId, accessCount: accessCount[0].count }
      );
    }
  }

  static async checkForPrivilegeEscalation(userId: string, oldRole: string, newRole: string): Promise<void> {
    const roleHierarchy = {
      'employee': 1,
      'secretary': 2,
      'hr': 3,
      'admin': 4
    };

    const oldLevel = roleHierarchy[oldRole as keyof typeof roleHierarchy] || 0;
    const newLevel = roleHierarchy[newRole as keyof typeof roleHierarchy] || 0;

    if (newLevel > oldLevel) {
      await this.recordSecurityEvent(
        SecurityEventType.PRIVILEGE_ESCALATION,
        SecuritySeverity.HIGH,
        `User ${userId} role changed from ${oldRole} to ${newRole}`,
        userId,
        undefined,
        undefined,
        { oldRole, newRole, escalation: true }
      );
    }
  }

  static async getSecurityDashboard(days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const events = await db
      .select()
      .from(securityEvents)
      .where(gte(securityEvents.timestamp, startDate))
      .orderBy(desc(securityEvents.timestamp));

    const alerts = await db
      .select()
      .from(securityAlerts)
      .where(gte(securityAlerts.createdAt, startDate))
      .orderBy(desc(securityAlerts.createdAt));

    const eventsByType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: events.length,
      totalAlerts: alerts.length,
      unresolvedAlerts: alerts.filter(a => !a.isResolved).length,
      eventsByType,
      eventsBySeverity,
      recentEvents: events.slice(0, 10),
      recentAlerts: alerts.slice(0, 10)
    };
  }

  static async resolveSecurityAlert(alertId: number, resolvedBy: string): Promise<void> {
    await db
      .update(securityAlerts)
      .set({
        isResolved: true,
        resolvedBy,
        resolvedAt: new Date()
      })
      .where(eq(securityAlerts.id, alertId));

    await db.insert(auditLogs).values({
      userId: resolvedBy,
      action: "resolve_security_alert",
      entityType: "security_alert",
      entityId: alertId.toString(),
      description: `Security alert ${alertId} resolved`,
      ipAddress: "",
      userAgent: "",
      severity: "medium"
    });
  }
}

// Intrusion Detection System
export class IntrusionDetection {
  static async analyzeRequest(
    userId: string,
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string
  ): Promise<boolean> {
    // Check for SQL injection patterns
    if (this.detectSQLInjection(endpoint)) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.DATA_BREACH_ATTEMPT,
        SecuritySeverity.CRITICAL,
        `SQL injection attempt detected from ${ipAddress}`,
        userId,
        ipAddress,
        userAgent,
        { endpoint, method }
      );
      return false;
    }

    // Check for XSS attempts
    if (this.detectXSS(endpoint)) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.DATA_BREACH_ATTEMPT,
        SecuritySeverity.HIGH,
        `XSS attempt detected from ${ipAddress}`,
        userId,
        ipAddress,
        userAgent,
        { endpoint, method }
      );
      return false;
    }

    // Check for suspicious user agents
    if (this.detectSuspiciousUserAgent(userAgent)) {
      await SecurityMonitor.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        `Suspicious user agent detected: ${userAgent}`,
        userId,
        ipAddress,
        userAgent,
        { endpoint, method }
      );
    }

    return true;
  }

  private static detectSQLInjection(input: string): boolean {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\'|\";|--|\/\*|\*\/)/,
      /(\bOR\b.*=.*=|\bAND\b.*=.*=)/i
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  private static detectXSS(input: string): boolean {
    const patterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  private static detectSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|perl/i,
      /nmap|sqlmap|nikto/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

// Security Audit Service
export class SecurityAudit {
  static async performSecurityAudit(): Promise<any> {
    const auditResults = {
      timestamp: new Date(),
      findings: [] as any[],
      recommendations: [] as string[],
      score: 0
    };

    // Check for weak passwords
    const weakPasswords = await this.checkWeakPasswords();
    if (weakPasswords.length > 0) {
      auditResults.findings.push({
        type: 'weak_passwords',
        severity: 'medium',
        count: weakPasswords.length,
        description: 'Users with weak passwords detected'
      });
      auditResults.recommendations.push('Enforce stronger password policies');
    }

    // Check for inactive users with active sessions
    const inactiveUsers = await this.checkInactiveUsers();
    if (inactiveUsers.length > 0) {
      auditResults.findings.push({
        type: 'inactive_users',
        severity: 'low',
        count: inactiveUsers.length,
        description: 'Inactive users with active sessions'
      });
      auditResults.recommendations.push('Implement automatic session cleanup');
    }

    // Check for unresolved security alerts
    const unresolvedAlerts = await this.checkUnresolvedAlerts();
    if (unresolvedAlerts.length > 0) {
      auditResults.findings.push({
        type: 'unresolved_alerts',
        severity: 'high',
        count: unresolvedAlerts.length,
        description: 'Unresolved security alerts'
      });
      auditResults.recommendations.push('Review and resolve pending security alerts');
    }

    // Calculate security score
    auditResults.score = this.calculateSecurityScore(auditResults.findings);

    return auditResults;
  }

  private static async checkWeakPasswords(): Promise<any[]> {
    // This would check for users who haven't changed passwords in a long time
    // or have passwords that don't meet current policy
    return [];
  }

  private static async checkInactiveUsers(): Promise<any[]> {
    // Check for users who haven't logged in for 90+ days but have active sessions
    return [];
  }

  private static async checkUnresolvedAlerts(): Promise<any[]> {
    return await db
      .select()
      .from(securityAlerts)
      .where(eq(securityAlerts.isResolved, false));
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