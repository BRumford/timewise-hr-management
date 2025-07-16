import { monitoring } from './monitoring';
import { dbOptimizer } from './dbOptimization';
import { loadBalancer } from './loadBalancer';
import { emailAlerts } from '../emailAlerts';
import cluster from 'cluster';
import os from 'os';

interface ScalingRule {
  metric: string;
  threshold: number;
  action: 'scale_up' | 'scale_down';
  cooldown: number; // seconds
  minInstances: number;
  maxInstances: number;
}

interface ScalingAction {
  id: string;
  type: 'scale_up' | 'scale_down';
  reason: string;
  timestamp: Date;
  instancesBefore: number;
  instancesAfter: number;
  success: boolean;
}

class AutoScalingSystem {
  private isEnabled = process.env.AUTO_SCALING_ENABLED === 'true';
  private currentInstances = 1;
  private lastScalingAction: Date | null = null;
  private scalingHistory: ScalingAction[] = [];
  
  private scalingRules: ScalingRule[] = [
    {
      metric: 'cpu_usage',
      threshold: 75,
      action: 'scale_up',
      cooldown: 300, // 5 minutes
      minInstances: 1,
      maxInstances: 10,
    },
    {
      metric: 'cpu_usage',
      threshold: 30,
      action: 'scale_down',
      cooldown: 600, // 10 minutes
      minInstances: 1,
      maxInstances: 10,
    },
    {
      metric: 'memory_usage',
      threshold: 80,
      action: 'scale_up',
      cooldown: 300,
      minInstances: 1,
      maxInstances: 10,
    },
    {
      metric: 'response_time',
      threshold: 1000,
      action: 'scale_up',
      cooldown: 180, // 3 minutes
      minInstances: 1,
      maxInstances: 10,
    },
    {
      metric: 'error_rate',
      threshold: 0.05,
      action: 'scale_up',
      cooldown: 120, // 2 minutes
      minInstances: 1,
      maxInstances: 10,
    },
  ];

  constructor() {
    if (this.isEnabled) {
      this.startAutoScaling();
    }
  }

  // Start auto-scaling monitoring
  private startAutoScaling() {
    console.log('Auto-scaling system initialized');
    
    // Check scaling rules every 30 seconds
    setInterval(() => {
      this.evaluateScalingRules();
    }, 30000);

    // Clean up old scaling history every hour
    setInterval(() => {
      this.cleanupHistory();
    }, 3600000);
  }

  // Evaluate scaling rules
  private async evaluateScalingRules() {
    if (!this.isEnabled) return;

    try {
      const systemStatus = await monitoring.getSystemStatus();
      
      for (const rule of this.scalingRules) {
        await this.evaluateRule(rule, systemStatus);
      }
    } catch (error) {
      console.error('Error evaluating scaling rules:', error);
    }
  }

  // Evaluate individual scaling rule
  private async evaluateRule(rule: ScalingRule, systemStatus: any) {
    const metricValue = this.getMetricValue(rule.metric, systemStatus);
    if (metricValue === null) return;

    const shouldScale = rule.action === 'scale_up' 
      ? metricValue > rule.threshold 
      : metricValue < rule.threshold;

    if (!shouldScale) return;

    // Check cooldown period
    if (this.lastScalingAction) {
      const timeSinceLastAction = (Date.now() - this.lastScalingAction.getTime()) / 1000;
      if (timeSinceLastAction < rule.cooldown) {
        return;
      }
    }

    // Check instance limits
    const targetInstances = rule.action === 'scale_up' 
      ? this.currentInstances + 1 
      : this.currentInstances - 1;

    if (targetInstances < rule.minInstances || targetInstances > rule.maxInstances) {
      return;
    }

    // Execute scaling action
    await this.executeScalingAction(rule, targetInstances, metricValue);
  }

  // Get metric value from system status
  private getMetricValue(metric: string, systemStatus: any): number | null {
    switch (metric) {
      case 'cpu_usage':
        return systemStatus.metrics.cpuUsage;
      case 'memory_usage':
        return systemStatus.metrics.memoryUsage;
      case 'response_time':
        return systemStatus.metrics.responseTime;
      case 'error_rate':
        return systemStatus.metrics.errorRate;
      default:
        return null;
    }
  }

