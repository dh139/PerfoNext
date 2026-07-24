# EPTS — QA Automation & Full-Stack Audit Report

**Date:** 2026-07-24
**Scope:** `backend/` (Node.js/Express/MongoDB) + `frontend/` (React/Vite/Tailwind)
**Method:** Full data model & controller/route review, a purpose-built enterprise-scale seed script, 26+ scripted live API tests across all 5 roles, and browser-driven UI verification against the running dev stack (local MongoDB, `localhost:5000` / `localhost:5173`).

---

## 1. Project Completion Percentage

### **≈ 88% complete against full enterprise EPTS requirements**

| Area | Status |
|---|---|
| Auth, RBAC middleware, JWT refresh | ✅ Complete |
| KPI Templates (dept-scoped + org-wide, active/archived) | ✅ Complete |
| Review Cycles (monthly/quarterly/annual, targetRole, auto-close) | ✅ Complete |
| Self-Assessment → Manager Review → Score pipeline | ✅ Complete, formula verified correct |
| Role dashboards (Employee/Manager/HR/Admin/Executive) | ✅ Complete |
| Department Reports & Completion Reports | ✅ Complete, isolation enforced |
| AI Performance Insights (Groq + local fallback, caching) | ✅ Functionally complete, **auth bug on regenerate** |
| PIP / Promotions / Recognitions / 360 Feedback / Skill Matrix | ⚠️ Functional, but **backend department-isolation gaps** (see §3) |
| Certifications (upload, PDF extraction, active-cycle lock) | ✅ Complete |
| Attendance/LMS integration stubs, Audit Log, Notifications | ✅ Present and working |
| Error handling / input validation consistency | ⚠️ Gaps — several endpoints return 500 instead of 400/404 |

The core review-cycle and scoring engine is robust and well-designed (the scoring math, eligibility-by-joining-date logic, and AI-insight caching all matched their spec exactly under test). The deductions are concentrated in **backend enforcement of department boundaries** on a handful of write endpoints, and a handful of **error-handling / authorization consistency** gaps — not missing features.

---

## 2. Test Data Seeded

A new script, [`backend/scripts/seedE2ETestData.js`](backend/scripts/seedE2ETestData.js), was written and executed against the local dev database (`mongodb://127.0.0.1:27017/epts`). It is idempotent (full clean-slate wipe + reseed) and produced:

| Entity | Count |
|---|---|
| Departments | 6 (Engineering, Sales & BD, Human Resources, Finance, Product & Design, Operations) |
| Designations | 12 (2 per department) |
| Users | 42 (1 CEO, 1 Admin, 1 HR, 6 Reporting Managers, 33 Employees) |
| KPI Templates | 8 (1 org-wide + 6 dept-specific active + 1 archived) |
| Review Cycles | 20 (12 closed monthly across 2026-05/06 per dept, 6 active employee cycles for 2026-07, 1 active CEO-initiated manager cycle, 1 draft) |
| Self-Assessments / Manager Reviews / Review Scores | 76 / 60 / 60 |
| Attendance records | 120 (2026-05/06/07 for all staff, with deliberately low-attendance outliers) |
| Certifications | 12 | Recognitions | 10 | PIPs | 6 (active/closed/escalated) |
| 360 Feedback Requests / Responses | 18 / 12 (mix of submitted & pending) |
| Skills / Employee Skill Ratings | 12 / 36 | Promotions | 3 |

Login credentials (all seeded, password per role):
`ceo@epts.com` / `CeoPass123!` · `admin@epts.com` / `AdminPass123!` · `hr@epts.com` / `HrPass123!` · department managers (e.g. `aadarsh.patel@epts.com`) / `ManagerPass123!` · all employees / `EmpPass123!`.

Performance profiles (`high`/`mid`/`low`) were assigned per employee so score trends, PIP triggers, and attendance-driven AI turnover-risk are all realistic rather than random noise.

---

## 3. Identified Bugs / Edge Cases (verified, ranked by severity)

### 🔴 HIGH

