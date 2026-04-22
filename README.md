# Spendsy

Spendsy is an AI-powered personal finance coach with:

- A React + Vite frontend for dashboard, transactions, and AI insights/chat
- A Node.js + Express + Prisma backend with Clerk auth and Gemini-powered insights

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Clerk, Axios, Recharts
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Clerk, Google Gemini

## Project Structure

```text
Spendsy/
  backend/
  frontend/
```

## Prerequisites

Install these before setup:

- Node.js 18+ (recommended: latest LTS)
- npm 9+
- PostgreSQL database
- Clerk account (for authentication)
- Google AI Studio API key (Gemini)

## 1) Backend Setup

From the `backend` folder:

```bash
cd backend
npm install
```

Create a `.env` file in `backend/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
GEMINI_API_KEY="your_gemini_api_key"
```

Generate Prisma client and push schema:

```bash
npm run prisma:generate
npm run prisma:push
```

If you are updating from an older schema, run `npm run prisma:push` again after pulling latest changes so new user goal fields are created.

Run backend in development:

```bash
npm run dev
```

Backend will run on `http://localhost:5000` by default.

Health check:

```bash
curl http://localhost:5000/health
```

## 2) Frontend Setup

From the `frontend` folder:

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/.env`:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
```

Run frontend in development:

```bash
npm run dev
```

Frontend will run on a Vite URL (usually `http://localhost:5173`).

## Running Both Apps Together

Use two terminals:

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open the frontend URL and sign in with Clerk.

## How Spendsy Works

1. User signs in from frontend using Clerk.
2. Frontend requests a Clerk token and sends it as `Authorization: Bearer <token>` in API calls.
3. Backend verifies auth via Clerk middleware.
4. Backend syncs/creates the user record in PostgreSQL using Prisma.
5. Transactions are stored and categorized (manual category or auto-categorized from note text).
6. Dashboard endpoint calculates monthly stats, category split, recent transactions, and projected spend.
7. Insights endpoint sends spending context to Gemini and stores generated insights.
8. Chat endpoint sends user question + recent spending context to Gemini and returns a plain-text reply.
9. Rule engine detects behavior anomalies (weekend overspending, category concentration, sudden spikes).
10. Savings goal planner calculates monthly and daily targets.

## Main Backend API Endpoints

All routes require authenticated Clerk user and are prefixed with `/api`.

- Transactions
  - `GET /transactions` - list user transactions
  - `POST /transactions` - add transaction
  - `PUT /transactions/:id` - update transaction
  - `DELETE /transactions/:id` - delete transaction
  - `GET /transactions/dashboard` - dashboard stats
- Insights
  - `GET /insights` - latest saved insights
  - `POST /insights/generate` - generate and store fresh insights
  - `POST /insights/chat` - chat with AI assistant
- User
  - `GET /user/profile` - fetch user profile and budget settings
  - `PATCH /user/profile` - update monthly income and budget
  - `PATCH /user/savings-goal` - set savings target and duration

## Build for Production

Backend:

```bash
cd backend
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

## Common Troubleshooting

- `Unauthorized` errors:
  - Verify Clerk keys are set correctly in both frontend and backend env files.
  - Confirm user is signed in before calling protected APIs.
- Prisma/database errors:
  - Verify `DATABASE_URL`.
  - Verify `DATABASE_URL_UNPOOLED` if using Prisma direct connection.
  - Re-run `npm run prisma:generate` and `npm run prisma:push` in `backend`.
- AI insights not generating:
  - Verify `GEMINI_API_KEY`.
  - Check backend logs for Gemini API errors.

## Notes

- Default user values (on first sync) are currently hardcoded in backend:
  - `monthlyBudget = 1000`
  - `monthlyIncome = 3000`
- The app currently uses INR (`Rs`) in the UI.