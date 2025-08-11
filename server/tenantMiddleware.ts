import { Request, Response, NextFunction } from "express";
import { districtService } from "./districtService";

// Extend Express Request type to include district context
declare global {
  namespace Express {
    interface Request {
      district?: any;
      isMultiTenant?: boolean;
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get district context from request (subdomain, custom domain, or user session)
    const district = await districtService.getDistrictFromRequest(req);
    
    if (district) {
      // Check subscription status
      const subscriptionStatus = await districtService.checkSubscriptionStatus(district.id);
      
      if (!subscriptionStatus.isActive) {
        return res.status(402).json({ 
          message: "District subscription is not active",
          subscriptionStatus,
          district: { name: district.name, slug: district.slug }
        });
      }
      
      // Add district context to request
      req.district = district;
      req.isMultiTenant = true;
    } else {
      // For backward compatibility, allow requests without district context
      req.isMultiTenant = false;
    }
    
    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    // CRITICAL SECURITY: For user data access, district context is mandatory
    if (req.path.includes('/api/employees') || req.path.includes('/api/onboarding') || req.path.includes('/api/monthly-timecards')) {
      return res.status(403).json({ message: "District context required for secure data access" });
    }
    next(); // Continue without district context only for non-sensitive endpoints
  }
};

// Middleware to ensure district context exists
export const requireDistrict = (req: Request, res: Response, next: NextFunction) => {
  if (!req.district) {
    return res.status(400).json({ 
      message: "District context required. Please access through your district's URL." 
    });
  }
  next();
};

// Middleware to filter data by district
export const withDistrictFilter = (req: Request, res: Response, next: NextFunction) => {
  if (req.district && req.user) {
    // Ensure user belongs to the current district
    if (req.user.districtId && req.user.districtId !== req.district.id) {
      return res.status(403).json({ 
        message: "Access denied. User does not belong to this district." 
      });
    }
  }
  next();
};