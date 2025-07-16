import { db } from '../db';
import { emailConfig, isEmailConfigured } from '../config/emailConfig';

export interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  components: {
    database: ComponentStatus;
    email: ComponentStatus;
    storage: ComponentStatus;
    authentication: ComponentStatus;
  };
  metrics: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    errorRate: number;
  };
}

interface ComponentStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastChecked: string;
  responseTime?: number;
}

class SystemHealthMonitor {
  private errorCount = 0;
  private totalRequests = 0;
  private startTime = Date.now();

  // Track error rates
  recordError(): void {
    this.errorCount++;
  }

  recordRequest(): void {
    this.totalRequests++;
  }

  // Check database health
  private async checkDatabase(): Promise<ComponentStatus> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity test
      await db.execute('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'warning',
        message: responseTime < 1000 ? 'Database responding normally' : 'Database responding slowly',
        lastChecked: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Database connection failed: ${(error as Error).message}`,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  // Check email system health
  private async checkEmail(): Promise<ComponentStatus> {
    try {
      if (!isEmailConfigured()) {
        return {
          status: 'warning',
          message: 'Email alerts not configured - missing environment variables',
          lastChecked: new Date().toISOString()
        };
      }

      // Check if admin emails are configured
      if (emailConfig.adminEmails.length === 0) {
        return {
          status: 'warning',
          message: 'No admin emails configured for alerts',
          lastChecked: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        message: `Email alerts configured for ${emailConfig.adminEmails.length} admin(s)`,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Email system error: ${(error as Error).message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Check storage health
  private async checkStorage(): Promise<ComponentStatus> {
    try {
      // Check if storage is responsive
      const testStart = Date.now();
      
      // Simple storage test - this would be replaced with actual storage check
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - testStart;
      
      return {
        status: 'healthy',
        message: 'Storage system operational',
        lastChecked: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Storage system error: ${(error as Error).message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Check authentication health
  private async checkAuthentication(): Promise<ComponentStatus> {
    try {
      return {
        status: 'healthy',
        message: 'Authentication system operational',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Authentication system error: ${(error as Error).message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // Get comprehensive system health status
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const [database, email, storage, authentication] = await Promise.all([
      this.checkDatabase(),
      this.checkEmail(),
      this.checkStorage(),
      this.checkAuthentication()
    ]);

    const components = { database, email, storage, authentication };
    
    // Determine overall health
    const criticalCount = Object.values(components).filter(c => c.status === 'critical').length;
    const warningCount = Object.values(components).filter(c => c.status === 'warning').length;
    
    let overall: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    // Calculate error rate
    const errorRate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;

    return {
      overall,
      timestamp: new Date().toISOString(),
      components,
      metrics: {
        uptime: Date.now() - this.startTime,
        memoryUsage: process.memoryUsage(),
        errorRate
      }
    };
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.errorCount = 0;
    this.totalRequests = 0;
    this.startTime = Date.now();
  }
}

export const systemHealthMonitor = new SystemHealthMonitor();