import { Router } from 'express';
import { monitoring } from './monitoring';
import { dbOptimizer } from './dbOptimization';
import { cache } from './caching';
import { loadBalancer } from './loadBalancer';
import { cdn } from './cdn';
import { autoScaling } from './autoScaling';

const router = Router();

// System status endpoint
router.get('/status', async (req, res) => {
  try {
    const systemStatus = await monitoring.getSystemStatus();
    res.json(systemStatus);
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const metrics = monitoring.getPerformanceAnalytics(timeRange);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Database health endpoints
router.get('/database/health', async (req, res) => {
  try {
    const health = await dbOptimizer.getDatabaseHealth();
    res.json(health);
  } catch (error) {
    console.error('Error getting database health:', error);
    res.status(500).json({ error: 'Failed to get database health' });
  }
});

router.post('/database/maintenance', async (req, res) => {
  try {
    await dbOptimizer.performMaintenance();
    res.json({ success: true, message: 'Database maintenance completed' });
  } catch (error) {
    console.error('Error performing database maintenance:', error);
    res.status(500).json({ error: 'Failed to perform database maintenance' });
  }
});

router.post('/database/optimize', async (req, res) => {
  try {
    const result = await dbOptimizer.optimizeQueries();
    res.json(result);
  } catch (error) {
    console.error('Error optimizing database queries:', error);
    res.status(500).json({ error: 'Failed to optimize database queries' });
  }
});

// Cache management endpoints
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cache.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

router.post('/cache/flush', async (req, res) => {
  try {
    await cache.flushAll();
    res.json({ success: true, message: 'Cache flushed successfully' });
  } catch (error) {
    console.error('Error flushing cache:', error);
    res.status(500).json({ error: 'Failed to flush cache' });
  }
});

router.delete('/cache/key/:key', async (req, res) => {
  try {
    await cache.delete(req.params.key);
    res.json({ success: true, message: 'Cache key deleted' });
  } catch (error) {
    console.error('Error deleting cache key:', error);
    res.status(500).json({ error: 'Failed to delete cache key' });
  }
});

// Load balancer endpoints
router.get('/loadbalancer/status', async (req, res) => {
  try {
    const status = loadBalancer.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting load balancer status:', error);
    res.status(500).json({ error: 'Failed to get load balancer status' });
  }
});

router.get('/loadbalancer/metrics', async (req, res) => {
  try {
    const metrics = loadBalancer.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting load balancer metrics:', error);
    res.status(500).json({ error: 'Failed to get load balancer metrics' });
  }
});

router.post('/loadbalancer/rebalance', async (req, res) => {
  try {
    await loadBalancer.rebalance();
    res.json({ success: true, message: 'Load balancer rebalanced' });
  } catch (error) {
    console.error('Error rebalancing load balancer:', error);
    res.status(500).json({ error: 'Failed to rebalance load balancer' });
  }
});

// CDN endpoints
router.get('/cdn/analytics', async (req, res) => {
  try {
    const analytics = await cdn.getAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error getting CDN analytics:', error);
    res.status(500).json({ error: 'Failed to get CDN analytics' });
  }
});

router.post('/cdn/purge', async (req, res) => {
  try {
    const { paths } = req.body;
    await cdn.purgeCache(paths);
    res.json({ success: true, message: 'CDN cache purged' });
  } catch (error) {
    console.error('Error purging CDN cache:', error);
    res.status(500).json({ error: 'Failed to purge CDN cache' });
  }
});

router.post('/cdn/preload', async (req, res) => {
  try {
    const { resources } = req.body;
    await cdn.preloadResources(resources);
    res.json({ success: true, message: 'Resources preloaded' });
  } catch (error) {
    console.error('Error preloading resources:', error);
    res.status(500).json({ error: 'Failed to preload resources' });
  }
});

// Auto-scaling endpoints
router.get('/autoscaling/status', async (req, res) => {
  try {
    const status = autoScaling.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting auto-scaling status:', error);
    res.status(500).json({ error: 'Failed to get auto-scaling status' });
  }
});

router.get('/autoscaling/metrics', async (req, res) => {
  try {
    const metrics = autoScaling.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting auto-scaling metrics:', error);
    res.status(500).json({ error: 'Failed to get auto-scaling metrics' });
  }
});

router.post('/autoscaling/scale', async (req, res) => {
  try {
    const { targetInstances, reason } = req.body;
    const result = await autoScaling.manualScale(targetInstances, reason);
    res.json({ success: result, message: result ? 'Scaling completed' : 'Scaling failed' });
  } catch (error) {
    console.error('Error scaling instances:', error);
    res.status(500).json({ error: 'Failed to scale instances' });
  }
});

router.post('/autoscaling/emergency', async (req, res) => {
  try {
    const { reason } = req.body;
    await autoScaling.emergencyScale(reason);
    res.json({ success: true, message: 'Emergency scaling completed' });
  } catch (error) {
    console.error('Error performing emergency scaling:', error);
    res.status(500).json({ error: 'Failed to perform emergency scaling' });
  }
});

router.get('/autoscaling/recommendations', async (req, res) => {
  try {
    const recommendations = autoScaling.getScalingRecommendations();
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting scaling recommendations:', error);
    res.status(500).json({ error: 'Failed to get scaling recommendations' });
  }
});

router.put('/autoscaling/enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    autoScaling.setEnabled(enabled);
    res.json({ success: true, message: `Auto-scaling ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Error updating auto-scaling status:', error);
    res.status(500).json({ error: 'Failed to update auto-scaling status' });
  }
});

// Additional monitoring endpoints
router.get('/alerts', async (req, res) => {
  try {
    const systemStatus = await monitoring.getSystemStatus();
    res.json(systemStatus.alerts || []);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    // In a real implementation, this would resolve the alert
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Performance reports
router.get('/reports/health', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      systemStatus: await monitoring.getSystemStatus(),
      metrics: monitoring.getPerformanceAnalytics(timeRange),
      databaseHealth: await dbOptimizer.getDatabaseHealth(),
      cacheStats: await cache.getCacheStats(),
      cdnAnalytics: await cdn.getAnalytics(),
      autoScalingStatus: autoScaling.getStatus(),
    };
    res.json(report);
  } catch (error) {
    console.error('Error generating health report:', error);
    res.status(500).json({ error: 'Failed to generate health report' });
  }
});

router.get('/reports/performance', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' || 'day';
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      performanceMetrics: monitoring.getPerformanceAnalytics(timeRange),
      recommendations: autoScaling.getScalingRecommendations(),
      optimizations: await dbOptimizer.getOptimizationRecommendations(),
    };
    res.json(report);
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

router.get('/reports/scaling', async (req, res) => {
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      currentStatus: autoScaling.getStatus(),
      metrics: autoScaling.getMetrics(),
      recommendations: autoScaling.getScalingRecommendations(),
      history: autoScaling.getMetrics().scalingHistory || [],
    };
    res.json(report);
  } catch (error) {
    console.error('Error generating scaling report:', error);
    res.status(500).json({ error: 'Failed to generate scaling report' });
  }
});

export default router;