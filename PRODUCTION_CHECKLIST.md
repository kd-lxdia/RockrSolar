# 🚀 Quick Production Deployment Checklist

Follow this checklist to deploy your Sales Dashboard to production with PostgreSQL.

## ✅ Pre-Deployment Checklist

- [ ] Code pushed to GitHub repository
- [ ] Vercel or Railway account created
- [ ] Reviewed `.env.example` for required variables

---

## 🎯 Vercel Deployment (5 minutes)

### 1. Create Project
- [ ] Go to [vercel.com](https://vercel.com) → New Project
- [ ] Import GitHub repository
- [ ] Keep default settings (Next.js auto-detected)
- [ ] Click **Deploy**

### 2. Add PostgreSQL Database
- [ ] Go to **Storage** tab → Create Database → **Postgres**
- [ ] Name it (e.g., `salesdashboard-db`)
- [ ] Select region closest to users
- [ ] Click **Create** (Vercel auto-connects environment variables)

### 3. Initialize Database
- [ ] Wait for redeployment (triggered automatically)
- [ ] Visit: `https://YOUR-APP.vercel.app/api/db/init`
- [ ] Confirm success message: `{"success":true,...}`

### 4. Test Application
- [ ] Open deployed app
- [ ] Navigate to Settings → Add Item & Type
- [ ] Add HSN code
- [ ] Create Stock IN event
- [ ] **Refresh page** → Data should persist ✅

---

## 🚂 Railway Deployment (7 minutes)

### 1. Create Project
- [ ] Go to [railway.app](https://railway.app) → New Project
- [ ] Deploy from GitHub repo
- [ ] Select your repository

### 2. Add Database
- [ ] Click **New** → Database → **PostgreSQL**
- [ ] Wait for provisioning (~2 minutes)

### 3. Connect Database
- [ ] Click PostgreSQL service → **Connect** tab
- [ ] Copy connection URL
- [ ] Go to your app service → **Variables** tab
- [ ] Add variable: `POSTGRES_URL` = (paste URL)
- [ ] Click **Add**

### 4. Generate Domain
- [ ] Go to **Settings** → **Domains**
- [ ] Click **Generate Domain**
- [ ] Copy your railway.app URL

### 5. Initialize Database
- [ ] Visit: `https://YOUR-APP.up.railway.app/api/db/init`
- [ ] Confirm success message

### 6. Test Application
- [ ] Open deployed app
- [ ] Test data persistence (same as Vercel Step 4)

---

## 🔍 Troubleshooting

### "Using mock database" warning appears
→ Environment variable `POSTGRES_URL` not set. Check deployment platform variables.

### `/api/db/init` returns error
→ Check function logs. Verify database credentials and permissions.

### Data disappears after refresh
→ Did you run `/api/db/init`? Check browser console for errors.

### Connection timeout
→ Database region too far from app. Consider relocating or using connection pooling.

---

## 📚 Full Documentation

For detailed instructions, see: **[POSTGRESQL_DEPLOYMENT.md](./POSTGRESQL_DEPLOYMENT.md)**

---

## 🎉 Success Indicators

✅ `/api/db/init` returns success  
✅ Items/types persist after page refresh  
✅ Stock IN/OUT events are saved  
✅ HSN codes appear in exports  
✅ BOM records are stored  

**Your app is now production-ready!** 🚀