  // Execute scaling action
  private async executeScalingAction(rule: ScalingRule, targetInstances: number, metricValue: number) {
    const actionId = `${rule.action}_${Date.now()}`;
    const instancesBefore = this.currentInstances;
    
    console.log(`Executing ${rule.action}: ${rule.metric} = ${metricValue}, threshold = ${rule.threshold}`);

    try {
      if (rule.action === 'scale_up') {
        await this.scaleUp(targetInstances);
      } else {
        await this.scaleDown(targetInstances);
      }

      // Record successful scaling action
      this.recordScalingAction({
        id: actionId,
        type: rule.action,
        reason: `${rule.metric} ${rule.action === 'scale_up' ? 'exceeded' : 'fell below'} threshold of ${rule.threshold} (current: ${metricValue})`,
        timestamp: new Date(),
        instancesBefore,
        instancesAfter: this.currentInstances,
        success: true,
      });

      // Send notification
      await emailAlerts.sendSystemError(
        new Error(`Auto-scaling: ${rule.action} executed`),
        `System auto-scaled from ${instancesBefore} to ${this.currentInstances} instances due to ${rule.metric} = ${metricValue}`
      );

    } catch (error) {
      console.error('Scaling action failed:', error);
      
      // Record failed scaling action
      this.recordScalingAction({
        id: actionId,
        type: rule.action,
        reason: `Failed to ${rule.action}: ${error.message}`,
        timestamp: new Date(),
        instancesBefore,
        instancesAfter: this.currentInstances,
        success: false,
      });
    }
  }

  // Scale up instances
  private async scaleUp(targetInstances: number): Promise<void> {
    if (cluster.isMaster) {
      // Fork new worker processes
      const newWorkers = targetInstances - this.currentInstances;
      for (let i = 0; i < newWorkers; i++) {
        cluster.fork();
      }
      
      this.currentInstances = targetInstances;
      this.lastScalingAction = new Date();
      
      console.log(`Scaled up to ${targetInstances} instances`);
    } else {
      // In a real cloud environment, this would trigger container/VM scaling
      // For now, we simulate the scaling action
      this.currentInstances = targetInstances;
      this.lastScalingAction = new Date();
    }
  }

  // Scale down instances
  private async scaleDown(targetInstances: number): Promise<void> {
    if (cluster.isMaster) {
      // Kill worker processes gracefully
      const workersToKill = this.currentInstances - targetInstances;
      const workers = Object.values(cluster.workers);
      
      for (let i = 0; i < workersToKill && i < workers.length; i++) {
        workers[i]?.kill('SIGTERM');
      }
      
      this.currentInstances = targetInstances;
      this.lastScalingAction = new Date();
      
      console.log(`Scaled down to ${targetInstances} instances`);
    } else {
      // In a real cloud environment, this would trigger container/VM scaling
      // For now, we simulate the scaling action
      this.currentInstances = targetInstances;
      this.lastScalingAction = new Date();
    }
  }

  // Record scaling action
  private recordScalingAction(action: ScalingAction) {
    this.scalingHistory.push(action);
    
    // Keep only last 100 actions
    if (this.scalingHistory.length > 100) {
      this.scalingHistory = this.scalingHistory.slice(-100);
    }
  }