**#1 — Department isolation for Recognitions, Promotions, and Skill "Manager Rating" is frontend-only.**
`POST /api/recognitions`, `POST /api/promotions`, and `POST /api/employee-skills` (setting `managerRating`) perform **no server-side check** that the target employee is in the acting manager's department. The dropdown filtering in `RecognitionsWorkspace.jsx`, `PromotionsWorkspace.jsx`, and `SkillMatrix.jsx` is the *only* enforcement.
**Verified live:** logged in as the Engineering Reporting Manager and, via direct API call, successfully (a) awarded a recognition to a Sales & BD employee, (b) proposed a promotion for a Sales & BD employee, and (c) set an official manager-validated skill rating for a Sales & BD employee — all `200`/`201`, none blocked.
→ Fix: add the same department-ownership check used in `reportController.getDepartmentReport` to these three controllers.

**#2 — IDOR: cross-department individual employee report & AI insights leak.**
`GET /api/reports/employee/:id` and both AI-insight GET routes only block the `employee` role from viewing someone else's record — there's no check that a `manager` caller is actually that employee's manager or shares their department.
**Verified live:** the Engineering manager fetched a Sales & BD employee's full performance report and AI-generated insights (summary, strengths, attrition risk) purely by knowing/guessing the ID.
→ Fix: extend the ownership check already present in `reportController.getEmployeeReport` (currently only guards `role==='employee'`) to also validate manager→direct-report or manager→own-department relationships.

**#3 — "Regenerate AI Report" button is broken for Reporting Managers and the CEO.**
`EmployeeReport.jsx` shows the button whenever `user.role !== 'employee'` (so HR, Admin, Manager, **and Executive**), but `routes/api.js` restricts `POST .../insights/regenerate` to `authorizeRoles('admin', 'hr')` only.
**Verified live in the browser:** logged in as a Reporting Manager, clicked "Regenerate AI Report" → network call fires → backend returns `403 Forbidden` ("Role (manager) is not authorized...") → surfaced to the user as an error toast. Confirmed the same 403 for the CEO/executive role via API.
→ Fix: add `'manager', 'executive'` to the route's `authorizeRoles(...)` list (matches the GET-insights route, which already allows all four roles).

### 🟡 MEDIUM

**#4 — Malformed ObjectId params crash to HTTP 500 instead of 400/404.**
`reportController.getReviewCompletionReport`, `reportController.getEmployeeReport`, and likely other `findById`-based handlers don't validate ID format before querying. An invalid id throws an uncaught Mongoose `CastError`, caught only by the generic `catch`, returning a raw `500 Internal Server Error`.
**Verified:** `GET /api/reports/review-completion?reviewCycleId=not-a-valid-objectid` → `500`. Same for `/api/reports/employee/not-a-valid-objectid`.
→ Fix: validate `mongoose.isValidObjectId(id)` up front (or add a small middleware) and return `400`.

**#5 — `POST /api/users` returns 500 on validation errors instead of 400.**
`userController.createUser` doesn't pre-check conditionally-required fields (e.g. `designationId`, required for all roles except admin/executive); it lets the Mongoose `ValidationError` bubble into the generic catch, which returns `500`.
**Verified:** creating an employee without `designationId` → `500 {"message":"User validation failed: designationId: Path designationId is required."}`.
→ Fix: either pre-validate required fields explicitly (as `uploadCertification` already does) or detect `error.name === 'ValidationError'` in the catch block and return `400`.

### 🟢 LOW

**#6 — KPI item `weight` field is decorative.** `KpiTemplate` items expose an editable `weight`, but `utils/scoring.js` computes the final score using hard-coded category weights and never reads `item.weight`. HR configuring per-item weights in the KPI Template editor has zero effect on actual scores — worth either wiring it in or removing the field from the authoring UI to avoid misleading admins.

**#7 — AI-insight response is missing `generatedAt` on first generation.** `generateAndSaveInsights` returns `{ ...parsed, status: 'COMPLETED' }` (no `generatedAt`); only a subsequent cache-hit read includes it (`cachedReport.generatedAt`). Verified via API: first-generation response had `generatedAt: undefined`, the immediate re-fetch had a real timestamp. If the UI ever surfaces "last generated" immediately after a fresh generation, it will show blank until reload.

**#8 — Minor copy deviation:** the "Reporting Manager" badge (emerald, bold, correctly shown for manager/hr/executive rows in `CompletionReport.jsx` and `DepartmentReports.jsx`) renders as `Reporting Manager`, not the bracketed `[REPORTING MANAGER]` format — cosmetic only.

