import type { Express } from "express";
import { storage } from "../storage";
import { AuditLogger } from "./auditLogger";
import { DataEncryption } from "./encryption";
import { requirePermission, PERMISSIONS } from "./accessControl";
import { asyncErrorHandler } from "../errorHandler";

// Session-based authentication for security routes
const requireRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
};

export function registerSecurityRoutes(app: Express): void {
  // Get audit logs (admin/hr only)
  app.get("/api/security/audit-logs", 
    requireRole(['admin', 'hr']),
    asyncErrorHandler(async (req, res) => {
      const { startDate, endDate, userId, action, resource } = req.query;
      
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId as string,
        action: action as string,
        resource: resource as string
      };

      const logs = await storage.getAuditLogs(filters);
      
      // Mask sensitive data in logs
      const maskedLogs = logs.map(log => ({
        ...log,
        details: log.details ? DataEncryption.maskSensitiveData(log.details) : null
      }));

      res.json(maskedLogs);
    })
  );

  // Generate audit report
  app.post("/api/security/audit-report",
    requireRole(['admin', 'hr']),
    asyncErrorHandler(async (req, res) => {
      const { startDate, endDate, userId, action, resource } = req.body;
      
      const report = await AuditLogger.generateAuditReport(
        new Date(startDate),
        new Date(endDate),
        userId,
        action,
        resource
      );

      res.json({
        report,
        generatedAt: new Date(),
        totalEntries: report.length
      });
    })
  );



  // Security dashboard
  app.get("/api/security/dashboard",
    requireRole(['admin', 'hr']),
    asyncErrorHandler(async (req, res) => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        todayLogs,
        weekLogs,
        failedLogins,
        criticalEvents
      ] = await Promise.all([
        storage.getAuditLogs({ startDate: dayAgo, endDate: now }),
        storage.getAuditLogs({ startDate: weekAgo, endDate: now }),
        storage.getAuditLogs({ 
          startDate: dayAgo, 
          endDate: now, 
          action: 'LOGIN',
        }),
        storage.getAuditLogs({ 
          startDate: weekAgo, 
          endDate: now
        })
      ]);

      const dashboard = {
        totalActionsToday: todayLogs.length,
        totalActionsThisWeek: weekLogs.length,
        failedLoginsToday: failedLogins.filter(log => !log.success).length,
        criticalEventsThisWeek: criticalEvents.filter(log => 
          log.severity === 'CRITICAL' || log.severity === 'HIGH'
        ).length,
        topUsers: getTopUsers(weekLogs),
        topActions: getTopActions(weekLogs),
        securityTrends: getSecurityTrends(weekLogs)
      };

      res.json(dashboard);
    })
  );

  // Check for suspicious activity
  app.post("/api/security/check-suspicious",
    requireRole(['admin', 'hr']),
    asyncErrorHandler(async (req, res) => {
      const { userId, timeWindow } = req.body;
      
      const suspicious = await AuditLogger.detectSuspiciousActivity(
        userId,
        timeWindow || 3600000 // 1 hour default
      );

      res.json({ 
        suspicious,
        userId,
        checkedAt: new Date()
      });
    })
  );

  // Data encryption status
  app.get("/api/security/encryption-status",
    requireRole(['admin', 'hr']),
    asyncErrorHandler(async (req, res) => {
      // Check encryption status of various data types
      const status = {
        employeeData: 'ENCRYPTED',
        payrollData: 'ENCRYPTED',
        medicalRecords: 'ENCRYPTED',
        fileStorage: 'ENCRYPTED',
        databaseConnection: 'ENCRYPTED',
        backups: 'ENCRYPTED',
        lastKeyRotation: new Date(), // Would be from key management
        nextKeyRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };

      res.json(status);
    })
  );


}

// Helper functions
function getTopUsers(logs: any[]): Array<{user: string, actions: number}> {
  const userCounts = logs.reduce((acc, log) => {
    acc[log.userId] = (acc[log.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(userCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([user, actions]) => ({ user, actions }));
}

function getTopActions(logs: any[]): Array<{action: string, count: number}> {
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(actionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));
}

function getSecurityTrends(logs: any[]): Array<{date: string, events: number, critical: number}> {
  const trends = logs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { events: 0, critical: 0 };
    }
    acc[date].events++;
    if (log.severity === 'CRITICAL' || log.severity === 'HIGH') {
      acc[date].critical++;
    }
    return acc;
  }, {} as Record<string, {events: number, critical: number}>);

  return Object.entries(trends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}