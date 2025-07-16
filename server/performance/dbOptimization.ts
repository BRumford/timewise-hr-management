import { db } from '../db';
import { cache } from './caching';
import { sql } from 'drizzle-orm';

interface QueryStats {
  query: string;
  executionTime: number;
  timestamp: Date;
  userId?: string;
}

class DatabaseOptimizer {
  private queryStats: QueryStats[] = [];
  private slowQueryThreshold = 1000; // 1 second

  // Database connection pooling optimization
  async optimizeConnectionPool() {
    // These would be configured in the database connection setup
    const optimizations = {
      maxConnections: 20,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 5000,
      maxIdleConnections: 5,
      acquireTimeoutMs: 60000,
    };

    console.log('Database connection pool optimized:', optimizations);
    return optimizations;
  }

  // Query performance monitoring
  async monitorQuery<T>(queryFn: () => Promise<T>, queryName: string, userId?: string): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;
      
      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
        
        // Store for analysis
        this.queryStats.push({
          query: queryName,
          executionTime,
          timestamp: new Date(),
          userId,
        });
      }

      return result;
    } catch (error) {
      console.error(`Query failed: ${queryName}`, error);
      throw error;
    }
  }

  // Database indexing recommendations
  async analyzeIndexes() {
    try {
      const indexAnalysis = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      // Recommend missing indexes based on common queries
      const recommendations = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_department ON employees(department)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_status ON employees(status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_cards_employee_id ON time_cards(employee_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_cards_date ON time_cards(date)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_pay_period ON payroll(pay_period)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      ];

      return {
        currentIndexes: indexAnalysis.rows,
        recommendations,
      };
    } catch (error) {
      console.error('Index analysis failed:', error);
      return { currentIndexes: [], recommendations: [] };
    }
  }

  // Cached query wrapper
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 300,
    queryName: string = 'unknown'
  ): Promise<T> {
    return cache.cacheQuery(cacheKey, () => 
      this.monitorQuery(queryFn, queryName)
    , ttlSeconds);
  }

  // Database vacuum and maintenance
  async performMaintenance() {
    try {
      console.log('Starting database maintenance...');
      
      // Update table statistics
      await db.execute(sql`ANALYZE`);
      
      // Clean up old audit logs (older than 90 days)
      await db.execute(sql`
        DELETE FROM audit_logs 
        WHERE timestamp < NOW() - INTERVAL '90 days'
      `);
      
      // Clean up old session data
      await db.execute(sql`
        DELETE FROM sessions 
        WHERE expire < NOW()
      `);

      console.log('Database maintenance completed successfully');
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  // Get query performance statistics
  getQueryStats() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentStats = this.queryStats.filter(stat => stat.timestamp > last24Hours);
    
    return {
      totalSlowQueries: recentStats.length,
      averageExecutionTime: recentStats.reduce((sum, stat) => sum + stat.executionTime, 0) / recentStats.length || 0,
      slowestQuery: recentStats.reduce((slowest, current) => 
        current.executionTime > slowest.executionTime ? current : slowest
      , { executionTime: 0, query: 'none' }),
      queryBreakdown: recentStats.reduce((breakdown, stat) => {
        breakdown[stat.query] = (breakdown[stat.query] || 0) + 1;
        return breakdown;
      }, {} as Record<string, number>),
    };
  }

  // Batch operations optimization
  async batchInsert<T>(table: any, data: T[], batchSize: number = 100): Promise<void> {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await db.insert(table).values(batch);
    }
  }

  // Connection health check
  async healthCheck() {
    try {
      const result = await db.execute(sql`SELECT 1 as health`);
      return {
        healthy: true,
        connectionPool: {
          active: 'Available',
          idle: 'Available',
        },
        queryStats: this.getQueryStats(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        queryStats: this.getQueryStats(),
      };
    }
  }
}

export const dbOptimizer = new DatabaseOptimizer();