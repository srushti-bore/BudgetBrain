# BudgetBrain — Cloud Deployment Guide (Supabase + Render + Vercel)

This step-by-step guide explains how to deploy BudgetBrain to free-tier cloud services in under 15 minutes.

---

## 🗄️ Step 1: Set up Supabase PostgreSQL Database

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**:
   - **Name**: `budgetbrain-db`
   - **Database Password**: Set a strong password (save this securely).
   - **Region**: Choose the closest region (e.g., South Asia / Mumbai or Singapore).
3. Once created, go to **Project Settings** (gear icon) ➔ **Database**.
4. Scroll down to **Connection String** ➔ **URI** tab.
5. Copy the Connection URI. It will look like:
   `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

---

## 🚀 Step 2: Deploy Backend to Render

1. Push your repository to GitHub (`git push origin main`).
2. Go to [render.com](https://render.com) and sign in with GitHub.
3. Click **New +** ➔ **Web Service**.
4. Connect your `BudgetBrain` GitHub repository.
5. Configure Web Service settings:
   - **Name**: `budgetbrain-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker` (Render will automatically detect `backend/Dockerfile`).
   - **Instance Type**: `Free`
6. Scroll to **Environment Variables** and add:
   - `DATABASE_URL`: Your Supabase connection string (e.g. `postgresql+asyncpg://postgres:YOUR-PASSWORD@db.xxx.supabase.co:5432/postgres`).
   - `ALLOWED_ORIGINS`: `https://budgetbrain.vercel.app,http://localhost:3000` (Update with your Vercel URL once created).
   - `APP_ENV`: `production`
   - `APP_DEBUG`: `false`
7. Click **Create Web Service**.
8. Render will build the Docker container, run database migrations (`alembic upgrade head`), seed starter categories (`Food`, `Groceries`, `Transportation`, `Bills`, etc.), and start FastAPI.
9. Copy your active Render service URL (e.g., `https://budgetbrain-backend.onrender.com`).

---

## 🌐 Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import your `BudgetBrain` GitHub repository.
4. Configure Project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Select `frontend`
5. Expand **Environment Variables** and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://budgetbrain-backend.onrender.com/api/v1` (Replace with your actual Render backend URL).
6. Click **Deploy**.
7. Vercel will build and launch your Next.js 14+ App Router frontend in seconds!

---

## 🔄 Step 4: Final CORS Sync

1. Copy your live Vercel frontend URL (e.g., `https://budgetbrain.vercel.app`).
2. Go back to Render ➔ `budgetbrain-backend` ➔ **Environment Variables**.
3. Update `ALLOWED_ORIGINS` to include your Vercel domain:
   `https://budgetbrain.vercel.app,http://localhost:3000`
4. Save changes. Render will automatically redeploy with full cross-origin permissions!

---

### 🎉 Live Verification Checklist
- [x] **Supabase**: Cloud database running with SSL.
- [x] **Render**: FastAPI Docker Web Service running migrations and seeding.
- [x] **Vercel**: Next.js App Router deployed with custom domain and HTTPS.
- [x] **Single-User MVP**: Auth-free, INR currency (`₹`), real-time sync!
