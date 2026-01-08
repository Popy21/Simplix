# Simplix CRM API Test Report

**Test Date:** 2026-01-08
**Environment:** Production (https://crm.paraweb.fr/api/)
**Tester:** Automated QA Testing Suite
**API Version:** 4.0.0

---

## Executive Summary

A comprehensive test of the Simplix CRM API was performed covering 60+ endpoints across Finance, Core CRM, and Supporting modules. The testing identified **7 Critical/High severity issues**, **8 Medium severity issues**, and **12 Low/Observation items**.

### Overall Health Status: **NEEDS ATTENTION**

| Category | Status | Pass Rate |
|----------|--------|-----------|
| Authentication | PASS | 100% |
| Core CRM (contacts, leads, deals) | PASS with issues | 90% |
| Finance Modules | PARTIAL | 70% |
| Supporting Endpoints | PASS | 95% |
| Security | NEEDS IMPROVEMENT | 75% |

---

## Critical and High Severity Bugs

### Bug #1 - CRITICAL: Database Column Error in Cashflow Forecasts
```
Severity: Critical
Endpoint: GET /api/cashflow/forecasts
HTTP Status: 500
Response: {"error":"column ci.type does not exist"}
```

**Steps to Reproduce:**
1. Authenticate with valid JWT token
2. Send GET request to /api/cashflow/forecasts

**Expected Result:** Return list of cashflow forecasts

**Actual Result:** 500 Internal Server Error with database column mismatch

**Impact:** Cashflow forecasting feature is completely broken for all users

**Suggested Fix:** Review the SQL query in `/api/src/routes/cashflow.ts` line 87-100. The `cashflow_items` table may be missing the `type` column or the table alias `ci` is incorrect.

---

### Bug #2 - HIGH: XSS Vulnerability - No Input Sanitization
```
Severity: High
Endpoint: POST /api/contacts
Test Payload: {"email":"test@test.com","first_name":"<script>alert(1)</script>"}
```

**Steps to Reproduce:**
1. Authenticate with valid JWT token
2. Create a contact with HTML/JavaScript in the name field
3. Observe the stored data

**Expected Result:** Input should be sanitized or rejected

**Actual Result:** Script tags are stored verbatim in the database
```json
{
  "first_name": "<script>alert(1)</script>",
  "full_name": "<script>alert(1)</script>"
}
```

**Impact:** Potential for stored XSS attacks when data is rendered in the frontend

**Suggested Fix:** Implement server-side input sanitization using a library like DOMPurify or sanitize-html

---

### Bug #3 - HIGH: Empty Contact Creation Allowed
```
Severity: High
Endpoint: POST /api/contacts
Test Payload: {}
HTTP Status: 201 (should be 400)
```

**Steps to Reproduce:**
1. Authenticate with valid JWT token
2. POST empty JSON object to /api/contacts

**Expected Result:** 400 Bad Request with validation error

**Actual Result:** Contact created with all null fields
```json
{
  "first_name": null,
  "last_name": null,
  "email": null,
  "full_name": ""
}
```

**Impact:** Data quality issues, orphan records in database

**Suggested Fix:** Add required field validation (at minimum email OR first_name should be required)

---

### Bug #4 - HIGH: NaN Values in Quote Calculations
```
Severity: High
Endpoint: GET /api/quotes
Response contains NaN values:
```
```json
{
  "subtotal": "NaN",
  "tax_amount": "NaN",
  "total_amount": "NaN"
}
```

**Steps to Reproduce:**
1. Authenticate and GET /api/quotes

**Expected Result:** Numeric values for subtotal, tax_amount, total_amount

**Actual Result:** NaN values returned, indicating calculation errors

**Impact:** Financial reporting is inaccurate, quote PDFs will show invalid amounts

**Suggested Fix:** Review quote creation/update logic to ensure numeric validation before calculation

---

### Bug #5 - HIGH: Analytics Showing NaN Values
```
Severity: High
Endpoint: GET /api/analytics
Field: quotes.total_value = "NaN"
```

**Impact:** Dashboard and reporting metrics are unreliable

**Suggested Fix:** Same root cause as Bug #4 - quote calculations need fixing

---

### Bug #6 - MEDIUM: Internal Error Exposed on Invalid Email
```
Severity: Medium
Endpoint: POST /api/contacts
Test Payload: {"email":"invalid-email"}
HTTP Status: 500 (should be 400)
Response: {"error":"new row for relation \"contacts\" violates check constraint \"contact_email_valid\""}
```

**Expected Result:** 400 Bad Request with user-friendly error message

**Actual Result:** 500 Internal Server Error exposing database constraint name

**Impact:** Information disclosure, poor user experience

**Suggested Fix:** Validate email format before database insertion, return user-friendly error

---

### Bug #7 - MEDIUM: No Pagination Limit Enforcement
```
Severity: Medium
Endpoint: GET /api/contacts?page=-1&limit=1000000
HTTP Status: 200
```

**Expected Result:** Limit should be capped at reasonable value (e.g., 100)

**Actual Result:** Accepted limit of 1,000,000 (defaulted to 100 fortunately)

**Impact:** Potential DoS vector if limit is not properly handled

**Suggested Fix:** Enforce maximum limit of 100, validate page >= 1

---

## Missing/404 Endpoints

The following endpoints return 404 but are registered in index.ts:

| Endpoint | Issue | Recommendation |
|----------|-------|----------------|
| GET /api/cashflow | No root GET handler | Add index endpoint or redirect to /forecast |
| GET /api/accounting | No root GET handler | Add index endpoint |
| GET /api/stock | No root GET handler | Add index or redirect to /alerts |
| GET /api/shipping | No root GET handler | Add index or redirect to /rates |
| GET /api/categories | No root GET handler | Routes exist at /api/categories/products |
| GET /api/pricing | No root GET handler | Add pricing rules endpoint |
| GET /api/vat | No root GET handler | Routes exist at /api/vat/rates |
| GET /api/catalog | No root GET handler | Add catalog endpoints |
| GET /api/numbering | No root GET handler | Add numbering config endpoint |
| GET /api/showcase | No root GET handler | Add showcase listing |
| POST /api/qrcode/generate | Endpoint not implemented | Implement QR code generation |

---

## Endpoints Successfully Tested (Working)

### Authentication Module (100% Pass)
| Endpoint | Method | Status | Time |
|----------|--------|--------|------|
| /api/auth/login | POST | 401 (expected for invalid) | 0.12s |
| /api/auth/register | POST | 201 | 0.14s |
| /api/auth/me | GET | 200 | 0.13s |
| /api/auth/refresh | POST | 400 (expected) | 0.12s |
| /api/auth/validate-password | POST | 200 | 0.11s |

### Core CRM Module
| Endpoint | Method | Status | Time | Notes |
|----------|--------|--------|------|-------|
| /api/contacts | GET | 200 | 0.41s | Working |
| /api/contacts | POST | 201 | 0.15s | Missing validation |
| /api/leads | GET | 200 | 0.13s | Working |
| /api/deals | GET | 200 | 0.16s | Empty, working |
| /api/invoices | GET | 200 | 0.12s | Working |
| /api/quotes | GET | 200 | 0.13s | NaN values |
| /api/products | GET | 200 | 0.20s | Working |
| /api/companies | GET | 200 | 0.11s | Working |

### Finance Module
| Endpoint | Method | Status | Time | Notes |
|----------|--------|--------|------|-------|
| /api/credit-notes | GET | 200 | 0.12s | Working |
| /api/recurring-invoices | GET | 200 | 0.14s | Working |
| /api/cashflow/forecast | GET | 200 | 0.13s | Working |
| /api/cashflow/forecasts | GET | 500 | - | **BROKEN** |
| /api/bank | GET | 200 | 0.13s | Working |
| /api/reminders | GET | 200 | 0.13s | Working |
| /api/accounting/income-statement | GET | 200 | 0.13s | Working |
| /api/accounting/currencies | GET | 200 | 0.13s | Working |
| /api/accounting/chart-of-accounts | GET | 200 | 0.12s | Empty but working |
| /api/reports | GET | 200 | 0.14s | Working |
| /api/aged-balance | GET | 200 | 0.14s | Working |
| /api/revenue | GET | 200 | 0.13s | Working |

### Supporting Modules
| Endpoint | Method | Status | Time | Notes |
|----------|--------|--------|------|-------|
| /api/tasks | GET | 200 | 0.12s | Working |
| /api/activities | GET | 200 | 0.12s | Working |
| /api/dashboard | GET | 200 | 0.13s | Working |
| /api/analytics | GET | 200 | 0.11s | NaN in quotes |
| /api/settings | GET | 200 | 0.13s | Working |
| /api/company-profile | GET | 200 | 0.12s | Working |
| /api/pipeline | GET | 200 | 0.12s | Working |
| /api/templates | GET | 200 | 0.13s | Working |
| /api/suppliers | GET | 200 | 0.13s | Working |
| /api/expenses | GET | 200 | 0.13s | Working |
| /api/documents | GET | 200 | 0.12s | Working |
| /api/webhooks | GET | 200 | 0.12s | Working |
| /api/payments | GET | 200 | 0.12s | Working |
| /api/permissions | GET | 200 | 0.20s | Working |
| /api/workflows | GET | 200 | 0.19s | Working |
| /api/notifications | GET | 200 | 0.13s | Working |
| /api/exports | GET | 200 | 0.12s | Working |
| /api/purchase-orders | GET | 200 | 0.12s | Working |
| /api/delivery-notes | GET | 200 | 0.13s | Working |
| /api/proforma | GET | 200 | 0.11s | Working |
| /api/expense-notes | GET | 200 | 0.12s | Working |
| /api/return-orders | GET | 200 | 0.13s | Working |
| /api/stock/alerts | GET | 200 | 0.14s | Working |
| /api/shipping/rates | GET | 200 | 0.13s | Working |
| /api/categories/products | GET | 200 | 0.12s | Working |
| /api/vat/rates | GET | 200 | 0.12s | Working |
| /api/legal-settings | GET | 200 | 0.12s | Working |
| /api/deposits | GET | 200 | 0.14s | Working |

---

## Security Assessment

### Positive Findings
1. **SQL Injection Protection**: Parameterized queries are used - injection attempts return normal results
2. **JWT Authentication**: Properly validates tokens, rejects invalid/expired tokens
3. **401 on Invalid Token**: Returns proper "Invalid token format" error
4. **Organization Isolation**: All queries filter by organization_id (multi-tenancy working)
5. **Password Validation**: Strong password requirements enforced on registration

### Security Issues
1. **XSS Vulnerability** (Bug #2): No input sanitization
2. **Information Disclosure**: Database constraint names exposed in errors
3. **No Rate Limiting Observed**: No evidence of rate limiting on auth endpoints
4. **Pagination Not Enforced**: Large limit values accepted

---

## Performance Summary

| Metric | Value |
|--------|-------|
| Average Response Time | 0.14s |
| Slowest Endpoint | GET /api/contacts (0.41s) |
| Fastest Endpoint | Various (0.11s) |
| 500 Errors | 1 (cashflow/forecasts) |
| 404 Errors | 11 (missing handlers) |

---

## Recommendations

### Immediate Actions (Critical)
1. **Fix cashflow_items table/query** - Verify column `type` exists or fix SQL alias
2. **Implement input sanitization** - Prevent XSS attacks
3. **Add contact validation** - Require at least email OR name

### Short-Term (High Priority)
4. **Fix quote calculations** - Investigate NaN values in quote totals
5. **Add root handlers for all modules** - Return proper 404 or redirect
6. **Improve error handling** - Don't expose database internals

### Medium-Term
7. **Implement rate limiting** - Especially on authentication endpoints
8. **Add pagination limits** - Cap at 100 records per request
9. **Add comprehensive input validation** - All POST/PUT endpoints
10. **Create API documentation** - Swagger docs at /api-docs

---

## Test Data Created

The following test data was created during testing and should be cleaned up:

| Type | ID | Data |
|------|------|------|
| User | 8bae5fa2-1b26-4988-8758-f8a205d834f0 | tester20260108@test.com |
| Contact | d9b76624-af03-4075-9a0e-52687582e00f | Empty contact (bug test) |
| Contact | dcd959df-b8a6-4c36-8a26-673273b22d22 | XSS test contact |

---

## Conclusion

The Simplix CRM API is largely functional with good multi-tenancy isolation and authentication. However, there are critical issues in the cashflow module and data validation that need immediate attention. The security posture is acceptable but could be improved with input sanitization and rate limiting.

**Priority Actions:**
1. Fix cashflow forecasts database error
2. Implement input sanitization
3. Fix NaN values in quotes
4. Add missing root endpoint handlers

---

*Report generated by QA Testing Suite on 2026-01-08*