  // Clean up old history
  private cleanupHistory() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.scalingHistory = this.scalingHistory.filter(action => action.timestamp > oneDayAgo);
  }

  // Manual scaling
  async manualScale(targetInstances: number, reason: string = 'Manual scaling'): Promise<boolean> {
    if (targetInstances < 1 || targetInstances > 10) {
      throw new Error('Target instances must be between 1 and 10');
    }

    const instancesBefore = this.currentInstances;
    const actionId = `manual_${Date.now()}`;
    
    try {
      if (targetInstances > this.currentInstances) {
        await this.scaleUp(targetInstances);
      } else if (targetInstances < this.currentInstances) {
        await this.scaleDown(targetInstances);
      }

      this.recordScalingAction({
        id: actionId,
        type: targetInstances > instancesBefore ? 'scale_up' : 'scale_down',
        reason,
        timestamp: new Date(),
        instancesBefore,
        instancesAfter: this.currentInstances,
        success: true,
      });

      return true;
    } catch (error) {
      this.recordScalingAction({
        id: actionId,
        type: targetInstances > instancesBefore ? 'scale_up' : 'scale_down',
        reason: `Manual scaling failed: ${error.message}`,
        timestamp: new Date(),
        instancesBefore,
        instancesAfter: this.currentInstances,
        success: false,
      });

      throw error;
    }
  }

  // Get scaling recommendations
  getScalingRecommendations() {
    const recommendations = [];

    // Get current system metrics
    const systemStatus = monitoring.getSystemStatus();
    
    // Analyze trends
    const recentHistory = this.scalingHistory.slice(-10);
    const frequentScaling = recentHistory.filter(action => 
      action.timestamp > new Date(Date.now() - 30 * 60 * 1000)
    ).length > 3;

    if (frequentScaling) {
      recommendations.push({
        type: 'optimize',
        priority: 'high',
        message: 'Frequent scaling detected. Consider optimizing application performance or adjusting scaling thresholds.',
        action: 'Review database queries and enable caching',
      });
    }

    // CPU-based recommendations
    // const avgCpu = systemStatus.metrics.cpuUsage;
    // if (avgCpu > 60) {
    //   recommendations.push({
    //     type: 'scale_up',
    //     priority: 'medium',
    //     message: 'CPU usage consistently above 60%. Consider scaling up preemptively.',
    //     action: 'Add 1-2 instances to handle peak load',
    //   });
    // }

    // Memory-based recommendations
    // const avgMemory = systemStatus.metrics.memoryUsage;
    // if (avgMemory > 70) {
    //   recommendations.push({
    //     type: 'scale_up',
    //     priority: 'medium',
    //     message: 'Memory usage consistently above 70%. Consider scaling up or optimizing memory usage.',
    //     action: 'Add instances or optimize memory-intensive operations',
    //   });
    // }

    return recommendations;
  }

  // Get auto-scaling status
  getStatus() {
    return {
      enabled: this.isEnabled,
      currentInstances: this.currentInstances,
      lastScalingAction: this.lastScalingAction,
      scalingRules: this.scalingRules,
      recentHistory: this.scalingHistory.slice(-10),
      recommendations: this.getScalingRecommendations(),
    };
  }

  // Get scaling metrics
  getMetrics() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActions = this.scalingHistory.filter(action => action.timestamp > last24Hours);
    
    return {
      totalScalingActions: recentActions.length,
      successfulActions: recentActions.filter(action => action.success).length,
      failedActions: recentActions.filter(action => !action.success).length,
      scaleUpActions: recentActions.filter(action => action.type === 'scale_up').length,
      scaleDownActions: recentActions.filter(action => action.type === 'scale_down').length,
      averageInstances: recentActions.reduce((sum, action) => sum + action.instancesAfter, 0) / recentActions.length || this.currentInstances,
      peakInstances: Math.max(...recentActions.map(action => action.instancesAfter), this.currentInstances),
      minInstances: Math.min(...recentActions.map(action => action.instancesAfter), this.currentInstances),
    };
  }

  // Predictive scaling based on historical patterns
  predictiveScaling() {
    const hourlyPatterns = this.analyzeHourlyPatterns();
    const currentHour = new Date().getHours();
    
    // Check if we're approaching a high-traffic period
    const upcomingHours = [currentHour + 1, currentHour + 2].map(h => h % 24);
    const upcomingLoad = upcomingHours.reduce((sum, hour) => sum + (hourlyPatterns[hour] || 0), 0) / upcomingHours.length;
    
    if (upcomingLoad > 1.5) { // 50% more than average
      return {
        recommended: true,
        action: 'scale_up',
        reason: 'Predictive scaling: High load expected in next 2 hours',
        targetInstances: Math.min(this.currentInstances + 2, 10),
      };
    }
    
    return {
      recommended: false,
      reason: 'No predictive scaling needed',
    };
  }

  // Analyze hourly traffic patterns
  private analyzeHourlyPatterns(): Record<number, number> {
    // Simplified pattern analysis
    // In a real implementation, this would analyze historical data
    const patterns: Record<number, number> = {};
    
    // Business hours (9-17) have higher load
    for (let hour = 0; hour < 24; hour++) {
      if (hour >= 9 && hour <= 17) {
        patterns[hour] = 1.5 + Math.random() * 0.5; // 1.5-2.0x load
      } else {
        patterns[hour] = 0.5 + Math.random() * 0.5; // 0.5-1.0x load
      }
    }
    
    return patterns;
  }

  // Emergency scaling
  async emergencyScale(reason: string) {
    console.log(`Emergency scaling triggered: ${reason}`);
    
    // Scale up to maximum instances immediately
    await this.manualScale(10, `Emergency scaling: ${reason}`);
    
    // Send critical alert
    await emailAlerts.sendSystemError(
      new Error('Emergency scaling activated'),
      `Emergency scaling to maximum instances due to: ${reason}`
    );
  }

  // Enable/disable auto-scaling
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`Auto-scaling ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Update scaling rules
  updateScalingRules(rules: ScalingRule[]) {
    this.scalingRules = rules;
    console.log('Scaling rules updated');
  }
}

export const autoScaling = new AutoScalingSystem();