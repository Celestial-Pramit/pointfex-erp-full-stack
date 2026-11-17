# Frontend Audit & Design System Inventory

**Document**: `docs/_work/FRONTEND_AUDIT.md` (Temporary - Stage A Audit)  
**Date**: November 17, 2026  
**Version**: 4.0.0-draft  

---

## 1. Inventory of Routes, Pages & Roles

### 1.1 Existing Pages by Role Scope

| Area / Module | Route Key | Component | Intended Roles / Permissions | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Home** | `dashboard` | `DynamicDashboardPage` | All Authenticated Users | Implemented, needs Phase 4 hero chart refresh |
| **My Work** | `inbox` | `UnifiedInboxPage` | All Authenticated Users | Implemented, needs executive review & vote cards |
| | `tasks` | `DeveloperTasksPage` / `PmTasksPage` / `CtoTasksPage` | Dev, PM, CTO | Fragmented across 3 role components |
| | `earnings` | `DeveloperEarningsPage` / `PmEarningsPage` / `CtoEarningsPage` | Dev, PM, CTO | Fragmented; lacks ledger cursor pagination |
| | `report` | `DeveloperReportPage` | Developer | Implemented |
| | `settings` | `MyAccountPage` | All Authenticated Users | Contains leftover KPI/XP cards (violates security-only) |
| **People** | `people` | `CtoPeoplePage` | Executives, HR, Admin | Implemented (CTO-branded) |
| | `team` | `DeveloperTeamPage` | Developer | Squad roster view |
| | `team-management` | `CtoTeamManagementPage` / `PmTeamManagementPage` | CTO, PM | Squad management |
| | `performance` | `ChroPerformancePage` | CHRO, CEO | Lacks disciplinary, backfill window, and config management |
| **Projects & Delivery** | `projects` | `PmProjectsPage` / `DeveloperProjectsPage` | Dev, PM | Fragmented |
| | `projects-repos` | `CtoProjectsReposPage` | CTO | Repository list |
| | `task-management` | `CtoTaskManagementPage` / `PmTaskManagementPage` | CTO, PM | Lacks weight proposal & backfill window timer |
| | `project-requests` | `ProjectRequestsPage` | Executives | Multi-step request engine |
| | `proposals` | `ProposalsPage` | Executives | Project proposals |
| | `my-requests` | `MyRequestsPage` | All Users | Personal proposal tracker |
| **Finance** | `budget` | `CfoBudgetPage` | CFO, Executives | Budget allocation |
| | `budget-finance` | `PmBudgetFinancePage` | PM | Squad budget tracking |
| **Governance & Access** | `access-control` | `CeoRoleMatrixPage` | CEO (`system:root`) | Dynamic RBAC / PBAC matrix |
| | `login-access` | `LoginAccessPage` | CEO, Admin | Allowlist management |
| | `security-overview` | `SecurityOverviewPage` | Security, Admin | MFA status and security metrics |
| | `access-history` | `AccessHistoryPage` | Audit, Admin | Session and access review |
| | `delegations` | `DelegationCenterPage` | All Users | Delegation grant and revoke |
| | `audit-log` | `CtoAuditLogPage` | CTO, Security | Security audit logs (not KPI/XP ledger) |
| **Engineering / Quality** | `code-quality` | `CtoCodeQualityPage` | CTO | Sonar / coverage metrics |
| | `security-testing` | `CtoSecurityTestingPage` | CTO | Pentest / vulnerability tracker |
| | `consultancy` | `CtoConsultancyPage` | CTO | Advisory engagements |
| **Reports** | `reports` | `CtoReportsPage` / `PmReportsPage` | CTO, PM | Report triage |

---

## 2. Missing Pages for Backend Features

The backend delivers extensive Phase 1–4 capabilities with zero frontend representation:

1. **Company Leaderboard (`/leaderboard`)**:
   - Backend: `GET /api/performance/leaderboard` (`leaderboards:read`).
   - Gap: No public leaderboard view exists. Users cannot toggle Lifetime XP, Latest Week KPI, or 4-Week Average, nor filter by squad or role.
2. **My Performance (`/my-performance`)**:
   - Backend: `GET /api/performance/kpi/me`, `GET /api/performance/xp/me`, `GET /api/performance/ledger/me`.
   - Gap: Dedicated employee standing dashboard is absent. Employees cannot inspect their weekly KPI formula breakdown, provisional vs official badges, active inactivity penalty notice, or next deliverable penalty explanation.
3. **Performance Ledger & Audit Log Inspector (`/performance/ledger`)**:
   - Backend: `GET /api/performance/ledger/:userId`, `GET /api/performance/ledger/export`.
   - Gap: Scoped ledger inspector is missing. PMs cannot inspect squad members; executives cannot inspect company accounts with cursor pagination, +/- colored deltas, before/after states, and CSV/JSON export.
4. **PM Backfill Tool & Live Window Countdown**:
   - Backend: `decideBackfill()`, `BackfillWindow`.
   - Gap: PM task management lacks backfill grace period indicators, countdown to `2026-11-19 23:59:59 Asia/Dhaka`, and backfill validation feedback.
5. **CHRO Performance Console Extensions**:
   - Backend: Disciplinary deductions with legal doc reference, disciplinary reversal, consensus voting, config editor (`TaskWeightConfig`, `KpiConfig`), backfill windows manager.
   - Gap: `ChroPerformancePage` only has basic mock evaluation inputs; missing production governance controls.
