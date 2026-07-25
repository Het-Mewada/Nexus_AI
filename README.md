# Nexus AI - The Ultimate AI-Powered Personal Finance & Wealth Platform

Nexus AI is a comprehensive, production-grade financial operating system designed to give users complete control over their money. It transcends simple expense tracking by offering an interconnected ecosystem that includes simulated stock trading, AI-driven financial advice, shared family wallets, dynamic budget and goal tracking, and automated background synchronization.

---

## 🏗️ Architecture & Technology Stack

Nexus AI is built as a modern, decoupled Monorepo (Client + Server) using cutting-edge technologies.

### Frontend (Client)
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS with shadcn/ui components (Radix UI primitives)
- **State Management & Data Fetching:** React Query (@tanstack/react-query) for caching and optimistic updates, Zustand (via global state for user settings)
- **Routing:** React Router v6
- **Charts:** Recharts for dynamic, interactive financial graphs
- **Icons:** Lucide React

### Backend (Server)
- **Framework:** Node.js with Express 5 (native async error handling)
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL (Hosted on Supabase)
- **Authentication:** Supabase Auth (JWT based)
- **AI Integration:** Google Gemini AI (via `@google/genai` SDK) using `gemini-flash-latest` model.
- **Background Jobs & Message Queues:** BullMQ backed by Redis for scheduled tasks, notifications, and data synchronization.
- **Financial Market Data:** Yahoo Finance API (`yahoo-finance2`) and custom web scraping for IPO data.
- **Security:** Helmet, CORS, and Express Rate Limiter.

---

## 🗂️ Project Structure

The repository is divided into two primary directories: `/client` and `/server`.

### `/client`
- `src/components/`: Reusable, generic UI components (buttons, dialogs, charts) largely built on top of shadcn/ui.
- `src/features/`: Domain-driven feature modules. Each folder (e.g., `dashboard`, `portfolio`, `transactions`) contains its own components, pages, and specific logic.
- `src/lib/`: Global utilities, formatting functions, and Tailwind `cn` helper.
- `src/services/`: API client singletons (Axios instances) connecting to the backend endpoints (`api.ts`).
- `src/types/`: Shared TypeScript interfaces mapping directly to the backend database schema and API responses.

### `/server`
- `src/controllers/`: Express route handlers. They validate the request (often via Zod middlewares) and call the appropriate service.
- `src/services/`: The core business logic. All database interactions, third-party API calls, and AI integrations live here.
- `src/routes/`: Express router definitions linking endpoints to controllers.
- `src/middleware/`: Authentication checks, global error handling, rate limiting.
- `src/jobs/`: BullMQ worker definitions and recurring cron-job setups.
- `prisma/`: Contains `schema.prisma` mapping the PostgreSQL database architecture.

---

## 🌟 Exhaustive Feature List & Detailed User Flows

### 1. Onboarding & Authentication
*The entry point to Nexus AI.*
- **Flow:** Users sign up securely using Supabase Auth. Upon first successful login, they are directed to an onboarding screen.
- **Details:** Users configure their baseline financial profile—selecting their **Currency** (which globally affects all UI formatting and backend calculations), **Timezone**, and **Monthly Salary**.

### 2. The Dashboard (The Command Center)
*A high-level overview of the user's financial health.*
- **Flow:** Users land here immediately after logging in.
- **Metrics:** Total Income (MTD), Total Spent (MTD), and Net Worth (Total Assets minus Total Liabilities).
- **AI Financial Insights:** At the top of the dashboard, Google Gemini dynamically generates 3 critical, actionable insights. The backend pulls the user's *entire* database profile (budgets, goals, debts, market portfolio) and prompts the AI to highlight urgent matters (e.g., "Your 'Groceries' budget is 90% exhausted", "You have an unpaid electricity bill due in 2 days").
- **Visuals:** A Category Spending Pie Chart, a 6-month Income vs. Expense Bar Chart, and a feed of recent transactions.
- **Quick Actions:** Floating Action Buttons (FAB) or quick access cards to instantly log transactions.

### 3. Transactions & AI Categorization
*The backbone of expense tracking.*
- **Flow:** A user clicks "Add Expense". They type "Starbucks" in the merchant field and "Morning coffee" in the description.
- **AI Magic:** Upon inputting the merchant, the backend calls the Gemini AI to automatically infer the correct category. In this case, the AI categorizes it as `Food` or `Personal`, preventing the user from having to manually sort their expenses.
- **Management:** Users can filter, search, sort, edit, and delete transactions. All changes instantly update the Dashboard metrics and Cash Flow charts.

### 4. Budgets & Goals
*Proactive financial planning.*
- **Budgets Flow:** Users can set a monthly spending limit overall or restrict it by specific categories (e.g., $500 for Housing, $200 for Entertainment). Progress bars visually indicate how close they are to hitting the limit, changing colors from green to red.
- **Goals Flow:** Users define milestones (e.g., "Emergency Fund", "Europe Trip"). They set a target amount, a deadline, and can log manual deposits towards this goal. The UI displays completion percentages and time remaining.

### 5. Bills & Subscriptions Manager
*Never miss a payment.*
- **Bills Flow:** Users log upcoming liabilities (e.g., Utility Bill, Credit Card). Bills can be marked as recurring or one-off. Users can toggle "Paid/Unpaid" status, which updates the pending liabilities calculations.
- **Subscriptions Flow:** Dedicated tracking for SaaS and media (Netflix, Gym, AWS). Users enter the billing cycle (monthly/yearly), amount, and next payment date. The system calculates the estimated fixed monthly overhead.

