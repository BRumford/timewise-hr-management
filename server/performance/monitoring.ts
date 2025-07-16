import { Request, Response, NextFunction } from 'express';
import { emailAlerts } from '../emailAlerts';
import { cache } from './caching';
import { dbOptimizer } from './dbOptimization';
import { loadBalancer } from './loadBalancer';
import { cdn } from './cdn';
import os from 'os';

interface Metric {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  threshold?: number;
  currentValue?: number;
}

class MonitoringSystem {
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private thresholds = {
    cpuUsage: { warning: 70, critical: 85 },
    memoryUsage: { warning: 80, critical: 90 },
    responseTime: { warning: 1000, critical: 2000 },
    errorRate: { warning: 0.05, critical: 0.1 },
    diskUsage: { warning: 80, critical: 90 },
    dbConnections: { warning: 15, critical: 18 },
  };

  constructor() {
    this.startMetricsCollection();
  }

  // Start collecting system metrics
  private startMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    setInterval(() => {
      this.checkAlerts();
    }, 60000); // Every minute

    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // Every 5 minutes
  }

  // Collect system metrics
  private async collectSystemMetrics() {
    const timestamp = new Date();
    
    // CPU metrics
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    this.addMetric('cpu_usage', cpuUsage, timestamp);

    // Memory metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    this.addMetric('memory_usage', memoryUsage, timestamp);

    // Disk usage (simplified)
    const diskUsage = Math.random() * 30 + 40; // 40-70% simulation
    this.addMetric('disk_usage', diskUsage, timestamp);

    // Database metrics
    const dbHealth = await dbOptimizer.healthCheck();
    this.addMetric('db_healthy', dbHealth.healthy ? 1 : 0, timestamp);

    // Application metrics
    this.addMetric('active_users', this.getActiveUsers(), timestamp);
    this.addMetric('requests_per_minute', this.getRequestsPerMinute(), timestamp);
  }

  // Add metric to collection
  private addMetric(name: string, value: number, timestamp: Date, tags?: Record<string, string>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metrics = this.metrics.get(name)!;
    metrics.push({ timestamp, value, tags });
    
    // Keep only last 24 hours of data
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics.set(name, metrics.filter(m => m.timestamp > oneDayAgo));
  }

  // Request monitoring middleware
  requestMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Track request
      this.addMetric('requests_total', 1, new Date(), {
        method: req.method,
        path: req.path,
        user: req.user?.id || 'anonymous',
      });

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const timestamp = new Date();
        
        // Track response time
        this.addMetric('response_time', responseTime, timestamp, {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString(),
        });

        // Track errors
        if (res.statusCode >= 400) {
          this.addMetric('errors_total', 1, timestamp, {
            method: req.method,
            path: req.path,
            status: res.statusCode.toString(),
          });
        }

        // Track success rate
        this.addMetric('success_rate', res.statusCode < 400 ? 1 : 0, timestamp);
      });

      next();
    };
  }

  // Error monitoring middleware
  errorMonitoring() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
      const timestamp = new Date();
      
      // Track error
      this.addMetric('errors_total', 1, timestamp, {
        error: err.name,
        message: err.message,
        path: req.path,
        user: req.user?.id || 'anonymous',
      });

      // Create alert for critical errors
      if (err.message.includes('database') || err.message.includes('connection')) {
        this.createAlert('critical', `Database error: ${err.message}`, 'database_error');
      }

      next(err);
    };
  }

  // Check for alerts based on thresholds
  private checkAlerts() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check CPU usage
    const cpuMetrics = this.getMetricsSince('cpu_usage', fiveMinutesAgo);
    if (cpuMetrics.length > 0) {
      const avgCpu = cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length;
      this.checkThreshold('cpu_usage', avgCpu, this.thresholds.cpuUsage, 'High CPU usage detected');
    }

    // Check memory usage
    const memoryMetrics = this.getMetricsSince('memory_usage', fiveMinutesAgo);
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      this.checkThreshold('memory_usage', avgMemory, this.thresholds.memoryUsage, 'High memory usage detected');
    }

    // Check response time
    const responseMetrics = this.getMetricsSince('response_time', fiveMinutesAgo);
    if (responseMetrics.length > 0) {
      const avgResponseTime = responseMetrics.reduce((sum, m) => sum + m.value, 0) / responseMetrics.length;
      this.checkThreshold('response_time', avgResponseTime, this.thresholds.responseTime, 'High response time detected');
    }

    // Check error rate
    const errorMetrics = this.getMetricsSince('errors_total', fiveMinutesAgo);
    const successMetrics = this.getMetricsSince('success_rate', fiveMinutesAgo);
    if (errorMetrics.length > 0 && successMetrics.length > 0) {
      const errorRate = errorMetrics.length / (errorMetrics.length + successMetrics.length);
      this.checkThreshold('error_rate', errorRate, this.thresholds.errorRate, 'High error rate detected');
    }
  }

  // Check individual threshold
  private checkThreshold(
    metric: string,
    value: number,
    threshold: { warning: number; critical: number },
    message: string
  ) {
    const alertId = `${metric}_${value > threshold.critical ? 'critical' : 'warning'}`;
    
    if (value > threshold.critical) {
      this.createAlert('critical', `${message}: ${value.toFixed(2)}`, alertId, threshold.critical, value);
    } else if (value > threshold.warning) {
      this.createAlert('warning', `${message}: ${value.toFixed(2)}`, alertId, threshold.warning, value);
    } else {
      // Resolve alert if value is back to normal
      this.resolveAlert(alertId);
    }
  }

  // Create alert
  private createAlert(type: 'warning' | 'critical', message: string, id: string, threshold?: number, currentValue?: number) {
    const existingAlert = this.alerts.get(id);
    
    // Don't create duplicate alerts
    if (existingAlert && !existingAlert.resolved) {
      return;
    }

    const alert: Alert = {
      id,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      threshold,
      currentValue,
    };

    this.alerts.set(id, alert);

    // Send email alert for critical issues
    if (type === 'critical') {
      emailAlerts.sendSystemError(
        new Error(message),
        `Critical system alert: ${message}`
      );
    }

    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // Resolve alert
  private resolveAlert(id: string) {
    const alert = this.alerts.get(id);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.timestamp = new Date();
      console.log(`[RESOLVED] Alert ${id} has been resolved`);
    }
  }

  // Get metrics since a specific time
  private getMetricsSince(name: string, since: Date): Metric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.filter(m => m.timestamp > since);
  }

  // Get active users (simplified)
  private getActiveUsers(): number {
    // In a real implementation, this would query active sessions
    return Math.floor(Math.random() * 50) + 20;
  }

  // Get requests per minute
  private getRequestsPerMinute(): number {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const requestMetrics = this.getMetricsSince('requests_total', oneMinuteAgo);
    return requestMetrics.length;
  }

  // Clean up old metrics
  private cleanupOldMetrics() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > oneDayAgo);
      this.metrics.set(name, filteredMetrics);
    }

    // Clean up old resolved alerts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp < oneHourAgo) {
        this.alerts.delete(id);
      }
    }
  }

  // Get comprehensive system status
  async getSystemStatus() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent metrics
    const recentMetrics = {
      cpuUsage: this.getLatestMetric('cpu_usage'),
      memoryUsage: this.getLatestMetric('memory_usage'),
      diskUsage: this.getLatestMetric('disk_usage'),
      responseTime: this.getAverageMetric('response_time', oneHourAgo),
      errorRate: this.getErrorRate(oneHourAgo),
      activeUsers: this.getLatestMetric('active_users'),
      requestsPerMinute: this.getLatestMetric('requests_per_minute'),
    };

    // Get component health
    const componentHealth = {
      database: await dbOptimizer.healthCheck(),
      loadBalancer: loadBalancer.getHealthStatus(),
      cdn: await cdn.healthCheck(),
      cache: await this.getCacheHealth(),
    };

    // Get active alerts
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      timestamp: now,
      overall: this.calculateOverallHealth(recentMetrics, componentHealth),
      metrics: recentMetrics,
      components: componentHealth,
      alerts: activeAlerts,
      uptime: this.calculateUptime(),
    };
  }

  // Get latest metric value
  private getLatestMetric(name: string): number | null {
    const metrics = this.metrics.get(name) || [];
    return metrics.length > 0 ? metrics[metrics.length - 1].value : null;
  }

  // Get average metric value over time period
  private getAverageMetric(name: string, since: Date): number | null {
    const metrics = this.getMetricsSince(name, since);
    if (metrics.length === 0) return null;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  // Get error rate
  private getErrorRate(since: Date): number {
    const errorMetrics = this.getMetricsSince('errors_total', since);
    const totalMetrics = this.getMetricsSince('requests_total', since);
    
    if (totalMetrics.length === 0) return 0;
    return errorMetrics.length / totalMetrics.length;
  }

  // Get cache health
  private async getCacheHealth() {
    try {
      await cache.get('health_check');
      return { healthy: true, type: 'redis' };
    } catch (error) {
      return { healthy: false, type: 'memory', error: error.message };
    }
  }

  // Calculate overall system health
  private calculateOverallHealth(metrics: any, components: any): 'healthy' | 'degraded' | 'unhealthy' {
    const issues = [];

    // Check metrics
    if (metrics.cpuUsage > 85) issues.push('high_cpu');
    if (metrics.memoryUsage > 90) issues.push('high_memory');
    if (metrics.responseTime > 2000) issues.push('high_response_time');
    if (metrics.errorRate > 0.1) issues.push('high_error_rate');

    // Check components
    if (!components.database.healthy) issues.push('database_down');
    if (components.loadBalancer.status !== 'healthy') issues.push('load_balancer_issues');
    if (components.cdn.status !== 'healthy') issues.push('cdn_issues');

    if (issues.length === 0) return 'healthy';
    if (issues.length <= 2) return 'degraded';
    return 'unhealthy';
  }

  // Calculate uptime
  private calculateUptime(): string {
    // Simplified uptime calculation
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }

  // Get performance analytics
  getPerformanceAnalytics(timeRange: 'hour' | 'day' | 'week' = 'day') {
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - ranges[timeRange]);
    
    return {
      requestVolume: this.getMetricsSince('requests_total', since).length,
      averageResponseTime: this.getAverageMetric('response_time', since),
      errorRate: this.getErrorRate(since),
      peakCpuUsage: this.getPeakMetric('cpu_usage', since),
      peakMemoryUsage: this.getPeakMetric('memory_usage', since),
      uptimePercentage: this.calculateUptimePercentage(since),
    };
  }

  // Get peak metric value
  private getPeakMetric(name: string, since: Date): number | null {
    const metrics = this.getMetricsSince(name, since);
    if (metrics.length === 0) return null;
    return Math.max(...metrics.map(m => m.value));
  }

  // Calculate uptime percentage
  private calculateUptimePercentage(since: Date): number {
    // Simplified uptime calculation
    return 99.9; // 99.9% uptime
  }
}

export const monitoring = new MonitoringSystem();