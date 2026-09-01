# Product Requirements Document (PRD)
## BudgetBrain — Personal Expense Tracker with Secure Multi-Tenant Authentication

---

## 1. Overview / Introduction

**Product Name:** BudgetBrain

**Tagline:** Your Financial Control Center

**Summary:** BudgetBrain is a personal finance web application that enables users to securely log daily expenses, organize them into custom categories, set spending limits, and instantly monitor their financial health through visual charts, analytics, and dynamic multi-currency conversions — providing a secure, private, and searchable hub for personal money management.

---

## 2. Problem Statement

Most people struggle to track their expenses consistently. They either forget to log transactions or rely on scattered notes and spreadsheets that lack privacy, multi-device security, searchability, or real-time insights.

Because of this, users cannot easily answer three critical financial questions:
- "How much have I spent this month?"
- "Where is my money going across different categories?"
- "Am I within my budget, or over it?"

BudgetBrain solves this by providing an intuitive, secure, and visually appealing web application where each authenticated user enjoys complete privacy and real-time budgeting control over their personal finances.

---

## 3. Product Principles & Architecture

BudgetBrain is built on the following foundational principles:

> **Secure Access & Complete Data Isolation → Rapid Logging (< 30s) → Real-Time Visual Analytics → Strict Anti-Deficit Budget Control**

1. **Production-Ready Security & Multi-Tenancy:** Secure JWT-based authentication with Google Sign-In and complete data isolation between users.
2. **Zero Hardcoded Data:** 100% database-driven from PostgreSQL across all environments.
3. **Frictionless Financial Health:** Eye-comfort color palette, 8-language localization, dynamic multi-currency conversions, and PWA installability.

---

## 4. Goals & Success Metrics

| Goal | Why It Matters |
|------|------------------|
| **Secure User Authentication** | Ensures private personal finance tracking with zero cross-user data leakage |
| **Log an Expense in < 30 Seconds** | Frictionless logging ensures consistent, long-term user retention |
| **Instant Visual Feedback** | Real-time charts (donut breakdown, trend graphs) reveal spending patterns effortlessly |
| **Strict Anti-Deficit Budgeting** | Hard limits and dynamic alerts prevent accidental overspending |
| **Multi-Language & Multi-Currency** | 8 languages and live exchange rate conversions serve a diverse user base |

**Success Metrics:**
- Daily/weekly active users logging expenses
- Zero unauthorized cross-tenant data access incidents (100% data isolation)
- % of users with an active monthly budget goal
- Average time to log an expense (< 30 seconds)
- User retention after 30 days

---

## 5. Target Audience & User Personas

**Who this is for:**
- Individual budget-conscious users who want private, secure, and intuitive expense tracking.
- Users seeking visual insights into their spending habits without complex banking integrations.
- Multilingual and international users requiring native language support and multi-currency conversions.

**Who this is NOT for:**
- Multi-member corporate finance or accounting teams requiring complex role-based access control (RBAC) hierarchies.
- Automated algorithmic investment or algorithmic trading portfolios.

---

## 6. Scope of the Application

### ✅ In-Scope:

#### 1. Authentication & Security
- **Email & Password Sign Up / Registration** with password strength validation and hashing (Argon2 / BCrypt).
- **Email & Password Sign In / Login** with short-lived JWT Access Tokens and HttpOnly Refresh Tokens.
- **Sign In with Google (OAuth 2.0 / OpenID Connect)** with secure backend token validation and automatic account linking.
- **Token Lifecycle:** Short-lived Access Tokens (10–15 min), Long-lived Refresh Tokens (7–30 days) with token rotation, revocation, and secure DB hashing.
- **Secure Logout & Logout from All Devices / Sessions**.
- **Forgot Password, Reset Password, and Change Password** workflows.
- **Strict Multi-Tenant Data Isolation:** Every database resource (`categories`, `expenses`, `budgets`) is strictly scoped by `user_id`. Authorization is derived exclusively from the backend JWT context.
- **Security Hardening:** Rate limiting on auth endpoints, CORS whitelisting, CSRF-protected cookies, and strict input sanitization.

#### 2. Expense Management (Full CRUD)
- Add, view, edit, search, filter, sort, and delete expenses with confirmation dialogs.
- Categorization, notes, payment mode (Cash, Card, UPI, Other), and recurring tagging.
- Real-time budget cap blocking to prevent negative balances.

#### 3. Category Management
- User-scoped dynamic category creation, renaming, and safe deletion (with reassignment to protected "Uncategorized" category).
- Starter categories auto-seeded on new user registration.

#### 4. Budgeting & Financial Guardrails
- Overall monthly spending budget and optional per-category budgets.
- Customizable daily spending limits and real-time warning threshold alerts (e.g. 80%).
- Strict Anti-Deficit protection preventing transactions that exceed remaining budget.

