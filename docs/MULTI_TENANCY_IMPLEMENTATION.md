# Multi-Tenancy Implementation Guide

## Overview

This document describes how to apply multi-tenancy to all API routes. Multi-tenancy ensures that each organization's data is completely isolated from other organizations' data.

## What is Multi-Tenancy?

Multi-tenancy is an architectural approach where:
- Each user belongs to exactly ONE organization
- Each organization's data is completely isolated from others
- The system prevents any data leakage between organizations
- All queries automatically filter by organization_id

## Core Components

### 1. AuthRequest Interface
Located in `api/src/middleware/auth.ts`:
```typescript
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    organization_id?: string;  // Added for multi-tenancy
  };
}
```

### 2. Multi-Tenancy Middleware
Located in `api/src/middleware/multiTenancy.ts`:
```typescript
export const requireOrganization = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Ensures that req.user.organization_id is set from JWT
  // Prevents access if not authenticated with org
}
```

### 3. Multi-Tenancy Helper Functions
Located in `api/src/utils/multiTenancyHelper.ts`:
- `getOrgIdFromRequest(req)` - Safely extract org_id from JWT
- `buildOrgFilter()` - Generate WHERE clause for org filtering
- `ensureOrgId(data, orgId)` - Add org_id to data objects
- `validateOrgAccess(resourceOrgId, userOrgId)` - Verify ownership

## Implementation Pattern

### Basic Pattern for All Endpoints

Every endpoint should follow this structure:

