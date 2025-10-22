import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware to extract and validate organization_id from JWT token
 * All protected routes should use this middleware
 */
export const requireOrganization = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.organization_id) {
    res.status(401).json({
      error: 'Organization ID not found in token',
      details: 'User must belong to an organization',
    });
    return;
  }

  // Attach organization_id to request for use in route handlers
  (req as any).organizationId = req.user.organization_id;

  next();
};

/**
 * Middleware to validate organization ownership of a resource
 * Use in endpoints that access specific resources
 */
export const validateResourceOwnership = (resourceOrgId: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.organization_id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (req.user.organization_id !== resourceOrgId) {
      res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
};
