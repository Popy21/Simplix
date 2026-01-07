# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Autonomous Mode

Claude Code is authorized to work autonomously: execute commands (npm, git, psql, bash scripts), modify files, run migrations, install packages, make commits, and deploy without confirmation.

**Production Server**: Host `82.165.134.105`, user `root`. Use `sshpass` with credentials from `.env.production` for SSH/SCP operations.

## Project Overview

**Simplix CRM** is a multi-tenant SaaS CRM system with three main components:

1. **API** (`api/`) - Express.js + TypeScript + PostgreSQL backend
2. **Web/Mobile App** (`web-app/`) - React Native + Expo cross-platform frontend
3. **Database** (`database/`) - PostgreSQL with migration system

## Essential Commands

### API (Backend)
```bash
cd api
npm run dev        # Development with hot reload (ts-node + nodemon)
npm run build      # Compile TypeScript to dist/
npm start          # Production server
```

### Web/Mobile App (Frontend)
```bash
cd web-app
npm run web        # Web development server
npm run ios        # iOS simulator (macOS only)
npm run android    # Android emulator
npm start          # Expo dev server with QR code
```

### Database
```bash
cd database
./migrate.sh up              # Run all pending migrations
./migrate.sh up 005          # Run migrations up to 005
./migrate.sh status          # Check migration status
./migrate.sh create <name>   # Create new migration
./migrate.sh reset           # Reset database (destructive)
```

Environment variables required:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Default: `localhost:5432/simplix_crm` with user `postgres`

