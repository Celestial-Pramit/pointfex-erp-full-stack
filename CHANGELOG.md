# Changelog

## Version 3.14.0 (Pointfex KPI & XP Governance Suite)
- **Universal Executive Governance Gate**:
  - CEO Supreme Override: Strictly and only requires 6-digit MFA code; all text justification fields and secondary approvals bypassed.
  - CHRO Full Performance Authority: Complete access for CHRO (`2023200000066@seu.edu.bd`) to add, edit, adjust KPI & XP across the enterprise, and modify/annotate immutable audit log records via `PATCH /api/performance/audit-log/:id`.
  - C-Level (CTO, CFO, CPO) and PM Squad authority matrix with MFA verification.
  - Fixed internal server error on XP/KPI override by handling target employee alias resolution, robust role handling, and foreign key integrity.
- **UI/UX Modernization & Theme Alignment**:
  - Top Hero Section KPI Trend Graph with dynamic 0–100 execution curve and prominent red flag/indicator for N/A inactivity weeks.
  - Career XP Stacked Progression Bar mapping volume composition (Small 10 XP, Medium 30 XP, Large 50 XP, Critical 100 XP) and level progression.
  - Full dark-theme compatibility matching Pointfex ERP design tokens (`bg-[var(--surface)]`, `border-[var(--border)]`, `text-[var(--text)]`).
  - Removed XP/KPI cards from User Account/Profile (`MyAccountPage.tsx`) to keep profile focused on security and account credentials.
- **Auditing & Cryptographic Integrity**:
  - SHA-256 chained immutable audit ledger with inline audit entry editing for CHRO & CEO.
  - Comprehensive Jest tests (23 suites, 137 tests passing) and pristine TypeScript type safety.

## Release Candidate 1 (`release-candidate-1`)
- **Auth & Google OAuth**: Fixed `GET /api/auth/google` 302 redirect with PKCE + state + nonce, Vite `/api` proxy navigation, and friendly OAuth error screens.
- **CEO-Only Login Allowlist**: Added `login_allowlist`, `login_blocked_attempts`, `allowlist_email_requests`, default-deny enforcement (`LOGIN_ALLOWLIST_REQUIRED`), and Admin & Governance > **Login access** panel.
- **Allowlist-Driven Onboarding & Resend Mail**: Enforced allowlist-only employee creation, Resend welcome/reset/MFA-reset emails, delivery status tracking, rate-limited resend (`3/hr`), and removed temporary passwords from API responses and UI.
- **Always-MFA & CEO MFA Reset**: Enforced fresh single-use 6-digit TOTP (`X-MFA-Code`) on sensitive/executive mutations, privileged MFA reset rules, Admin & Governance > **Security** tab, and offline `npm run ceo:reset-mfa` CLI.
- **UI/UX & Security Hardening**: Unified **My Account** page, demo-free **LoginPage**, response sanitizer stripping `passwordHash`/`mfaSecret`/`mfaRecoveryCodes`/`temporaryPassword`, `backend/` & `frontend/` folder layout, `/api/health` & `/api/ready`, and updated deployment/security docs.