#### 5. Dashboard & Analytics
- Total spend metrics, average daily spend, recent expenses snapshot.
- Interactive charts: Spend Breakdown (Donut/Pie), Spend Trend over Time (Bar/Line), Month-over-Month Comparison, and Top Categories.
- Predictive Monthly Stats Report (projected month-end spend, budget health rating).

#### 6. User Experience, Localization & PWA
- 8-Language localization suite (English, Marathi, Hindi, Gujarati, Marwadi, German, Spanish, French).
- Multi-currency support (INR, USD, EUR, GBP) with live exchange rate integration.
- Responsive design with eye-comfort palette, glassmorphism, Framer Motion animations, and 3D animated Psychology Brain logo.
- Full Progressive Web App (PWA) with service worker caching and custom install prompt.
- CSV export and JSON backup/restore tools.

### ❌ Out-of-Scope:
- Multi-tier Role-Based Access Control (RBAC) / Admin portal (all registered users operate as individual tenants).
- Direct bank account / SMS / UPI scraping or automated transaction crawling.
- Split-bill social sharing between multiple accounts.

---

## 7. Functional Requirements & User Stories

### 7.1 Authentication & User Management (FR-AUTH-1 to FR-AUTH-8)

| ID | Feature | Description | Priority | User Story |
|---|---|---|---|---|
| **FR-AUTH-1** | User Registration | Sign up with email, password, and full name. Passwords hashed using Argon2/BCrypt. | P0 | As a new user, I want to create an account so my personal financial data is securely saved. |
| **FR-AUTH-2** | User Login | Authenticate with email/password; receives short-lived Access Token and secure HttpOnly Refresh Cookie. | P0 | As a registered user, I want to log in securely so I can access my expense records. |
| **FR-AUTH-3** | Google Sign-In | Authenticate with Google OAuth 2.0 / OIDC; backend validates Google token, creates/links account. | P0 | As a user, I want to sign in with Google with one click for faster and frictionless access. |
| **FR-AUTH-4** | Token Refresh & Rotation | Automatically exchange Refresh Token for new Access Token + rotated Refresh Token before expiration. | P0 | As an active user, I want my session to stay smoothly logged in without interrupting my workflow. |
| **FR-AUTH-5** | Secure Logout | Revokes refresh token in database, clears auth cookies, and resets client session state. | P0 | As a user, I want to log out securely so no one else on my device can see my data. |
| **FR-AUTH-6** | Logout All Devices | Revokes all active refresh tokens for the user, terminating sessions across all devices. | P1 | As a user, I want to log out of all devices if I suspect unauthorized access or change my device. |
| **FR-AUTH-7** | Forgot & Reset Password | Request password reset email/token and securely update password with single-use reset token. | P1 | As a user, I want to reset my password if forgotten so I don't lose access to my financial records. |
| **FR-AUTH-8** | Change Password | Authenticated user updates password by providing current password and new password. | P1 | As a user, I want to change my password anytime from my settings to maintain security. |

### 7.2 Multi-Tenant Data Isolation (FR-ISO-1 to FR-ISO-3)

| ID | Feature | Description | Priority | User Story |
|---|---|---|---|---|
| **FR-ISO-1** | Strict Tenant Isolation | Backend derives identity exclusively from JWT context; all queries filter by `user_id`. | P0 | As a user, I want complete data privacy so no other user can view or modify my expenses. |
| **FR-ISO-2** | Cross-User Access Prevention | Attempting to access/edit/delete another user's expense or category returns `404 Not Found` / `403 Forbidden`. | P0 | As a user, I want my financial records protected against unauthorized URL manipulation. |
| **FR-ISO-3** | Auto-Seeded User Data | On registration, default starter categories (Food, Transport, Rent, etc.) and "Uncategorized" are created for the user. | P0 | As a new user, I want ready-to-use starter categories in my account immediately upon sign up. |

### 7.3 Expense Management (FR-2 to FR-5)

| ID | Action | Description | Priority | User Story |
|---|---|---|---|---|
| **FR-2** | Add Expense | Log expense with title, amount, category, date, notes, payment mode, recurring flag. Validates budget cap. | P0 | As a user, I want to quickly add an expense so my spending log stays up to date. |
| **FR-3** | View Expenses | View user-scoped paginated list with sorting, search, and multi-parameter filtering. | P0 | As a user, I want to view my past expenses to understand my spending history. |
| **FR-4** | Edit Expense | Update fields of an existing user-owned expense, validating positive amounts and budget limits. | P0 | As a user, I want to edit expenses to correct mistakes or add notes. |
| **FR-5** | Delete Expense | Delete an expense with a glassmorphic confirmation popup dialog, restoring budget allowance. | P0 | As a user, I want to delete expenses with confirmation so I don't remove records accidentally. |

### 7.4 Category Management (FR-6 to FR-10)