---

## 4. Passed Tests (verified working correctly)

- **Cycle auto-closure boundary** — a cycle ending "today" correctly stays `active`; one that ended "yesterday" correctly flips to `closed` on the next `autoCloseExpiredCycles()` call. Boundary is precisely `23:59:59.999 UTC` as required.
- **AIReport uniqueness & freezing** — compound unique index on `(employeeId, reviewCycleId)` confirmed in schema; repeated `GET` calls return the identical cached report (`generatedAt` unchanged) with **no** re-invocation of the LLM; `POST .../regenerate` correctly deletes the cache and forces a fresh evaluation (verified for HR).
- **CEO cycle-creation default** — `POST /review-cycles` without `targetRole`, called by `executive`, correctly defaults to `targetRole: 'manager'`; called by HR/Admin, correctly defaults to `'employee'`.
- **Employees excluded from CEO manager-cycles** — an employee's dashboard `pendingSelfAssessments` correctly omits the manager-targeted active cycle.
- **CEO can complete manager evaluations** for Reporting Managers, and has full unrestricted access to every department's report (Engineering ✅, Sales ✅).
- **Department isolation on `/reports/department/:id`** — Reporting Manager gets `200` for their own department, `403 Forbidden` for any other department. Frontend department selector is correctly hard-locked to a single option for managers.
- **Frontend staff-selection dropdowns** (Recognitions, PIP, Promotions, Skill Matrix, Certifications) are all correctly filtered to the manager's own department client-side (see Finding #1 for the missing server-side counterpart).
- **Certificate/Award lock when no active cycle** — verified live: with all cycles temporarily closed, both certificate upload and recognition award correctly return `400`; the UI correctly shows the amber "cannot add" banner and disables the action buttons; both correctly re-enable once a cycle is reactivated.
- **Employee self-service boundaries** — an employee gets `403` viewing another employee's report, `200` viewing their own.
- **Scoring formula** — end-to-end verified in the browser: self-vs-manager gap analysis, category breakdown, and the blended "External Score" (attendance + certifications + awards) all rendered correctly and matched the underlying `calculateReviewScores` math for seeded data.
- **PIP initiation correctly restricted to Admin/HR** (managers can update their own team's PIP goals but not initiate/close/escalate), matching the spec's ownership model.
- **User/Department management guardrails** — manager blocked (`403`) from creating departments; Administration-department/System-Administrator-designation assignment restricted to admins in `userController`.

---

## 5. Performance & Scalability Assessment

Tested against the seeded dataset (42 users, 60 review scores, 120 attendance records):

| Endpoint | Response time |
|---|---|
| `GET /api/dashboard/stats` (admin/HR/executive view) | **~494 ms** |
| `GET /api/reports/review-completion` (1 dept, 8 employees) | ~82 ms |

**Concern:** `dashboardController.getDashboardData` and `reportController.getReviewCompletionReport` both use **N+1 sequential query patterns** — looping over cycles/employees and `await`-ing 2–3 separate `findOne` calls *per employee, per cycle*, rather than batching with a single `find({ ... $in: [...] })` and mapping in memory. With only 42 users and a handful of active cycles this already costs ~500 ms for the combined HR/Admin/Executive dashboard. At "hundreds of records" scale (the brief's stated target), this pattern will degrade roughly linearly with `employees × active cycles`, and multi-second dashboard loads are likely once the org exceeds a few hundred active users across several concurrently-active cycles.

**Recommendation:** batch-fetch `SelfAssessment`/`ManagerReview`/`ReviewScore` per cycle with `$in` on employee IDs and build lookup maps, instead of one round-trip per employee. This is the single highest-leverage performance fix in the codebase.

No other scalability red flags were observed — indexes exist on the high-traffic foreign keys (`employeeId`, `reviewCycleId`, `departmentId`, etc.), and the AI-insight caching (§4) correctly prevents repeated expensive LLM calls.

---

## Appendix: How to reproduce

```bash
# Reseed enterprise test data (destructive — wipes and rebuilds the local dev DB)
node backend/scripts/seedE2ETestData.js
```

Backend (`localhost:5000`) and frontend (`localhost:5173`) dev servers were already running under the user's existing session throughout this audit; no separate instances were started.
