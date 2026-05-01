# MyFinanceTracker — Front-End Application

**COM661 Full Stack Strategies and Development — Coursework 2**

| Field | Detail |
|---|---|
| **Author** | Deepak Pokhrel |
| **Email** | deepakpokhrel0412@gmail.com |
| **Student ID** | *(your student ID)* |
| **Module** | COM661 — Full Stack Strategies and Development |
| **Submission Deadline** | 1st May 2026 |
| **Framework** | Angular 21 |
| **Backend** | Flask REST API (Python) on `http://localhost:5000` |

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Architecture Overview](#architecture-overview)
5. [Getting Started](#getting-started)
6. [Test Credentials](#test-credentials)
7. [Application Structure](#application-structure)
8. [Components](#components)
9. [Services](#services)
10. [Guards and Interceptors](#guards-and-interceptors)
11. [Data Models](#data-models)
12. [API Endpoints](#api-endpoints)
13. [Authentication Flow](#authentication-flow)
14. [State Management](#state-management)
15. [Testing](#testing)
16. [Generating Documentation](#generating-documentation)

---

## Overview

MyFinanceTracker is a full-featured personal finance management web application built with **Angular 21** standalone components. It connects to a **Flask REST API** back-end and allows users to manage every aspect of their financial life from a single interface.

The application supports two user roles:

- **Standard users** can manage their own accounts, transactions, budgets, investments, and savings goals, and view analytics charts summarising their financial health.
- **Admin users** have access to an additional admin panel where they can view, create, edit, and delete any user account in the system.

Key design decisions:

- **Standalone components** throughout — no NgModules, uses Angular's modern `provideHttpClient`, `provideRouter`, and functional guard API.
- **JWT authentication** stored in `localStorage` and automatically attached to every outgoing HTTP request via a custom interceptor.
- **Client-side filtering** for investments and savings goals, because the back-end API does not support reliable query params for those resources.
- **`forkJoin`** on the dashboard to fire all five summary requests in a single round trip.
- **`history.pushState`** and `@HostListener('window:popstate')` in the transactions component to support the browser back button within the SPA without triggering a full Angular route reload.

---

## Features

### Dashboard
- Displays total account balance, monthly income, monthly expenses, and net cash flow as summary cards.
- Lists top spending categories ranked by amount.
- Shows the current investment portfolio value.
- Computes and displays a **Financial Health Score** (0–100) based on savings rate, budget adherence, and investment diversification.
- All five data sources are loaded in parallel using `forkJoin` for fast page load.

### Accounts
- Full CRUD: add, view, edit, and delete bank accounts.
- Supported account types: Checking, Savings, Credit Card, Cash.
- Detail view shows account name, type, currency, balance, and any notes.
- Balance figures colour-coded green (positive) or red (negative).

### Transactions
- Full CRUD: record, view, edit, and delete income and expense entries.
- Filter by account, category, type (income/expense), and date range.
- Free-text search by description.
- Paginated list — 10 transactions per page with previous/next controls.
- Expenses are stored as negative values; income as positive — the component converts on display.
- Browser back button support within add/detail/edit views using `history.pushState`.

### Budgets
- Full CRUD: create, view, edit, and delete monthly spending budgets.
- Each budget is scoped to a category (food, transport, entertainment, etc.) and a month (YYYY-MM).
- Visual progress bar shows spending vs limit for the selected month.
- Summary cards: total budget, average budget, highest budget category.
- Client-side pagination — 6 budgets per page.

### Investments
- Full CRUD: add, view, edit, and delete portfolio holdings.
- Supported investment types: Stocks, Crypto, ETFs, Funds.
- Computed fields per holding: current value, invested value, profit/loss, return percentage.
- Portfolio-level totals: total invested, total current value, total P&L.
- Winners count (holdings with profit ≥ 0) shown as a quick stat.
- Filter by type and sector using client-side filtering.

### Savings Goals
- Full CRUD: create, view, edit, and delete savings goals.
- Each goal tracks name, target amount, current amount, target date, category, priority, and notes.
- Circular progress indicator per goal.
- Summary stats: total saved, total remaining, average progress, completed goals count.
- Filter by status (all / active / complete) using client-side filtering.
- Category-based icons (house, car, travel, education, etc.).

### Analytics
- **Monthly Spending** — bar chart of spending per month (last 6 months).
- **Top Categories** — ranked list of expense categories with spend bars.
- **Income vs Expense** — monthly side-by-side comparison.
- **Budget Analysis** — budget limit vs actual spend per category for a selected month.
- **Portfolio Performance** — investment value breakdown by type.
- Month selector to drill into a specific month's budget analysis.

### Profile
- View and edit personal details: first name, last name, email, phone, currency preference.
- Change password (requires current password confirmation).
- Profile updates propagate immediately to `currentUser$` and `localStorage` so the sidebar name updates without a page reload.

### Admin Panel
- Admin-only route protected by both `authGuard` and `adminGuard`.
- List all registered users with search and pagination.
- Create a new user account (with optional admin role toggle).
- View any user's full profile detail.
- Edit any user's details.
- Delete any user (with confirmation dialog).
- URL updates using `Location.go()` for deep-link appearance without triggering a full Angular route reload.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Angular | 21.2.x |
| **Language** | TypeScript | ~5.9.2 |
| **Styling** | Bootstrap | 5.3.8 |
| **Icons** | Bootstrap Icons | 1.13.1 |
| **HTTP client** | Angular HttpClient | built-in |
| **Reactive state** | RxJS | ~7.8.0 |
| **Unit testing** | Jasmine + Karma | 5.6 / 6.4 |
| **Coverage** | karma-coverage | 2.2.1 |
| **Documentation** | Compodoc | 1.1.28 |
| **Build tool** | Angular CLI / `@angular/build` | 21.2.x |
| **Runtime** | Node.js | 18+ |
| **Back-end** | Flask (Python) | 3.x |

---

## Architecture Overview

```
Browser
  │
  ├── Angular Router  ──── authGuard (redirect to /login if not authenticated)
  │                   ──── adminGuard (redirect to /dashboard if not admin)
  │
  ├── Components (standalone, lazy-loaded)
  │     ├── Inject Services via constructor DI
  │     └── Render HTML templates with Bootstrap
  │
  ├── Services
  │     ├── AuthService  — manages currentUser$ BehaviorSubject + localStorage
  │     └── Resource services (Account, Transaction, Budget, Investment, Savings, Analytics)
  │           └── HttpClient → jwtInterceptor adds x-access-token header
  │
  └── Flask REST API  (http://localhost:5000)
```

**Data flow for a typical CRUD page (e.g. Budgets):**

1. Component `ngOnInit` → calls `BudgetService.getBudgets()`
2. Service builds query params, calls `HttpClient.get()`
3. `jwtInterceptor` clones the request and appends `x-access-token: <JWT>`
4. API returns JSON; service normalises the response shape and returns `Observable<Budget[]>`
5. Component subscribes, stores data in `this.budgets`, calls `fixture.detectChanges()`

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher — [nodejs.org](https://nodejs.org)
- **Angular CLI** — install globally once:
  ```bash
  npm install -g @angular/cli
  ```
- **Back-end API** running on `http://localhost:5000` — start the Flask server from the `backend/` directory before launching the front end.

### Installation

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install all dependencies
npm install

# 3. Start the development server
npm start
```

Open your browser at **`http://localhost:4200`**.

Hot-reload is enabled — any source file change automatically recompiles and refreshes the browser.

### Building for Production

```bash
npm run build
```

Output is placed in `dist/my-finance-tracker/`. Serve with any static file server.

### Running Tests

```bash
# Interactive watch mode (re-runs on file change)
npm test

# Headless single run with coverage report (CI-friendly)
npm run test:ci
```

The coverage report is saved to `coverage/my-finance-tracker/index.html` — open it in a browser to inspect line-by-line coverage.

### Generating Documentation

```bash
npm run docs
```

This runs Compodoc and outputs the documentation site to `documentation/index.html`. Open that file directly in a browser — no server required.

---

## Test Credentials

Use the following credentials to explore the application:

### Standard User

| Field | Value |
|---|---|
| Email | deepakpokhrel0412@gmail.com |
| Password | password12345 |

### Admin User

| Field | Value |
|---|---|
| Email | deepakpokhrel0412@gmail.com |
| Password | password12345 |

> **Note for marker:** Both the standard and admin accounts use the same email address. Test credentials including the password are provided in the accompanying submission notes document. Log in as admin to access the `/admin` route and user management panel.

---

## Application Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.ts                  # Root component — sidebar toggle, layout switching
│   │   ├── app.html                # Root template — sidebar + router-outlet
│   │   ├── app.css                 # Global app-level styles
│   │   ├── app.routes.ts           # All route definitions with lazy loading + guards
│   │   ├── app.config.ts           # Angular application config (router, HTTP, interceptors)
│   │   │
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── login/          # Login form, JWT storage, registered= redirect detection
│   │   │   │   └── register/       # Registration form, redirects to /login?registered=true
│   │   │   ├── dashboard/          # forkJoin summary dashboard + financial health score
│   │   │   ├── accounts/           # Account list, detail, add, edit views
│   │   │   ├── transactions/       # Transaction list with search/filter, add, detail, edit
│   │   │   ├── budgets/            # Budget list with pagination, detail, add, edit
│   │   │   ├── investments/        # Investment portfolio with P&L, add, detail, edit
│   │   │   ├── savings/            # Savings goals with progress, add, detail, edit
│   │   │   ├── analytics/          # Charts — spending, categories, income/expense, portfolio
│   │   │   ├── profile/            # Profile edit + change password
│   │   │   ├── admin/              # Admin user management (admin role only)
│   │   │   └── layout/             # Sidebar navigation + footer
│   │   │
│   │   ├── services/
│   │   │   ├── auth.ts             # Login, register, logout, currentUser$ BehaviorSubject
│   │   │   ├── account.ts          # CRUD for /accounts/
│   │   │   ├── transaction.ts      # CRUD + filters for /transactions/
│   │   │   ├── budget.ts           # CRUD + filters for /budgets/
│   │   │   ├── investment.ts       # CRUD + filters for /investments/
│   │   │   ├── savings.ts          # CRUD + filters for /savings-goals/
│   │   │   └── analytics.ts        # GET endpoints for all analytics charts
│   │   │
│   │   ├── guards/
│   │   │   ├── auth-guard.ts       # Redirects unauthenticated users to /login
│   │   │   └── admin-guard.ts      # Redirects non-admin users to /dashboard
│   │   │
│   │   ├── interceptors/
│   │   │   └── jwt-interceptor.ts  # Attaches x-access-token header to every HTTP request
│   │   │
│   │   └── models/
│   │       └── models.ts           # TypeScript interfaces for all domain objects
│   │
│   ├── environments/
│   │   └── environment.ts          # apiUrl = 'http://localhost:5000'
│   │
│   └── styles.css                  # Bootstrap import + global overrides
│
├── documentation/                  # Generated Compodoc site (open index.html)
├── coverage/                       # Generated test coverage report
├── karma.conf.js                   # Karma test runner configuration
├── tsconfig.json                   # Root TypeScript config
├── tsconfig.app.json               # App build TypeScript config (used by Compodoc)
├── tsconfig.spec.json              # Test TypeScript config
├── angular.json                    # Angular workspace config
└── package.json                    # Scripts, dependencies, author metadata
```

---

## Components

### `AppComponent` (`app.ts`)
Root component. Subscribes to `AuthService.currentUser$` to decide whether to show the sidebar layout (authenticated users) or the bare public layout (login/register). Sidebar collapsed state is persisted to `localStorage`.

### `LoginComponent` (`auth/login/`)
Handles user login. On success, stores the JWT under both `token` and `access_token` keys in `localStorage` (the interceptor reads `token`; other parts of the app read `access_token`). Detects `?registered=true` query param to show a one-time success banner, then strips it from the URL.

### `RegisterComponent` (`auth/register/`)
Handles new user registration. On success, redirects to `/login?registered=true` so the login page can display a confirmation message.

### `DashboardComponent` (`dashboard/`)
Fires five HTTP requests in parallel using `forkJoin` (accounts, transactions, investments, savings goals, analytics). Computes total balance, monthly income/expense, top categories, and a financial health score. Uses `setTimeout(() => ..., 0)` to defer the initial load by one tick, avoiding `ExpressionChangedAfterItHasBeenCheckedError`.

### `AccountsComponent` (`accounts/`)
Multi-view component with `mode` property switching between `list`, `add`, `detail`, and `edit` views. Re-syncs `selectedAccount` after every PUT so the detail panel reflects the latest saved data.

### `TransactionsComponent` (`transactions/`)
Multi-view component with server-side filtering by account, category, type, date range, and free-text search. Uses `history.pushState` and `@HostListener('window:popstate')` so the browser back button navigates between sub-views. Expenses are stored as negative numbers and formatted for display.

### `BudgetsComponent` (`budgets/`)
Multi-view component with client-side pagination (6 per page). Includes computed properties: `totalBudget`, `averageBudget`, `highestBudget`, and `pagedBudgets`.

### `InvestmentsComponent` (`investments/`)
Multi-view component with client-side filtering by type and sector. Calculates per-holding `currentValue`, `investedValue`, `profitLoss`, and `returnPct`. Portfolio totals and a `winnersCount` are derived as getters.

### `SavingsComponent` (`savings/`)
Multi-view component with client-side status filter (active / complete). `progress()` computes percentage; `completedCount`, `totalSaved`, `totalRemaining`, and `averageProgress` are derived getters.

### `AnalyticsComponent` (`analytics/`)
Loads spending chart data, top categories, income vs expense, and portfolio value on init. Budget analysis is loaded separately and re-fires when the user changes the month selector. All data is shaped for display as percentage bars (no third-party chart library — pure HTML/CSS).

### `ProfileComponent` (`profile/`)
Lets the user update personal details and change their password. On success, updates `currentUser$` in `AuthService` and overwrites `localStorage` so sidebar reflects the new name immediately.

### `AdminComponent` (`admin/`)
Admin-only, protected by both guards. Uses `ViewEncapsulation.None` so admin-specific CSS can style dynamically rendered inner content. URL updates via `Location.go()` give deep-link appearance without a full Angular route reload.

### `LayoutComponent` (`layout/`)
Sidebar navigation with links to all protected routes. Automatically marks the active route. Also contains the footer.

---

## Services

### `AuthService` (`services/auth.ts`)
- Exposes `currentUser$: BehaviorSubject<User | null>` — the source of truth for the logged-in user.
- Restores session from `localStorage` on construction so `currentUser$` is populated after a hard page reload.
- Methods: `login()`, `register()`, `logout()`, `updateProfile()`, `changePassword()`, `getProfile()`.

### `AccountService` (`services/account.ts`)
- Methods: `getAccounts()`, `createAccount()`, `updateAccount(id)`, `deleteAccount(id)`.
- `normalizePayload()` sends both `account_type` and `type` fields because the back-end accepts either.

### `TransactionService` (`services/transaction.ts`)
- Methods: `getTransactions(filters?)`, `createTransaction()`, `updateTransaction(id)`, `deleteTransaction(id)`.
- Accepts optional filter params (account, category, type, start/end date, search) and appends them as query string params.

### `BudgetService` (`services/budget.ts`)
- Methods: `getBudgets(filters?)`, `createBudget()`, `updateBudget(id)`, `deleteBudget(id)`.
- Skips null/undefined filter values so they don't appear as blank query params.
- Normalises three possible API response shapes (`{ budgets }`, `{ data }`, raw array).

### `InvestmentService` (`services/investment.ts`)
- Methods: `getInvestments(filters?)`, `createInvestment()`, `updateInvestment(id)`, `deleteInvestment(id)`.
- Client-side filtering is used in the component because the API does not reliably support query params for investments.

### `SavingsService` (`services/savings.ts`)
- Methods: `getSavingsGoals(filters?)`, `createGoal()`, `updateGoal(id)`, `deleteGoal(id)`.
- Normalises two possible API response keys: `goals` (primary) and `savings` (legacy fallback).

### `AnalyticsService` (`services/analytics.ts`)
- Methods: `getMonthlySpending()`, `getTopCategories()`, `getIncomeVsExpense()`, `getPortfolioValue()`, `getBudgetAnalysis(month)`.
- `month` is passed as a path segment (e.g. `2026-04`) to the `/analytics/budgets/:month` endpoint.
- Unwraps the `data` envelope if present; returns the raw response otherwise.

---

## Guards and Interceptors

### `authGuard` (`guards/auth-guard.ts`)
A functional route guard. Checks `localStorage` for a `token`. If absent, returns a `UrlTree` redirecting to `/login` — Angular handles the redirect as part of route resolution (no imperative navigation needed).

### `adminGuard` (`guards/admin-guard.ts`)
A functional route guard applied on top of `authGuard` for the `/admin` route. Reads the stored user object and checks for `role === 'admin'`. Redirects to `/dashboard` (not `/login`) so the user stays logged in but cannot access the admin area.

### `jwtInterceptor` (`interceptors/jwt-interceptor.ts`)
An `HttpInterceptorFn`. Clones every outgoing request and appends the `x-access-token` header with the JWT stored in `localStorage`. The back-end expects this non-standard header name (not the conventional `Authorization: Bearer`).

---

## Data Models

All TypeScript interfaces are defined in `src/app/models/models.ts`.

| Interface | Key Fields |
|---|---|
| `User` | `id`, `email`, `first_name`, `last_name`, `role`, `phone`, `currency` |
| `Account` | `id`, `name`, `type`, `balance`, `currency`, `notes` |
| `Transaction` | `id`, `account_id`, `type`, `category`, `amount`, `date`, `description` |
| `Budget` | `id`, `category`, `limit`, `month`, `spent` |
| `Investment` | `id`, `type`, `symbol`, `name`, `quantity`, `purchase_price`, `current_price`, `sector`, `broker` |
| `SavingsGoal` | `id`, `name`, `target_amount`, `current_amount`, `target_date`, `category`, `priority`, `notes` |
| `ApiResponse<T>` | Generic wrapper: `{ data?: T, budgets?: T, goals?: T, investments?: T }` |
| `MonthlySpend` | `month`, `total`, `expense` / `expenses` (either field depending on endpoint) |

---

## API Endpoints

All requests are made to `http://localhost:5000` (configured in `src/environments/environment.ts`).

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Authenticate user, returns JWT token |
| POST | `/auth/register` | Create new user account |
| POST | `/auth/logout` | Invalidate session (server-side) |
| GET | `/auth/me` | Get the currently authenticated user's profile |
| PUT | `/auth/me` | Update profile details or change password |

### Accounts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/accounts/` | List all accounts for the authenticated user |
| POST | `/accounts/` | Create a new account |
| PUT | `/accounts/:id` | Update an existing account |
| DELETE | `/accounts/:id` | Delete an account |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/transactions/` | List transactions (supports account, category, type, date filters) |
| POST | `/transactions/` | Record a new income or expense transaction |
| PUT | `/transactions/:id` | Update an existing transaction |
| DELETE | `/transactions/:id` | Delete a transaction |

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/budgets/` | List all budgets (supports month filter) |
| POST | `/budgets/` | Create a new budget for a category/month |
| PUT | `/budgets/:id` | Update an existing budget |
| DELETE | `/budgets/:id` | Delete a budget |

### Investments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/investments/` | List all investment holdings |
| POST | `/investments/` | Add a new holding to the portfolio |
| PUT | `/investments/:id` | Update a holding |
| DELETE | `/investments/:id` | Remove a holding from the portfolio |

### Savings Goals

| Method | Endpoint | Description |
|---|---|---|
| GET | `/savings-goals/` | List all savings goals |
| POST | `/savings-goals/` | Create a new savings goal |
| PUT | `/savings-goals/:id` | Update an existing goal |
| DELETE | `/savings-goals/:id` | Delete a savings goal |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/spending/monthly` | Monthly spending totals for the past 6 months |
| GET | `/analytics/top-categories` | Top expense categories ranked by spend |
| GET | `/analytics/income-vs-expense` | Monthly income vs expense comparison |
| GET | `/analytics/portfolio-value` | Investment portfolio value breakdown by type |
| GET | `/analytics/budgets/:month` | Budget limit vs actual spend for a given month (e.g. `2026-04`) |

### Admin — User Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/` | List all users (admin only) |
| GET | `/users/:id` | Get full profile for a specific user (admin only) |
| POST | `/users/` | Create a new user account (admin only) |
| PUT | `/users/:id` | Update any user's details (admin only) |
| DELETE | `/users/:id` | Delete a user account (admin only) |

**Total: 33 API endpoints across 6 resources.**

---

## Authentication Flow

```
User submits login form
       │
       ▼
POST /auth/login  ──► Flask validates credentials
       │
       ▼
JWT token returned in response body
       │
       ▼
LoginComponent stores token in localStorage
  ├── localStorage.setItem('token', jwt)          ← read by jwtInterceptor
  └── localStorage.setItem('access_token', jwt)   ← read by other components
       │
       ▼
AuthService.currentUser$ updated with user object
       │
       ▼
Router navigates to /dashboard
       │
       ▼
Every subsequent HTTP request
  └── jwtInterceptor clones request + appends x-access-token header
       │
       ▼
authGuard checks localStorage('token') on each route change
adminGuard additionally checks user.role === 'admin' for /admin
```

On **logout**, both localStorage keys are cleared and `currentUser$` is set to `null`, which causes the root template to switch to the public layout and the router to redirect to `/login`.

---

## State Management

No external state management library (NgRx, Akita, etc.) is used. State is managed with RxJS directly:

| Mechanism | Used For |
|---|---|
| `BehaviorSubject<User \| null>` in `AuthService` | Currently logged-in user — shared across all components that inject `AuthService` |
| Component-level properties (`this.budgets`, `this.goals`, etc.) | Local data owned by each component, re-fetched on `ngOnInit` |
| `localStorage` | JWT persistence across page reloads; sidebar collapsed state |

This is intentionally lightweight — the application does not need a global store because each route owns its own data and re-fetches on navigation.

---

## Testing

310 unit tests written with **Jasmine** and run by **Karma** in a headless Chrome browser.

### Running Tests

```bash
npm test             # Watch mode — re-runs on every file change
npm run test:ci      # Single run, headless, generates coverage report
```

### Test Breakdown

| File | Area | Tests |
|---|---|---|
| `app.spec.ts` | Root component | 4 |
| `auth/login/login.spec.ts` | Login component | 5 |
| `auth/register/register.spec.ts` | Register component | 6 |
| `dashboard/dashboard.spec.ts` | Dashboard component | 11 |
| `accounts/accounts.spec.ts` | Accounts component | 17 |
| `transactions/transactions.spec.ts` | Transactions component | 18 |
| `budgets/budgets.spec.ts` | Budgets component | 18 |
| `investments/investments.spec.ts` | Investments component | 20 |
| `savings/savings.spec.ts` | Savings component | 20 |
| `analytics/analytics.spec.ts` | Analytics component | 15 |
| `profile/profile.spec.ts` | Profile component | 13 |
| `admin/admin.spec.ts` | Admin component | 21 |
| `services/auth.spec.ts` | Auth service | 16 |
| `services/account.spec.ts` | Account service | 15 |
| `services/transaction.spec.ts` | Transaction service | 21 |
| `services/budget.spec.ts` | Budget service | 15 |
| `services/investment.spec.ts` | Investment service | 15 |
| `services/savings.spec.ts` | Savings service | 16 |
| `services/analytics.spec.ts` | Analytics service | 19 |
| `guards/auth-guard.spec.ts` | Auth guard | 5 |
| `guards/admin-guard.spec.ts` | Admin guard | 6 |
| `interceptors/jwt-interceptor.spec.ts` | JWT interceptor | 5 |
| **Total** | | **310** |

### What Is Tested

- **Component creation** — every component instantiates without errors.
- **HTTP interactions** — all GET, POST, PUT, and DELETE requests verified against `HttpTestingController`.
- **Validation** — form validation error messages for empty/invalid fields.
- **Computed properties** — `totalBalance`, `totalSaved`, `averageProgress`, `totalProfitLoss`, `pagedBudgets`, etc.
- **Client-side filtering** — `applyLocalFilters()` for investments (by type/sector) and savings (by status).
- **Pagination** — `nextPage()`, `prevPage()`, `pagedBudgets` slice correctness.
- **Confirmation dialogs** — delete operations trigger `window.confirm`; cancellation prevents the HTTP call.
- **Guards** — authenticated, unauthenticated, admin, and non-admin scenarios.
- **Interceptor** — JWT header attached when token present; no header when absent.
- **Utility methods** — `progress()`, `profitLoss()`, `returnPct()`, `goalName()`, `getGoalIcon()`, `getBudgetIcon()`, `getInvestmentIcon()`.

---

## Generating Documentation

Documentation is generated by **Compodoc**, which parses TypeScript source and produces a fully linked API reference site.

```bash
npm run docs
```

This runs:
```
compodoc -p tsconfig.app.json -d documentation --name 'MyFinanceTracker' --theme material --hideGenerator
```

Open `documentation/index.html` in any browser — no server required. The site includes:

- Component reference (inputs, outputs, lifecycle hooks)
- Service reference (all public methods and their return types)
- Route tree
- Module graph
- Code coverage overview (if run after `npm run test:ci`)

The `documentation/` folder is included in this submission and ready to open immediately.

---

*MyFinanceTracker — COM661 Coursework 2 — Deepak Pokhrel — deepakpokhrel0412@gmail.com*
