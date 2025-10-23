# Feature Gap Analysis vs Henr / Axonaut / Sellsy

Date: 2025-02-15  
Author: Codex (assistant)

## 1. Executive Overview
- **Strengths:** Simplix already covers CRM core (contacts, pipeline, deals), quoting, invoicing basics, analytics, and team collaboration with a polished React Native front-end.
- **High-impact gaps vs Henr, Axonaut, Sellsy:** procurement & expenses, banking & accounting automation, recurring/advanced billing, ERP-grade stock purchasing, and back-office HR/time modules.
- **New capabilities delivered in this iteration:** supplier management (multi-tenant) and integrated expense tracking, including dashboards, CRUD APIs, and dedicated mobile screens.

## 2. Gap Matrix

| Capability | Henr | Axonaut | Sellsy | Simplix (before) | Simplix (after) | Notes |
|------------|------|---------|--------|------------------|-----------------|-------|
| CRM (contacts, pipeline, tasks, deals) | ✅ | ✅ | ✅ | ✅ | ✅ | Already strong |
| Quotes & invoices | ✅ | ✅ | ✅ | ✅ (basic) | ✅ (basic) | Missing recurring billing, e-signature, SEPA |
| Supplier & purchase management | ⚠️ (light) | ✅ | ✅ | ❌ | ✅ (base) | New suppliers module; still missing purchase orders & GRN |
| Expense reports & reimbursements | ✅ | ✅ | ✅ | ❌ | ✅ (base) | Added expenses API & UI; approvals, workflows pending |
| Banking sync & reconciliation | ✅ | ✅ | ✅ | ❌ | ❌ | Needs Open Banking, ledger, reconciliation |
| Cashflow forecasting | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | Requires link to payments & bank feeds |
| Inventory purchasing & dropshipping | ⚠️ | ✅ | ✅ | ❌ | ❌ | Need purchase orders, supplier stock |
| Subscription & recurring billing | ✅ | ✅ | ✅ | ❌ | ❌ | Requires schedules, proration, payment links |
| Automation workflows (email, SMS) | ⚠️ | ✅ | ✅ | ✅ (basic) | ✅ | Need triggers on expenses/suppliers |
| Customer support / ticketing | ⚠️ | ✅ | ✅ | ❌ | ❌ | Could extend activities module |
| Project & time tracking | ✅ | ✅ | ✅ | ❌ | ❌ | Consider sprint/tasks upgrade |
| HR (absences, expenses approvals) | ✅ | ✅ | ✅ | ❌ | ⚠️ | Expense approvals partially covered via status |
| Analytics & KPIs (finance) | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | Need financial dashboards (expenses vs budget) |

Legend: ✅ complete parity, ⚠️ partial, ❌ missing

## 3. Newly Implemented Features
### 3.1 Supplier Management
- PostgreSQL tables for suppliers/expense categories with multi-tenant isolation.
- REST endpoints (`/api/suppliers`) supporting search, categorisation, soft-delete and stats.
- React Native screen `SuppliersScreen` with filters, summary KPIs, creation modal.

### 3.2 Expense Tracking
- PostgreSQL `expenses` table with statuses (`draft/submitted/approved/paid`) and payment tracking.
- REST endpoints (`/api/expenses`) with filters, pagination, status transitions, and KPI summary.
- React Native screen `ExpensesScreen` for list, filters (status/payment), quick capture modal, supplier chip selection.

### 3.3 Platform Fixes
- JWT middleware now propagates `organization_id` for proper multi-tenancy enforcement.

## 4. Recommended Next Steps
1. **Procurement depth:** add purchase orders, goods receipts, invoice matching to reach Axonaut/Sellsy parity.
2. **Financial automation:** build recurring invoices, payment reminders, SEPA/Stripe integration.
3. **Accounting connectors:** integrate bank feeds (Budget Insight/Linxea) and ledger exports (FEC, Sage).
4. **Expense workflow:** add approvals, reimbursement payouts, mobile receipt capture.
5. **Reporting:** dedicated finance dashboards (expenses vs budget, supplier spend, cash projections).
6. **HR/time tracking:** timesheets, leave requests, linking expenses to projects.
7. **Compliance:** VAT rates matrix, 3-way matching, audit logs per expense change.

## 5. Residual Risks
- Legacy SQLite-based routes still need upgrading to the PostgreSQL multi-tenant schema.
- Front-end TypeScript build currently fails on `DashboardScreen.old.tsx`; keep excluded or fix legacy file.
- No automated tests cover new endpoints; unit/integration coverage is recommended before production rollout.

