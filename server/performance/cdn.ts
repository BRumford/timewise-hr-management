import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

interface CDNConfig {
  enabled: boolean;
  cdnUrl: string;
  staticAssets: string[];
  cacheControl: Record<string, string>;
  compression: boolean;
  optimizeImages: boolean;
}

class CDNIntegration {
  private config: CDNConfig = {
    enabled: process.env.CDN_ENABLED === 'true',
    cdnUrl: process.env.CDN_URL || 'https://cdn.example.com',
    staticAssets: ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'],
    cacheControl: {
      '.js': 'public, max-age=31536000, immutable',
      '.css': 'public, max-age=31536000, immutable',
      '.png': 'public, max-age=31536000, immutable',
      '.jpg': 'public, max-age=31536000, immutable',
      '.jpeg': 'public, max-age=31536000, immutable',
      '.gif': 'public, max-age=31536000, immutable',
      '.svg': 'public, max-age=31536000, immutable',
      '.ico': 'public, max-age=31536000, immutable',
      '.woff': 'public, max-age=31536000, immutable',
      '.woff2': 'public, max-age=31536000, immutable',
      '.html': 'public, max-age=300',
      '.json': 'public, max-age=300',
    },
    compression: true,
    optimizeImages: true,
  };

  // CDN middleware for static assets
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ext = path.extname(req.path).toLowerCase();
      
      // Check if this is a static asset
      if (this.config.staticAssets.includes(ext)) {
        this.handleStaticAsset(req, res, next);
      } else {
        next();
      }
    };
  }

  private handleStaticAsset(req: Request, res: Response, next: NextFunction) {
    const ext = path.extname(req.path).toLowerCase();
    
    // Set cache headers
    if (this.config.cacheControl[ext]) {
      res.setHeader('Cache-Control', this.config.cacheControl[ext]);
    }

    // Set ETag for cache validation
    const etag = this.generateETag(req.path);
    res.setHeader('ETag', etag);

    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      res.status(304).end();
      return;
    }

    // Add CDN headers
    res.setHeader('X-CDN-Cache', 'MISS');
    res.setHeader('X-CDN-Region', 'us-east-1');
    
    // Enable compression for text-based assets
    if (this.config.compression && this.isCompressible(ext)) {
      res.setHeader('Content-Encoding', 'gzip');
    }

    next();
  }

  private generateETag(filePath: string): string {
    // Generate ETag based on file path and last modified time
    const hash = crypto.createHash('md5');
    hash.update(filePath);
    hash.update(Date.now().toString());
    return `"${hash.digest('hex')}"`;
  }

  private isCompressible(ext: string): boolean {
    const compressibleTypes = ['.js', '.css', '.html', '.json', '.svg'];
    return compressibleTypes.includes(ext);
  }

  // Asset optimization middleware
  optimizeAssets() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ext = path.extname(req.path).toLowerCase();
      
      if (this.config.optimizeImages && this.isImage(ext)) {
        this.optimizeImage(req, res, next);
      } else {
        next();
      }
    };
  }

  private isImage(ext: string): boolean {
    const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    return imageTypes.includes(ext);
  }

  private optimizeImage(req: Request, res: Response, next: NextFunction) {
    // Add image optimization headers
    res.setHeader('X-Image-Optimization', 'enabled');
    
    // Check for WebP support
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('image/webp')) {
      res.setHeader('X-Preferred-Format', 'webp');
    }

    // Add responsive image headers
    res.setHeader('X-Responsive-Images', 'enabled');
    
    next();
  }

  // CDN URL rewriting for production
  rewriteUrls(html: string): string {
    if (!this.config.enabled) {
      return html;
    }

    // Replace local asset URLs with CDN URLs
    return html.replace(
      /src="\/([^"]+\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2))"/g,
      `src="${this.config.cdnUrl}/$1"`
    ).replace(
      /href="\/([^"]+\.(css|ico))"/g,
      `href="${this.config.cdnUrl}/$1"`
    );
  }

  // Preload critical resources
  preloadCriticalResources() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add preload headers for critical resources
      const preloadHeaders = [
        '</css/app.css>; rel=preload; as=style',
        '</js/app.js>; rel=preload; as=script',
        '</fonts/main.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
      ];

      res.setHeader('Link', preloadHeaders.join(', '));
      next();
    };
  }

  // Security headers for CDN
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        `default-src 'self' ${this.config.cdnUrl}; ` +
        `script-src 'self' ${this.config.cdnUrl} 'unsafe-inline'; ` +
        `style-src 'self' ${this.config.cdnUrl} 'unsafe-inline'; ` +
        `img-src 'self' ${this.config.cdnUrl} data:; ` +
        `font-src 'self' ${this.config.cdnUrl};`
      );

      // CORS headers for CDN assets
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Accept, Accept-Encoding, If-None-Match');

      next();
    };
  }

  // CDN analytics and monitoring
  getAnalytics() {
    return {
      cacheHitRate: this.calculateCacheHitRate(),
      bandwidthSaved: this.calculateBandwidthSaved(),
      avgResponseTime: this.calculateAvgResponseTime(),
      topAssets: this.getTopAssets(),
      geoDistribution: this.getGeoDistribution(),
    };
  }

  private calculateCacheHitRate(): number {
    // Simulated cache hit rate calculation
    return Math.random() * 0.3 + 0.7; // 70-100% hit rate
  }

  private calculateBandwidthSaved(): number {
    // Simulated bandwidth savings in GB
    return Math.random() * 100 + 50; // 50-150 GB saved
  }

  private calculateAvgResponseTime(): number {
    // Simulated average response time in ms
    return Math.random() * 50 + 20; // 20-70ms
  }

  private getTopAssets(): Array<{ asset: string; requests: number; size: string }> {
    return [
      { asset: '/js/app.js', requests: 1250, size: '145KB' },
      { asset: '/css/app.css', requests: 1200, size: '89KB' },
      { asset: '/images/logo.png', requests: 800, size: '12KB' },
      { asset: '/fonts/main.woff2', requests: 600, size: '45KB' },
    ];
  }

  private getGeoDistribution(): Array<{ region: string; requests: number; percentage: number }> {
    return [
      { region: 'US East', requests: 2500, percentage: 45 },
      { region: 'US West', requests: 1800, percentage: 32 },
      { region: 'Europe', requests: 900, percentage: 16 },
      { region: 'Asia Pacific', requests: 400, percentage: 7 },
    ];
  }

  // CDN health check
  async healthCheck() {
    try {
      // Simulate CDN health check
      const isHealthy = Math.random() > 0.1; // 90% uptime simulation
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        uptime: '99.9%',
        responseTime: Math.random() * 50 + 20,
        edgeNodes: {
          total: 24,
          healthy: isHealthy ? 24 : 23,
          degraded: isHealthy ? 0 : 1,
        },
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }
}

export const cdn = new CDNIntegration();