#### GET All (with Pagination)
```typescript
router.get('/',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { page = 1, limit = 20 } = req.query;
      
      const result = await pool.query(
        `SELECT * FROM table_name 
         WHERE organization_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [orgId, limit, (page - 1) * limit]
      );
      
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
```

#### GET by ID
```typescript
router.get('/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = getOrgIdFromRequest(req);
      
      const result = await pool.query(
        `SELECT * FROM table_name 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [id, orgId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
```

#### POST Create
```typescript
router.post('/',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { field1, field2 } = req.body;
      
      const result = await pool.query(
        `INSERT INTO table_name (organization_id, field1, field2, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [orgId, field1, field2]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
```

#### PUT Update
```typescript
router.put('/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { field1, field2 } = req.body;
      const orgId = getOrgIdFromRequest(req);
      
      const result = await pool.query(
        `UPDATE table_name 
         SET field1 = $1, field2 = $2, updated_at = NOW()
         WHERE id = $3 AND organization_id = $4
         RETURNING *`,
        [field1, field2, id, orgId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
```

#### DELETE (Soft Delete)
```typescript
router.delete('/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const orgId = getOrgIdFromRequest(req);
      
      const result = await pool.query(
        `UPDATE table_name 
         SET deleted_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [id, orgId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }
      
      res.json({ message: 'Resource deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);
```

## Required Imports

All route files must import:
```typescript
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import {
  getOrgIdFromRequest,
  buildOrgFilter,
  ensureOrgId,
  validateOrgAccess
} from '../utils/multiTenancyHelper';
import { AuthRequest } from '../middleware/auth';
```

## Priority Routes to Implement

### Tier 1 (Critical - Data Core)
1. ✅ customers.ts - **COMPLETED**
2. products.ts
3. deals.ts
4. invoices.ts
5. leads.ts

### Tier 2 (Important - Operations)
6. sales.ts
7. contacts.ts (if exists separately)
8. payments.ts
9. tasks.ts
10. campaigns.ts

### Tier 3 (Supporting)
11. documents.ts
12. teams.ts
13. workflows.ts
14. reports.ts
15. analytics.ts

### Tier 4 (Admin/Special)
- permissions.ts
- activities.ts
- notifications.ts
- emails.ts
- search.ts
- bulk.ts
- deduplication.ts

## Database Requirements

All tables must have:
1. `organization_id UUID` column (NOT NULL FK)
2. `deleted_at TIMESTAMP` column (NULL for active records)
3. Index: `(organization_id, deleted_at)`

## Security Rules

### Rule 1: Always Filter by Organization
Every query must include `WHERE organization_id = $X` clause.

### Rule 2: Verify Ownership Before Return
```typescript
if (!validateOrgAccess(resource.organization_id, orgId)) {
  res.status(403).json({ error: 'Access denied' });
  return;
}
```

### Rule 3: Authenticate All Endpoints
All endpoints (except auth/public) must have:
- `authenticateToken` middleware
- `requireOrganization` middleware

### Rule 4: Use Soft Delete
```typescript
// GOOD - Soft delete
SET deleted_at = NOW()

// BAD - Hard delete
DELETE FROM table
```

## Testing Multi-Tenancy

### Test 1: Verify Org Isolation
```bash
# Organization 1
curl -H "Authorization: Bearer $TOKEN_ORG1" \
  http://localhost:3001/api/customers

# Organization 2
curl -H "Authorization: Bearer $TOKEN_ORG2" \
  http://localhost:3001/api/customers
# Should NOT see Organization 1's customers
```

### Test 2: Verify Resource Ownership
```bash
# Try to access another org's resource
curl -H "Authorization: Bearer $TOKEN_ORG1" \
  http://localhost:3001/api/customers/123  # where 123 belongs to ORG2
# Should return 404 (resource not found)
```

### Test 3: Verify Soft Delete
```bash
# Delete a resource
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/customers/123

# Verify it's soft deleted
SELECT deleted_at FROM customers WHERE id = 123;
# Should show a timestamp, not NULL
```

## Implementation Checklist

For each route file:

- [ ] Add imports for auth, multi-tenancy middleware
- [ ] Add imports for multi-tenancy helpers
- [ ] Update Request type to AuthRequest
- [ ] Add authenticateToken to all protected endpoints
- [ ] Add requireOrganization to all protected endpoints
- [ ] Extract orgId from request in each endpoint
- [ ] Add organization_id filter to all WHERE clauses
- [ ] Ensure soft delete (NOT hard delete)
- [ ] Test org isolation with multiple test users
- [ ] Verify no hardcoded org_id values
- [ ] Run get_errors to verify TypeScript
- [ ] Test endpoints with actual JWT tokens

## Common Pitfalls to Avoid

❌ **WRONG: Hardcoded organization_id**
```typescript
const orgId = '00000000-0000-0000-0000-000000000001';  // WRONG!
```

✅ **RIGHT: Extract from JWT**
```typescript
const orgId = getOrgIdFromRequest(req);  // CORRECT
```

---

❌ **WRONG: Hard delete**
```typescript
router.delete('/:id', async (req, res) => {
  pool.query('DELETE FROM table WHERE id = $1', [id]);  // WRONG!
});
```

✅ **RIGHT: Soft delete**
```typescript
router.delete('/:id', async (req: AuthRequest, res) => {
  pool.query(
    'UPDATE table SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2',
    [id, getOrgIdFromRequest(req)]
  );
});
```

---

❌ **WRONG: Missing org filter**
```typescript
const result = await pool.query(
  'SELECT * FROM customers WHERE id = $1',  // WRONG - no org check!
  [id]
);
```

✅ **RIGHT: Include org filter**
```typescript
const result = await pool.query(
  'SELECT * FROM customers WHERE id = $1 AND organization_id = $2',
  [id, orgId]
);
```

---

❌ **WRONG: Missing middleware**
```typescript
router.get('/', async (req: Request, res: Response) => {
  // WRONG - anyone can access!
});
```

✅ **RIGHT: Include middleware**
```typescript
router.get('/', 
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    // CORRECT - only authenticated users in same org
  }
);
```

## Progress Tracking

### Completed ✅
- customers.ts (all 5 endpoints)

### In Progress 🔄
- (none currently)

### To Do ⏳
- products.ts
- deals.ts
- invoices.ts
- leads.ts
- sales.ts
- And 9 more routes...

## Next Steps

1. Update products.ts following the pattern above
2. Update deals.ts
3. Continue systematically through all routes
4. Run TypeScript compilation to verify no errors
5. Test org isolation with test accounts
6. Deploy to staging
7. Test in production with multiple orgs

## Questions?

Refer back to these key files:
- **Auth Logic**: `/api/src/middleware/auth.ts`
- **Multi-Tenancy Middleware**: `/api/src/middleware/multiTenancy.ts`
- **Helper Functions**: `/api/src/utils/multiTenancyHelper.ts`
- **Example Implementation**: `/api/src/routes/customers.ts`
- **JWT Documentation**: `/docs/JWT_AUTHENTICATION.md`
