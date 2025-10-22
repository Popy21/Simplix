/**
 * Helper utilities for multi-tenancy operations
 */

/**
 * Build WHERE clause for organization filter
 */
export const buildOrgFilter = (
  tableAlias: string = 't',
  orgId: string
): { whereClause: string; params: any[] } => {
  return {
    whereClause: `${tableAlias}.organization_id = $1`,
    params: [orgId],
  };
};

/**
 * Build multiple organization filters
 */
export const buildMultiOrgFilter = (
  filters: Array<{ table: string; orgId: string }>,
  startParamIndex: number = 1
): { whereClause: string; params: any[] } => {
  const whereParts: string[] = [];
  const params: any[] = [];

  filters.forEach((filter, index) => {
    whereParts.push(`${filter.table}.organization_id = $${startParamIndex + index}`);
    params.push(filter.orgId);
  });

  return {
    whereClause: whereParts.join(' AND '),
    params,
  };
};

/**
 * Ensure organization_id in INSERT/UPDATE values
 */
export const ensureOrgId = (
  data: Record<string, any>,
  orgId: string
): Record<string, any> => {
  return {
    ...data,
    organization_id: orgId,
  };
};

/**
 * Extract organization_id from request
 */
export const getOrgIdFromRequest = (req: any): string => {
  return req.user?.organization_id || process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001';
};

/**
 * Validate resource belongs to user's organization
 */
export const validateOrgAccess = (
  resourceOrgId: string | undefined,
  userOrgId: string
): boolean => {
  if (!resourceOrgId) return false;
  return resourceOrgId === userOrgId;
};

/**
 * Add organization isolation to pagination
 */
export const buildPaginatedQuery = (
  baseQuery: string,
  orgId: string,
  limit: number = 20,
  offset: number = 0
): { query: string; params: any[] } => {
  const params = [orgId, limit, offset];
  const query = `${baseQuery} LIMIT $2 OFFSET $3`;

  return { query, params };
};

/**
 * Build standard response with org context
 */
export const buildResponse = (
  data: any,
  metadata?: any
) => {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
};

/**
 * Build error response
 */
export const buildErrorResponse = (
  error: string,
  statusCode: number = 500,
  details?: any
) => {
  return {
    statusCode,
    error,
    details,
    timestamp: new Date().toISOString(),
  };
};
