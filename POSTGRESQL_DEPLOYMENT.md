# PostgreSQL Production Deployment Guide

This guide will help you deploy the Sales Dashboard with PostgreSQL database for production use.

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Option 1: Deploy to Vercel (Recommended)](#option-1-deploy-to-vercel-recommended)
- [Option 2: Deploy to Railway](#option-2-deploy-to-railway)
- [Option 3: Other Platforms](#option-3-other-platforms)
- [Database Initialization](#database-initialization)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

**Important**: Without PostgreSQL, the app runs in **mock mode** - data is not persisted and will be lost on server restart.

### Prerequisites
- GitHub account
- Vercel or Railway account (both have free tiers)
- This repository pushed to GitHub

---

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 2: Add PostgreSQL Database

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **"Create Database"** → **"Postgres"**
3. Choose a database name (e.g., `salesdashboard-db`)
4. Select region closest to your users
5. Click **"Create"**

### Step 3: Connect Database to Project

1. After database creation, click on your database
2. Go to **".env.local"** tab
3. Click **"Show secret"** to reveal connection strings
4. Vercel automatically adds these environment variables to your project:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NO_SSL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### Step 4: Initialize Database

1. Wait for deployment to complete (auto-triggered after adding database)
2. Visit: `https://your-app.vercel.app/api/db/init`
3. You should see: `{"success":true,"message":"Database initialized successfully"}`
4. If there's an error, check the **Function Logs** in Vercel dashboard

### Step 5: Test Your Application

1. Go to your deployed URL: `https://your-app.vercel.app`
2. Navigate to **Settings** page
3. Add items, types, and HSN codes
4. Create Stock IN/OUT events
5. Refresh the page - your data should persist!

---

## Option 2: Deploy to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository

### Step 2: Add PostgreSQL Database

1. In your project dashboard, click **"New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create and provision the database

### Step 3: Connect Database

1. Click on your **PostgreSQL service**
2. Go to **"Connect"** tab
3. Copy the **Postgres Connection URL**
4. Go to your **web service** (Next.js app)
5. Go to **"Variables"** tab
6. Click **"New Variable"**
7. Add:
   - **Key**: `POSTGRES_URL`
   - **Value**: (paste the connection URL)
8. Click **"Add"**

### Step 4: Configure Deployment

Your `railway.json` is already configured, but verify:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 5: Deploy and Initialize

1. Railway will auto-deploy after adding the database variable
2. Once deployed, find your app URL in **"Settings"** → **"Domains"**
3. Click **"Generate Domain"** if not already generated
4. Visit: `https://your-app.up.railway.app/api/db/init`
5. Confirm success message appears

---

## Option 3: Other Platforms

### Using Neon (Free PostgreSQL)

[Neon](https://neon.tech) offers generous free tier PostgreSQL hosting:

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Add to your deployment platform as `POSTGRES_URL` environment variable

**Connection string format:**
```
postgresql://username:password@ep-***-region.neon.tech/neondb?sslmode=require
```

### Using Supabase (Free PostgreSQL)

[Supabase](https://supabase.com) provides free PostgreSQL with 500MB storage:

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to **Settings** → **Database**
4. Copy **Connection string** (Direct connection)
5. Replace `[YOUR-PASSWORD]` with your actual password
6. Add to deployment platform as `POSTGRES_URL`

**Connection string format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.***supabase.co:5432/postgres
```

### Deploy to Other Platforms

This app can deploy to:
- **Netlify**: Use Netlify Functions for API routes
- **AWS Amplify**: Supports Next.js SSR
- **DigitalOcean App Platform**: Docker or buildpack deployment
- **Render**: Free tier available

**For all platforms:**
1. Set `POSTGRES_URL` environment variable
2. Ensure Node.js 18+ is used
3. Build command: `npm run build`
4. Start command: `npm start`
5. Visit `/api/db/init` after deployment

---

## 🗃️ Database Initialization

### Automatic Initialization

After deploying with PostgreSQL configured:

1. Navigate to: `https://your-domain.com/api/db/init`
2. This creates all required tables:
   - `items` - Item categories (e.g., Solar Panels)
   - `types` - Item types with HSN codes (e.g., 550W Mono)
   - `sources` - Stock sources (e.g., Main Warehouse)
   - `suppliers` - Supplier names per source
   - `events` - All stock IN/OUT transactions
   - `bom` - Bill of Materials records

### Manual Database Setup (Advanced)

If automatic initialization fails, you can manually run SQL:

```sql
-- Connect to your PostgreSQL database and run:

CREATE TABLE IF NOT EXISTS items (
  name VARCHAR(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS types (
  item_name VARCHAR(255) REFERENCES items(name) ON DELETE CASCADE,
  type_name VARCHAR(255),
  hsn_code VARCHAR(50),
  PRIMARY KEY (item_name, type_name)
);

CREATE TABLE IF NOT EXISTS sources (
  name VARCHAR(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS suppliers (
  source_name VARCHAR(255) REFERENCES sources(name) ON DELETE CASCADE,
  supplier_name VARCHAR(255),
  PRIMARY KEY (source_name, supplier_name)
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(50) PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  item VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  qty NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  source VARCHAR(255) NOT NULL,
  supplier VARCHAR(255) NOT NULL,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('IN', 'OUT')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_item ON events(item);

CREATE TABLE IF NOT EXISTS bom (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_in_kw NUMERIC NOT NULL,
  wattage_of_panels NUMERIC NOT NULL,
  table_option VARCHAR(50) NOT NULL,
  phase VARCHAR(10) NOT NULL CHECK (phase IN ('SINGLE', 'TRIPLE')),
  ac_wire VARCHAR(100),
  dc_wire VARCHAR(100),
  la_wire VARCHAR(100),
  earthing_wire VARCHAR(100),
  no_of_legs INTEGER,
  front_leg VARCHAR(100),
  back_leg VARCHAR(100),
  roof_design VARCHAR(100),
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bom_created_at ON bom(created_at DESC);
```

---

## 🔧 Troubleshooting

### Issue: "Using mock database" warning

**Problem**: App is not connecting to PostgreSQL

**Solutions**:
1. Verify `POSTGRES_URL` environment variable is set in deployment platform
2. Check connection string format is correct
3. Ensure database allows connections from your deployment platform's IP
4. Check deployment logs for connection errors

### Issue: Database initialization fails

**Problem**: `/api/db/init` returns error

**Solutions**:
1. Check database credentials are correct
2. Verify database exists and is accessible
3. Check if database user has CREATE TABLE permissions
4. Review function/server logs for specific error messages
5. Try manual SQL setup (see above)

### Issue: Data not persisting

**Problem**: Data disappears after refresh

**Solutions**:
1. Confirm you visited `/api/db/init` after deployment
2. Check browser console for API errors
3. Verify network tab shows successful API calls (200 status)
4. Ensure `POSTGRES_URL` is set (not using mock mode)

### Issue: Connection timeout

**Problem**: Database queries timeout

**Solutions**:
1. Check database region matches app region (reduce latency)
2. For Vercel: Use `POSTGRES_PRISMA_URL` for connection pooling
3. Increase connection timeout in connection string: `?connect_timeout=30`
4. Check database connection limits haven't been reached

### Issue: SSL/TLS errors

**Problem**: Connection rejected due to SSL

**Solutions**:
1. Add `?sslmode=require` to connection string
2. For Railway: SSL is enabled by default
3. For Neon/Supabase: Always use `sslmode=require`
4. Check provider documentation for SSL requirements

---

## 📊 Verify Production Setup

After deployment, verify everything works:

### 1. Check Database Connection
```bash
# Visit this URL in browser
https://your-domain.com/api/db/init

# Expected response:
{"success":true,"message":"Database initialized successfully"}
```

### 2. Test CRUD Operations
- ✅ Add new items in Stock IN form
- ✅ Create Stock OUT events
- ✅ Add HSN codes in Settings
- ✅ Create BOM records
- ✅ Refresh page - data persists

### 3. Monitor Logs
- **Vercel**: Dashboard → Functions → View Logs
- **Railway**: Service → Deployments → View Logs
- Look for any PostgreSQL connection errors

### 4. Performance Check
- Stock IN/OUT forms respond quickly
- Dashboard loads within 2-3 seconds
- Export Excel/PDF works without errors

---

## 🎉 Success!

Your Sales Dashboard is now running in production with PostgreSQL!

**Next Steps:**
1. Set up custom domain (optional)
2. Configure authentication (Firebase setup in `.env`)
3. Set up automated backups (via your database provider)
4. Monitor usage and scale as needed

**Need Help?**
- Check deployment platform documentation
- Review application logs for errors
- Ensure all environment variables are correctly set

---

## 📝 Environment Variables Reference

Required for production:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | ✅ Yes | Primary database connection URL |
| `POSTGRES_PRISMA_URL` | Recommended | Pooled connection (Vercel) |
| `NODE_ENV` | Optional | Set to "production" |

Optional (Firebase Auth):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No | Firebase project ID |

---

**Last Updated**: October 2025
**App Version**: 0.1.0
