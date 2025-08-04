import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure only system owners can access sensitive operations
 */
export const requireSystemOwner = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  if (!user.isSystemOwner) {
    return res.status(403).json({ 
      error: 'System owner access required. This operation requires the highest level of administrative privileges.' 
    });
  }
  
  next();
};

/**
 * Middleware to check if user has system owner privileges
 */
export const checkSystemOwner = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  
  // Add system owner status to request
  req.isSystemOwner = user?.isSystemOwner === true;
  
  next();
};