| ID | Action | Description | Priority | User Story |
|---|---|---|---|---|
| **FR-6** | Create Category | Add a custom category; enforced case-insensitive uniqueness per user. | P0 | As a user, I want to create categories tailored to my personal spending habits. |
| **FR-7** | Rename Category | Rename a user-owned category (protected system categories cannot be renamed). | P0 | As a user, I want to rename my categories as my organization preferences evolve. |
| **FR-8** | Delete Category | Delete category with warn-and-reassign flow (reassigns linked expenses to "Uncategorized"). | P0 | As a user, I want to safely delete categories without losing associated expense transactions. |
| **FR-9** | View Categories | List all categories for the user with linked expense counts. | P1 | As a user, I want to see how many expenses belong to each category. |

### 7.5 Search, Filter & Sort (FR-11 to FR-16)

| ID | Capability | Details | Priority | User Story |
|---|---|---|---|---|
| **FR-11** | Text Search | Search title and notes fields (scoped to user). | P1 | As a user, I want to search expenses by keyword to locate specific payments quickly. |
| **FR-12** | Date Filtering | Filter by date range (Today, This Week, This Month, Custom). | P0 | As a user, I want to filter expenses by time period. |
| **FR-13** | Category Filter | Filter expenses by specific category. | P0 | As a user, I want to isolate expenses for one category. |
| **FR-14** | Amount Filter | Min/Max amount range filter (currency-aware). | P1 | As a user, I want to filter by price range to inspect large transactions. |
| **FR-15** | Payment Mode | Filter by Cash, Card, UPI, Other. | P1 | As a user, I want to see spending broken down by payment method. |
| **FR-16** | Multi-Column Sort | Sort by date, amount, or category (ASC/DESC). | P1 | As a user, I want to sort expenses to find highest or most recent items. |

### 7.6 Dashboard Analytics & Budget Control (FR-17 to FR-28)

| ID | Requirement | Description | Priority | User Story |
|---|---|---|---|---|
| **FR-17** | Total Spend Metrics | Overall and current month spend with daily average velocity. | P0 | As a user, I want to see my total spend immediately on the dashboard. |
| **FR-18** | Recent Expenses | Live snapshot of last 5 transactions. | P0 | As a user, I want to see recent expenses at a glance without opening full list. |
| **FR-19** | Spend by Category Chart | Interactive Donut/Pie chart with weekly/monthly toggle. | P0 | As a user, I want visual charts showing where my money went. |
| **FR-20** | Spend Trend Chart | Bar/Line graph grouped by Day, Week, or Month. | P0 | As a user, I want to see spending trends over time to spot spending spikes. |
| **FR-21** | Budget Status Ring | Dynamic multi-gradient ring displaying % spent, remaining balance, and status. | P0 | As a user, I want an animated budget ring showing my remaining balance. |
| **FR-26** | Budget Goal Setting | Set monthly overall budget and per-category limits. | P0 | As a user, I want to set spending limits to stay disciplined. |
| **FR-27** | Anti-Deficit Guard | Hard block (server 400 + UI modal disable) when an expense exceeds remaining budget. | P0 | As a user, I want the system to block over-budget expenses to prevent deficit. |
| **FR-28** | Daily Spending Limit | Daily cap monitoring with alert cards (On Track, Near Limit, Over Limit). | P1 | As a user, I want daily spend limits to pace my spending across the month. |

---

## 8. Non-Functional Requirements

- **Security & Cryptography:**
  - Password hashing via Argon2 or BCrypt with appropriate work factor.
  - JWT Access Tokens (HS256 or RS256) signed with a secret from environment variables.
  - Refresh Tokens stored as cryptographic hashes (SHA-256) in the database.
  - Refresh Tokens delivered exclusively via `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
  - Rate limiting on authentication routes (`/auth/login`, `/auth/register`, `/auth/forgot-password`).
- **Performance:**
  - API response time under 150ms for authenticated queries.
  - Optimized database indexes on `(user_id, date)`, `(user_id, category_id)`, and `(user_id, created_at)`.
- **Reliability & Data Integrity:**
  - Zero hardcoded/mock data; 100% database-driven from PostgreSQL.
  - Atomic transactions for category reassignment and user onboarding data seeding.
- **Usability & Responsiveness:**
  - 100% responsive across mobile, tablet, and desktop viewports.
  - Full PWA support with offline app shell caching and installability.

---

## 9. Definition of Done (DoD)

- [x] User registration, email login, Google OAuth login, token refresh, and logout verified.
- [x] Strict user data isolation verified (User A cannot access or modify User B's resources).
- [x] All 20+ REST API endpoints protected by JWT authentication (except `/health` and public auth routes).
- [x] Full Expense, Category, Budget, and Dashboard features operating seamlessly per-user.
- [x] Multi-currency, 8-language localization, PWA install prompt, and 3D animated logo active.
- [x] Automated test suite covering Auth, Data Isolation, and Business Logic passing 100%.
- [x] Zero hardcoded secrets in git; all configuration environment-driven.

---
