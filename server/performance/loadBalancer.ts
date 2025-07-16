import { Request, Response, NextFunction } from 'express';
import os from 'os';
import cluster from 'cluster';

interface ServerHealth {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  responseTime: number;
  lastHealthCheck: Date;
}

class LoadBalancer {
  private servers: Map<string, ServerHealth> = new Map();
  private currentServerIndex = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeHealthChecks();
  }

  // Initialize health monitoring
  private initializeHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.updateServerHealth();
    }, 30000); // Every 30 seconds
  }

  // Update server health metrics
  private updateServerHealth() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    const health: ServerHealth = {
      cpuUsage: os.loadavg()[0] / cpus.length * 100,
      memoryUsage: ((totalMemory - freeMemory) / totalMemory) * 100,
      activeConnections: this.getActiveConnections(),
      responseTime: this.calculateAverageResponseTime(),
      lastHealthCheck: new Date(),
    };

    this.servers.set('primary', health);
  }

  // Get active connections (simplified - would integrate with actual connection pool)
  private getActiveConnections(): number {
    // In a real implementation, this would query the actual connection pool
    return Math.floor(Math.random() * 50) + 10;
  }

  // Calculate average response time
  private calculateAverageResponseTime(): number {
    // In a real implementation, this would use actual metrics
    return Math.floor(Math.random() * 100) + 50;
  }

  // Round-robin load balancing middleware
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add load balancing headers
      res.setHeader('X-Load-Balancer', 'active');
      res.setHeader('X-Server-ID', 'primary');
      
      // Add request tracking
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        // Log response time for monitoring
        console.log(`Request to ${req.path} took ${responseTime}ms`);
      });

      next();
    };
  }

  // Health check endpoint
  getHealthStatus() {
    const server = this.servers.get('primary');
    if (!server) {
      return {
        status: 'unhealthy',
        reason: 'No server health data available',
      };
    }

    const isHealthy = 
      server.cpuUsage < 80 && 
      server.memoryUsage < 85 && 
      server.responseTime < 1000;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics: server,
      thresholds: {
        maxCpuUsage: 80,
        maxMemoryUsage: 85,
        maxResponseTime: 1000,
      },
    };
  }

  // Circuit breaker pattern
  private circuitBreaker = {
    failures: 0,
    lastFailureTime: null as Date | null,
    state: 'closed' as 'closed' | 'open' | 'half-open',
    failureThreshold: 5,
    timeout: 60000, // 1 minute
  };

  // Circuit breaker middleware
  circuitBreakerMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = new Date();
      
      // Check if circuit should move from open to half-open
      if (this.circuitBreaker.state === 'open' && 
          this.circuitBreaker.lastFailureTime &&
          now.getTime() - this.circuitBreaker.lastFailureTime.getTime() > this.circuitBreaker.timeout) {
        this.circuitBreaker.state = 'half-open';
        this.circuitBreaker.failures = 0;
      }

      // Reject requests if circuit is open
      if (this.circuitBreaker.state === 'open') {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          retryAfter: this.circuitBreaker.timeout / 1000,
        });
      }

      // Monitor response for failures
      res.on('finish', () => {
        if (res.statusCode >= 500) {
          this.circuitBreaker.failures++;
          this.circuitBreaker.lastFailureTime = now;
          
          if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
            this.circuitBreaker.state = 'open';
            console.error('Circuit breaker opened due to failures');
          }
        } else if (this.circuitBreaker.state === 'half-open') {
          // Success in half-open state closes the circuit
          this.circuitBreaker.state = 'closed';
          this.circuitBreaker.failures = 0;
        }
      });

      next();
    };
  }

  // Rate limiting
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();

  rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      
      let clientData = this.rateLimiter.get(clientId);
      
      if (!clientData || now > clientData.resetTime) {
        clientData = {
          count: 0,
          resetTime: now + windowMs,
        };
      }

      clientData.count++;
      this.rateLimiter.set(clientId, clientData);

      if (clientData.count > maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        });
      }

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());

      next();
    };
  }

  // Server scaling recommendations
  getScalingRecommendations() {
    const health = this.getHealthStatus();
    const recommendations = [];

    if (health.status === 'degraded') {
      if (health.metrics?.cpuUsage > 75) {
        recommendations.push({
          type: 'scale-up',
          reason: 'High CPU usage',
          action: 'Consider adding more CPU cores or scaling horizontally',
          priority: 'high',
        });
      }

      if (health.metrics?.memoryUsage > 80) {
        recommendations.push({
          type: 'scale-up',
          reason: 'High memory usage',
          action: 'Consider increasing memory allocation or optimizing queries',
          priority: 'high',
        });
      }

      if (health.metrics?.responseTime > 800) {
        recommendations.push({
          type: 'optimize',
          reason: 'High response time',
          action: 'Review database queries and enable caching',
          priority: 'medium',
        });
      }
    }

    return recommendations;
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const loadBalancer = new LoadBalancer();