6. **Executive Scoring & Consensus Voting Inbox**:
   - Backend: `GET /api/performance/exec-scores/inbox`, `POST /api/performance/tasks/weight-verification/:id/vote`, PM weekly evaluations, C-level peer synergy.
   - Gap: Executives have no unified review queue to confirm provisional scores or cast consensus votes.

---

## 3. Broken, Dead, & Inconsistent Routes

1. **Dead Route: `procurement-ops`**: Registered in `nav-registry.ts` (id: `procurement-ops`), but has no route handler in `App.tsx` and renders `AccessDeniedPage` or falls through to 404.
2. **Fragmented Role Pages**: Tasks, earnings, reports, and teams are duplicated across `developer/`, `pm/`, and `cto/` folders with 80% copy-pasted UI markup and divergent CSS classes.
3. **Leftover KPI/XP in Account**: `MyAccountPage.tsx` retains stale mock KPI/XP widgets, violating the security-only profile mandate.

---

## 4. UI Inconsistencies & Design System Audit

1. **Style Drift**: Several pages use hardcoded Tailwind colors (`text-emerald-500`, `bg-slate-900`, `text-indigo-600`) instead of semantic CSS tokens (`var(--surface)`, `var(--border)`, `var(--text)`, `var(--primary)`).
2. **Missing Components**:
   - `ErrorState`: Error boundaries and API catch blocks fall back to basic text alerts.
   - `Stepper`: Multi-step requests and task lifecycles lack a visual progress stepper.
   - `Tooltip`: Tooltips on complex KPI components are ad-hoc title attributes.
   - `DateRangePicker`: Date range filtering in logs and ledgers is done with twin input fields.
3. **Accessibility**:
   - Missing `aria-expanded` and `aria-haspopup` on several dropdowns.
   - Focus rings on dark mode in custom inputs are frequently suppressed without replacement.
4. **Mobile (360px viewport)**:
   - Several multi-column tables in `ChroPerformancePage` and `CtoPeoplePage` cause horizontal page-level overflow instead of localized scroll.
   - Modal action buttons overflow viewports under 400px.

---

## 5. Target Design System & Component Library

### 5.1 Token Architecture (`frontend/src/design/tokens.css`)
- **Surfaces**: `--bg`, `--surface`, `--surface-muted`, `--border`
- **Text**: `--text`, `--muted`
- **Palette**: `--primary`, `--success`, `--warning`, `--danger`, `--info` (with `-soft` alpha tokens)
- **Radii**: `--radius-card` (12px), `--radius-control` (8px)
- **Elevations**: `--shadow-soft`

### 5.2 Shared Component Suite
1. `Button` (primary, secondary, danger, ghost; xs, sm, md, lg; loading state)
2. `Input` / `Select` / `MoneyInput` / `DatePicker` / `DateRangePicker`
3. `Modal` / `Drawer` / `ConfirmDialog` / `MfaConfirmModal`
4. `DataTable` (sortable headers, virtualized rows, pagination controls, search bar)
5. `Tabs` (pill and underline variants)
6. `Badge` / `StatusPill` (semantic color mapping)
7. `Card` / `StatCard`
8. `Toast` (with `useApp().showToast`)
9. `Skeleton` / `SkeletonCard` / `SkeletonTable`
10. `EmptyState` / `ErrorState`
11. `Stepper` (numbered and icon variants)
12. `Tooltip` (accessible hover & focus overlay)

---

## 6. Target Page Map (Role-Aware Navigation)

```
├── Home (All Roles)
│   ├── My Day (Dashboard) [KPI Trend Line, XP Stacked Bar, Role Cards]
│   ├── Leaderboard [Lifetime XP, Latest KPI, 4-Week Average]
│   └── My Performance [Current Week Breakdown, XP Balances, Inactivity Penalties]
├── My Work (Staff & All Roles)
│   ├── Needs My Action (Unified Inbox) [Approvals, Reviews, Consensus Votes]
│   ├── My Tasks [Sprint Deliverables, Status Transitions, Submit Work]
│   ├── My Ledger [Cryptographic Audit Log, Colored Deltas, CSV Export]
│   ├── Submissions & Leave [Grievances, Ideas, Leave Requests]
│   └── Delegations [Grant & Revoke Temporary Powers]
├── Squad & Projects (Manager / PM / Dev)
│   ├── Squad Workspace [Roster, Health, Assigned Deliverables]
│   ├── Project Delivery [Projects, Milestones, Milestone XP Proposals]
│   └── Task Management & Backfill [Weight Proposals, Backfill Countdown Tool]
├── Executive Consoles (Role-Gated)
│   ├── Executive Inbox (CTO, CPO, CFO, CHRO) [Read-Receipt Confirm/Adjust, Votes]
│   ├── CHRO Console (CHRO, CEO) [Weight Queue, Disciplinary, Config, Backfill Windows]
│   ├── CFO Console (CFO, CEO) [Budget Allocation, Payroll, Financial Statements]
│   ├── CTO Console (CTO, CEO) [Code Quality, Security Testing, Repositories]
│   └── Governance & Security (CEO, Admin) [Role Matrix, Login Access, Security Overview]
└── Account (All Roles)
    └── Profile & Credentials [Security, MFA Enrollment, Password Reset]
```
