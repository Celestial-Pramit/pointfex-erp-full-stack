<div align="center">

# Pointfex ERP (`v4.2.0`)

<a href="https://erp.pointfex.com/">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=18&duration=3000&pause=1000&color=38BDF8&center=true&vCenter=true&width=760&lines=Pointfex+ERP+v4.2.0+%E2%80%94+Production+Release;Zero-Trust+PBAC+%7C+Executive+Voting+Consensus;Event-Sourced+XP+Ledger+%26+Pure+KPI+Engine;Serverless+Architecture+on+Vercel+%2B+Neon+PostgreSQL" alt="Typing SVG" />
</a>

<br/>

![Version](https://img.shields.io/badge/RELEASE-v4.2.0-0284c7?style=for-the-badge&logo=semanticrelease&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/LICENSE-PROPRIETARY-b91c1c?style=for-the-badge&logo=shield&logoColor=white)

<br/>

**High-Assurance Enterprise Resource Planning & Performance Governance**  
*Engineered by the Pointfex ERP Engineering Team*

[Live Portal](https://erp.pointfex.com/) • [Architecture](#1-system-architecture) • [Capabilities](#2-key-capabilities) • [Git & PR Policy](#4-git-workflow--pull-request-policy) • [Documentation](#7-documentation-catalog)

</div>

---

## Overview

**Pointfex ERP (`v4.2.0`)** is a production-grade, Zero-Trust Enterprise Resource Planning platform built with **NestJS + TypeScript + Prisma + PostgreSQL (Neon)** and **React 19 + TypeScript + Vite + Tailwind CSS**.

Engineered for strict organizational governance, server-enforced role tiers, executive voting consensus, maker-checker segregation of duties (SoD), time-boxed authority delegations, tamper-evident SHA-256 audit logging, a hierarchical KPI & XP gamification engine, and resilient serverless deployment on Vercel.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser (React 19 SPA)"]
        C1["Cross-Tab BroadcastChannel Logout Sync"]
        C2["30-Min Idle Timeout + 60s Warning Modal"]
        C3["Unified Token Design System & Reactive State"]
    end

    subgraph Edge["Vercel Edge / SPA Router"]
        E1["SPA Fallback: /index.html (no-cache)"]
        E2["Static Assets: /assets/* (immutable 1 yr)"]
        E3["API Rewrites: /api/(.*) -> Backend Origin"]
    end

    subgraph API["NestJS Serverless API Engine"]
        A1["Auth Guards: JwtAuth | FreshMfa (±1 TOTP) | Dynamic PBAC"]
        A2["KPI & XP Suite: Pure KPI Engine | Event-Sourced XP Ledger | Advisory Locks"]
        A3["Governance: Tier Ceiling | CEO Direct Power | Executive Voting (>50%)"]
        A4["Security: Automated Weekly Sweep | Domain Allowlist | SHA-256 Audit Chain"]
    end

    subgraph DB["PostgreSQL (Neon Serverless)"]
        D1["Runtime Pool: PgBouncer (pointfex_app)"]
        D2["Direct Owner URL: Additive Prisma Migrations"]
    end

    Client -->|"HTTPS / HttpOnly SameSite=Strict Cookies + MFA Headers"| Edge
    Edge --> API
    API --> DB
```

---

## 2. Key Capabilities

### A. Pointfex KPI & XP Governance Suite
- **Hero Analytics Placement:** Dynamic KPI Trend Line Graph and Career XP Stacked Bar Chart rendered in the top hero segment across all role dashboards (Developer, PM, C-Level, CEO).
- **Pure Mathematical Engine (`backend/src/performance/kpi-engine/`):**
  - Decoupled, dependency-free TypeScript engine operating with deterministic precision and verified mathematical parity.
  - **Level 1 (Developers):** 50% PM, 15% CTO, 15% CPO, 10% CFO, 10% CHRO with auto-drafted C-Level scores requiring read-receipt confirmation. Context multipliers: Main Squad (`100%`), Outside Squad (`70%`), Isolated Executive Task (`50%`).
  - **Level 2 (Project Managers):** 30% CTO, 30% CPO, 20% CFO, 20% CHRO based on squad outcomes. PMs earn XP strictly from macro project milestones upon C-Level sign-off.
  - **Level 3 (C-Level):** 40% Macro Goals, 30% Domain Execution, 20% CEO Review, 10% Peer Synergy.
  - **Level 4 (CEO):** 60% Company Performance, 40% C-Level Aggregate.
- **Event-Sourced XP Ledger (`xp_ledger_entries`, ADR-001 Option A):**
  - Immutable event records (`AWARD_PENDING`, `VERIFY_RELEASE`, `FREEZE`, `RELEASE_FROZEN`, `REVERSAL`, `ADJUSTMENT`).
  - Concurrency protection via PostgreSQL transactional advisory locks (`pg_advisory_xact_lock(hash(userId))`), guaranteeing gap-free sequences and per-employee SHA-256 hash chains.
  - Materialized projections cached in `xp_balances` with automated drift verification.
- **Frozen-XP Consensus Quorum (`FrozenXpConsensusService`):**
  - High-value XP awards ($\ge 200\text{ XP}$) open a 7-day executive consensus request.
  - Quorum rule: strictly $> 50\%$ of active eligible C-Suite seats (`CTO`, `CPO`, `CFO`, `CHRO`), excluding proposer and beneficiary, with double-vote prevention and fresh MFA.
- **CHRO Task Weight Gate & Disciplinary Governance:**
  - Tasks with proposed weights require formal CHRO pre-verification prior to XP release.
  - Disciplinary deductions ($1 \le p \le 100$) require legal/HR reference documentation and generate compensatory reversal entries if contested.
  - Discretionary cash inputs removed from CHRO consoles in favor of structured Commendation XP (`+10`, `+25`, `+50`, `+100 XP`) and KPI percentage points.
- **Automated Idempotent Weekly Sweep (`/api/cron/sweep`):**
  - Evaluates `Asia/Dhaka` calendar weeks (Monday 00:00 to Sunday 23:59:59.999 UTC+6).
  - Flags zero-deliverable staff as `NA` (`INACTIVE`), enqueues one FIFO inactivity penalty (10% deduction on next deliverable), audits hash-chain integrity, and reconciles balance drift.
- **Company Leaderboard (`/leaderboard`):**
  - Universal read access across all tiers with strict data minimization (strips financial data and normalizes inactive states to `0.00` and `0 XP`).

### B. Zero-Trust Governance, Tiers & Access Control
- **Strict Role-View Synchronization:** `access-control` and the Role Capability Matrix are scoped exclusively to `CEO` and root administrators (`roles:read`, `roles:create`, `system:root`).
- **Four-Tier Authority Ceiling:** `CEO` (`system:root`) > `EXECUTIVE` (C-Level) > `MANAGER` (PM/Lead) > `STAFF` (Dev/Ops). Enforced server-side—actors may only inspect or modify personnel in a **strictly lower tier**.
- **Immutable CEO Anchor:** Exactly one active `system:root` holder (`emp_ceo_01`) exists and cannot be deleted, suspended, demoted, or transferred via application endpoints (`CEO_TRANSFER_ENABLED=false`).
- **CEO Direct Authority:** CEO actions apply immediately without approval queues, gated by fresh 6-digit MFA, audit logging, and history tracking.
- **Executive Voting Engine (`VoteEngineService`):** Eligible `votes:cast` holders vote with fresh MFA bound to the request ID. Finalizes `APPROVED` at $> \lfloor N/2 \rfloor$, rejects early when unreachable, and auto-expires at `voteDeadline` (default 7 days).
- **Project Creation Stepper & Proposals:** 5-step wizard serves as the single source of truth for initial project budgets (BDT). Developers can submit proposals for PM triage or route confidential grievances directly to HR leadership.
- **Session Hardening:** Shared `MfaConfirmModal` (±1 step TOTP tolerance with single-use replay protection), 30-minute idle timeout, and `BroadcastChannel('pointfex-auth')` cross-tab logout sync.

---

## 3. Role & Access Matrix

| Function | CEO (`system:root`) | Executive (C-Level) | Manager (PM / Lead) | Staff (Dev / Ops) |
| :--- | :---: | :---: | :---: | :---: |
| **Authority Tier** | `CEO` | `EXECUTIVE` | `MANAGER` | `STAFF` |
| **People Directory** | Full Profile & History | Full Profile & History | Minimal DTO + Squad | Minimal Public DTO |
| **Inspect Access Details** | Anyone | Lower Tiers (Read-Only) | Assigned Squad (Read-Only) | Self Only |
| **Access History Ledger** | Full Read & Export | Full Read & Export | Denied (`403`) | Denied (`403`) |
| **Role Assignment / Revoke** | Direct (Immediate) | Request-Only (Lower Tiers) | None | None |
| **Role Capability Matrix** | Full Management | None | None | None |
| **Delegation Controls** | View All & Revoke Any | Delegate Held & Revoke Own | Receive Only | Receive Only |
| **Edit Name & Work Email** | Direct (MFA + Audit) | None | None | None |
| **Teams & Squads** | Manage Mode | Manage Mode | Read-Only (Assigned) | Read-Only (Assigned) |
| **Project Creation** | Direct / Stepper | Stepper & Cast Vote | Request-Only | Submit Proposals |
| **Executive Voting Engine** | Override (MFA + Reason) | Cast Vote (`votes:cast`) | None | None |
| **Company Leaderboard** | Public Read (`0.00`/XP) | Public Read (`0.00`/XP) | Public Read (`0.00`/XP) | Public Read (`0.00`/XP) |

---

## 4. Git Workflow & Pull Request Policy

> **Strict Policy:** All development work **must** branch off `dev` and open Pull Requests targeting **`dev` ONLY**. Direct pushes to `main` and PRs opened directly against `main` are strictly prohibited.

### Branching Architecture
- **`main`** — Production release branch. Always deployable. Updated exclusively via verified release PRs from `dev` approved by the Project Manager / Release Lead.
- **`dev`** — Primary integration branch. All feature, bugfix, refactor, and documentation PRs must target `dev`.
- **Working Branches** — Created from the latest `dev` using structured prefixes:
  `feat/<name>` • `fix/<name>` • `chore/<name>` • `docs/<name>` • `refactor/<name>`

### Standard Contribution Flow
```bash
# 1. Always sync with the latest dev branch first
git checkout dev
git pull origin dev

# 2. Create your working branch from dev
git checkout -b feat/your-feature-name

# 3. Commit using Conventional Commits
git commit -m "feat(kpi): add weekly sweep drift verification"

# 4. Run full local verification before pushing
npm --prefix backend test -- --runInBand
npm --prefix backend run build
npm --prefix frontend run verify

# 5. Push and open a Pull Request targeting: base = dev
git push -u origin feat/your-feature-name
```

---

## 5. Environment Variables

<details>
<summary><strong>Click to expand Backend (<code>backend/.env</code>) & Frontend (<code>frontend/.env</code>) Configuration</strong></summary>

### Backend (`backend/.env`)
```bash
# --- Application ---
NODE_ENV="production"
PORT=3000
FRONTEND_URL="[https://erp.pointfex.com](https://erp.pointfex.com)"

# --- Database (Neon) ---
DATABASE_URL="postgresql://pointfex_app:PASSWORD@ep-xyz-pooler.neon.tech/pointfex_erp?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://db_owner:PASSWORD@ep-xyz.neon.tech/pointfex_erp?sslmode=require"

# --- Authentication & Session Hardening ---
JWT_SECRET="<generate-random-64-character-string>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_DAYS="7"
COOKIE_SECURE="true"
COOKIE_SAME_SITE="strict"

# --- Governance & Security Invariants ---
CEO_TRANSFER_ENABLED="false"
CRON_SECRET="<generate-random-32-character-secret>"
VOTE_DEADLINE_DAYS="7"
AUTHZ_MODE="enforce"
PBAC_MODE="enforce"
CORS_ORIGIN="[https://erp.pointfex.com](https://erp.pointfex.com)"

# --- Email & OAuth ---
RESEND_API_KEY="re_..."
MAIL_FROM="Pointfex ERP <no-reply@pointfex.com>"
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="[https://backend-erp-pointfex.vercel.app/api/auth/google/callback](https://backend-erp-pointfex.vercel.app/api/auth/google/callback)"
```

### Frontend (`frontend/.env`)
```bash
VITE_API_BASE_URL="/api"
```

</details>

---

## 6. Deployment & Production Operations

### Additive Database Migrations (Neon)
```bash
cd backend && npx prisma migrate deploy
```
> Never execute `prisma migrate reset` or `prisma migrate dev` against production.

### Google OAuth 2.0 Redirect URI
Register in **Google Cloud Console → Credentials → OAuth 2.0 Web Client**:
```text
[https://backend-erp-pointfex.vercel.app/api/auth/google/callback](https://backend-erp-pointfex.vercel.app/api/auth/google/callback)
```

### Verification Suite
```bash
npm --prefix backend test -- --runInBand   # Backend unit, integration & governance suites
npm --prefix backend run build             # Backend production build
npm --prefix frontend run verify           # Frontend typecheck, lint, tests & Vite build
```

---

## 7. Documentation Catalog

| Document | Scope |
| :--- | :--- |
| [docs/README.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/README.md) | Master Documentation Portal & Architecture Index |
| [docs/KPI_XP_SYSTEM_MANUAL.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/KPI_XP_SYSTEM_MANUAL.md) | KPI & XP Engine Manual (Formulas, Sweeps, Consensus) |
| [docs/kpi-xp/](https://github.com/pointfex/pointfex-erp-full-stack/tree/main/docs/kpi-xp) | Core Engine Specs: ADR-001 (Ledger), Architecture, SRS & Parity |
| [docs/authorization.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/authorization.md) | PBAC Architecture, Dynamic Roles, MFA Guards & Delegations |
| [docs/permissions_master.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/permissions_master.md) | Complete 606+ granular permission catalog across 21 modules |
| [docs/api.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/api.md) | Backend REST API endpoints and payload reference |
| [docs/security-runbook.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/security-runbook.md) | Key rotation, emergency CEO MFA reset CLI & incident response |
| [docs/vercel-deployment.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/docs/vercel-deployment.md) | Vercel deployment, Cron sweep & OAuth configuration |
| [docs/archive/](https://github.com/pointfex/pointfex-erp-full-stack/tree/main/docs/archive) | Historical phase audits and migration notes |

---

## 8. Security Policy

Security vulnerabilities must **not** be reported through public GitHub Issues. Follow the responsible disclosure process in [SECURITY.md](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/SECURITY.md) or contact the Pointfex Security & Engineering team directly.

---

## 9. License

**Proprietary & Confidential — Copyright (c) 2026 POINTFEX. All Rights Reserved.**

Unauthorized copying, modification, distribution, sublicensing, commercial use, or deployment of this software, via any medium, is strictly prohibited without prior express written permission from POINTFEX. See [LICENSE](https://github.com/pointfex/pointfex-erp-full-stack/blob/main/LICENSE) for full terms.