### 6. Wealth Module: Market & Simulated Portfolio
*A complete simulated stock market environment within the app.*
- **Market Search:** Users can search for any globally traded ticker symbol (e.g., AAPL, RELIANCE.NS). The backend proxies live data from Yahoo Finance.
- **Interactive Charts:** Viewing a stock opens an interactive modal with a Recharts-powered historical line graph. Users can switch timeframes (1D, 5D, 1M, 6M, 1Y, 5Y).
- **Watchlist:** Users can "star" a stock, pinning it to their Watchlist tab for quick live-price monitoring.
- **Trading Simulator:** Inside the stock modal, users can switch to the "Trade" tab. 
  - **Buying:** Entering a quantity calculates the estimated cost and adds the asset to their portfolio.
  - **Selling:** The backend employs FIFO (First-In, First-Out) logic. It checks if the user owns enough shares across multiple past purchase records, decrements quantities appropriately, and cleans up zero-quantity records.
- **Holdings Tracking:** Users can view their active portfolio. The system calculates the *Invested Amount*, fetches the *Live Current Value*, and displays the *Absolute Return (PnL)* dynamically.
- **IPO Tracking:** Scrapes and displays upcoming, live, and closed Initial Public Offerings directly from market sources.

### 7. Family & Shared Wallets
*Collaborative finance for couples and roommates.*
- **Flow:** 
  1. A user creates a "Family Group" (e.g., "The Smiths").
  2. The system generates a unique invite code.
  3. Other users enter this code to join the group.
  4. Members create "Shared Wallets" (e.g., "Groceries Fund", "Vacation Pool").
  5. Any member can log transactions against a specific shared wallet.
- **Why:** Keeps shared ledgers completely separate from personal budgets, ensuring clean accounting.

### 8. The Nexus AI AI Advisor
*Your omniscient personal finance assistant.*
- **Flow:** Users open the chat interface and ask free-form questions (e.g., "Do I have enough money to buy a $500 PS5 this month?").
- **How it works:** The backend constructs a massive context payload containing the user's MTD income, MTD spending, category breakdowns, active debts, remaining budgets, and upcoming bills. This payload is securely passed to Google Gemini, which acts as a highly personalized, contextual advisor. It will literally respond with: "You only have $200 left in your overall budget and an unpaid electric bill of $150 due tomorrow. I advise holding off on the PS5."

### 9. Notifications & Background Jobs (BullMQ)
*Automated system maintenance.*
- **Redis Queue:** The backend uses BullMQ to handle async tasks so the main Express thread remains unblocked.
- **Automations:** 
  - Syncing live prices for all users' portfolios in the background.
  - Generating weekly/monthly financial reports.
  - Dispatching internal notifications (and potentially emails via Resend) when a user exceeds a budget or a bill is approaching its due date.

---

## 🗄️ Database Schema Overview (Prisma)

The application utilizes a highly relational PostgreSQL schema. Key models include:
- `User`: Core authentication and settings profile.
- `Income` / `Expense`: Core transaction ledgers.
- `Budget` / `Goal`: Financial planning trackers.
- `Bill` / `Subscription`: Recurring liability tracking.
- `Investment`: The user's simulated portfolio ledger (tracks symbol, quantity, average price).
- `Loan` / `Insurance`: Debt and asset protection tracking.
- `FamilyGroup` / `GroupMember`: Many-to-many relationship for families.
- `SharedWallet` / `SharedWalletTransaction`: Isolated ledgers attached to groups.

---

## 🔌 API Endpoints Overview

The backend exposes RESTful APIs, prefixed with `/api`. All protected routes require a Bearer token in the `Authorization` header.

- **`/api/auth`**: User registration, login, and profile fetching.
- **`/api/ai`**: Generate Insights, Categorize Transactions, and the AI Advisor Chat.
- **`/api/dashboard`**: Aggregated data endpoint for the main UI.
- **`/api/transactions`**: CRUD for Income and Expenses.
- **`/api/budgets` & `/api/goals`**: Financial planning endpoints.
- **`/api/investments`**:
  - `/portfolio`: Get active holdings, Add Investment.
  - `/portfolio/sell`: Sell logic (reduces quantities, handles PnL).
  - `/market/search` & `/market/quote`: Live Yahoo Finance proxy.
- **`/api/family`**: Group creation, joining, wallet management, and shared transactions.

---

## 🚀 Step-by-Step Local Setup Guide

### 1. Prerequisites
- **Node.js**: v18 or higher.
- **Redis**: You must have a Redis server running locally (usually on port `6380` or `6379`) or a cloud instance to power BullMQ.
- **Supabase**: Create a free Supabase project to get your PostgreSQL `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.
- **Google AI Studio**: Get a free Gemini API Key.

### 2. Backend Setup
Open your terminal and navigate to the `server` directory:
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
# Server Config
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Database
DATABASE_URL=postgresql://user:password@host:5432/postgres

# Redis
REDIS_URL=redis://localhost:6380

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```
Push the schema to your database and start the server:
```bash
npx prisma db push
npm run dev
```

### 3. Frontend Setup
Open a new terminal window and navigate to the `client` directory:
```bash
cd client
npm install
```
Create a `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Start the frontend development server:
```bash
npm run dev
```

**Nexus AI will now be running on `http://localhost:5173`!**