### Testing Database Connection
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -c "\dt"
```

## Architecture

### Backend Architecture

**Entry Point**: `api/src/index.ts`
- Initializes Express app with CORS, JSON parsing (50mb limit)
- Serves static files from `uploads/` directory
- Registers 40+ route modules

**Middleware Chain**:
1. `authenticateToken` (auth.ts) - Verifies JWT, loads user from DB
2. `requireOrganization` (multiTenancy.ts) - Enforces organization_id isolation
3. `authorizeRole` (auth.ts) - Role-based access control

**Database Connection** (`api/src/database/db.ts`):
- PostgreSQL connection pool with pg library
- Query helper logs slow queries (>1000ms)
- Transaction support via `getClient()`

**Key Routes** (`api/src/routes/`):
- `auth.ts`, `auth-2fa.ts` - Login, register, JWT, 2FA
- `contacts.ts`, `leads.ts`, `deals.ts` - CRM core (contacts, leads, pipeline)
- `invoices.ts`, `quotes.ts`, `payments.ts` - Billing with Stripe integration
- `pdf.ts` - PDF generation with Puppeteer
- `stripe.ts` - Payment processing, webhooks
- `upload.ts` - File uploads via multer
- `webhooks.ts` - External integrations
- `email-campaigns.ts` - Email marketing

### Frontend Architecture

**Entry Point**: `web-app/index.ts` → `App.tsx`

**API Service** (`web-app/src/services/api.ts`):
- Axios instance with automatic token injection
- Response interceptor handles 401 with token refresh
- Circuit breaker prevents infinite refresh loops (max 3 failures)
- All API calls defined as service objects (customerService, contactService, etc.)

**Authentication** (`web-app/src/context/AuthContext.tsx`):
- React Context for global auth state
- Proactive token refresh (checks every 60s, refreshes if <5min remaining)
- Automatic logout on expired tokens

**UI System**:
- Glass morphism design (`theme/glassTheme.ts`)
- Responsive styles (`theme/responsive.ts`)
- GlassLayout wrapper component for consistent styling
- Custom navigation with bottom tabs and iPhone-style home button

### Database Architecture

**Multi-Tenancy**: All main tables have `organization_id` column with foreign key to `organizations` table

**Soft Deletes**: Most tables use `deleted_at` timestamp instead of hard deletes

**Key Schemas** (27 migrations in `database/migrations/`):

**001-004**: Core CRM system
- Users, roles, permissions, sessions, audit logs
- Companies, contacts, deals, pipelines, stages
- Activities (calls, emails, meetings, notes)
- Tasks, notifications, webhooks
- Email campaigns, analytics

**005-007**: Business operations
- Legacy compatibility layer
- Invoicing system (quotes, invoices, payments)
- JWT token storage
- Procurement (suppliers, expenses)

**008-027**: Features and fixes
- Deal probability scoring, Dashboard KPIs
- Invoice templates with customization
- Product images and soft deletes
- Digital showcase/catalog, Company profiles
- Document management with versioning
- Workflows and automation
- Stripe payment integration
- 2FA and security enhancements
- Webhook integrations

**Important Tables**:
- `organizations` - Tenant isolation root
- `users` - Authentication, linked to organization
- `contacts` - CRM contacts (leads, prospects, customers)
- `deals` - Sales opportunities with pipeline stages
- `invoices`, `quotes` - Billing documents
- `products` - Product catalog with images
- `activities` - Activity tracking
- `audit_logs` - Full audit trail

### Multi-Tenancy Implementation

**Critical**: All database queries MUST filter by `organization_id` to prevent data leakage between tenants.

Pattern in routes:
```typescript
const organizationId = req.user?.organization_id;
const result = await db.query(
  'SELECT * FROM contacts WHERE organization_id = $1 AND deleted_at IS NULL',
  [organizationId]
);
```

The `requireOrganization` middleware attaches `req.organizationId` for convenience.

### Authentication Flow

1. Login → API returns JWT access token + refresh token
2. Frontend stores both tokens in AsyncStorage
3. All API requests include `Authorization: Bearer <token>`
4. On 401 response, frontend automatically calls `/api/auth/refresh`
5. New tokens stored, original request retried
6. After 3 refresh failures, user logged out

**Token Structure**: JWT contains `{ id, email, role, organization_id }`

### File Handling

**Uploads** (`api/src/routes/upload.ts`):
- Files stored in `api/uploads/` directory
- Served statically at `/uploads/*`
- Multer handles multipart/form-data
- Image validation (size, type) on upload

**PDF Generation** (`api/src/routes/pdf.ts`):
- Puppeteer renders HTML to PDF
- Used for invoices, quotes, reports
- Templates can include company logos and custom styling

## Development Workflow

### Adding a New Feature

1. **Database**: Create migration in `database/migrations/`
2. **API**: Add route in `api/src/routes/`, update `index.ts`
3. **Frontend**: Add service method in `web-app/src/services/api.ts`
4. **UI**: Create screen in `web-app/src/screens/`, add to navigation

### Common Patterns

**Protected API Route**:
```typescript
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';

router.get('/contacts', authenticateToken, requireOrganization, async (req, res) => {
  const organizationId = req.user?.organization_id;
  // Query with organization_id filter
});
```

**API Call from Frontend**:
```typescript
// In services/api.ts
export const contactService = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/contacts', { params }),
};

// In component
const response = await contactService.getAll({ page: 1, limit: 20 });
```

**Database Query with Pagination**:
```typescript
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 20;
const offset = (page - 1) * limit;

const result = await db.query(
  'SELECT * FROM contacts WHERE organization_id = $1 AND deleted_at IS NULL LIMIT $2 OFFSET $3',
  [organizationId, limit, offset]
);
```

## Configuration

**API** (`.env` in `api/`):
```
PORT=3000
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simplix_crm
DB_USER=postgres
DB_PASSWORD=postgres
STRIPE_SECRET_KEY=sk_test_...
```

**Frontend** (`web-app/src/config/api.ts`):
- API_URL defaults to `http://localhost:3000/api`
- Update for production deployment

## Important Notes

### Security
- Always validate organization_id in queries
- Use parameterized queries to prevent SQL injection
- JWT tokens expire (default 1 hour), refresh tokens last longer
- Passwords hashed with bcryptjs
- 2FA support available via auth-2fa routes

### Performance
- Database pool size: 20 connections
- Slow query logging at 1000ms threshold
- API request/response logging in development
- Frontend caches user data in AsyncStorage

### Deployment

**Workflow**:
1. Commit and push to GitHub: `git push origin main`
2. Deploy using scripts: `./deploy.sh`, `./deploy-frontend.sh`, `./deploy-full.sh`, `./deploy-v5.sh`
3. Database migrations must run before API startup

**Production**: Host `82.165.134.105`, use `sshpass` with credentials from `.env.production`. Backend runs on port 3000. Frontend built with `npx expo export`.

## API Documentation

Swagger documentation available at `/api-docs` when API server is running.

## Quick Reference

**Test DB connection**: `PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -c "\dt"`

**Run API**: `cd api && npm run dev`

**Run Frontend**: `cd web-app && npm run web`

**Run migrations**: `cd database && ./migrate.sh up`
