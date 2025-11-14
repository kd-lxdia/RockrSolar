# 🚀 Quick AWS Amplify Deployment (15 Minutes)

Follow these steps to deploy your Sales Dashboard to AWS Amplify.

## ✅ Prerequisites Checklist

- [ ] AWS Account created
- [ ] Code pushed to GitHub (`khushi-dutta/dashboard`)
- [ ] PostgreSQL database ready (Neon.tech or AWS RDS)

---

## Step 1: Get PostgreSQL Connection String (5 min)

### Option A: Neon.tech (Free - Recommended)

1. Go to https://neon.tech
2. Click **Sign Up** → Use GitHub
3. Click **Create Project**
   - Name: `sales-dashboard-db`
   - Region: Choose closest to your users
4. Click **Create Project**
5. **Copy the connection string** shown (format: `postgresql://user:pass@ep-xxx.neon.tech/dbname`)
6. Keep this tab open - you'll need it!

### Option B: AWS RDS PostgreSQL

1. AWS Console → Search "RDS"
2. Click **Create database**
3. Settings:
   - Engine: PostgreSQL
   - Template: **Free tier**
   - DB instance: `sales-dashboard-db`
   - Master username: `postgres`
   - Password: (create strong password - save it!)
   - Public access: **Yes**
4. Click **Create database** (wait 10 min)
5. Go to RDS → Databases → Click your database
6. Copy **Endpoint** (e.g., `xxx.rds.amazonaws.com`)
7. Connection string: `postgresql://postgres:YOUR_PASSWORD@ENDPOINT:5432/postgres`

---

## Step 2: Deploy to AWS Amplify (5 min)

1. **Open AWS Amplify Console**
   - Visit: https://console.aws.amazon.com/amplify
   - Click **Get Started** (under "Host your web app")

2. **Connect GitHub**
   - Select **GitHub**
   - Click **Authorize AWS Amplify** (if prompted)
   - Repository: `khushi-dutta/dashboard`
   - Branch: `main`
   - Click **Next**

3. **Configure App**
   - App name: `sales-dashboard`
   - The build settings will auto-populate (Next.js detected)
   - Click **Advanced settings** dropdown

4. **Add Environment Variables**
   - Click **Add environment variable**
   - Key: `POSTGRES_URL`
   - Value: (paste your PostgreSQL connection string from Step 1)
   - Click **Add environment variable** again
   - Key: `NODE_ENV`
   - Value: `production`

5. **Deploy**
   - Click **Next**
   - Review settings
   - Click **Save and deploy**
   - ☕ Wait 5-7 minutes

---

## Step 3: Initialize Database (2 min)

1. **Find Your App URL**
   - In Amplify Console, you'll see: `https://main.xxxxx.amplifyapp.com`
   - Click the URL or copy it

2. **Initialize Database**
   - Open: `https://YOUR-APP-URL.amplifyapp.com/api/db/init`
   - You should see: `{"success":true,"message":"Database initialized successfully"}`
   - ✅ If you see this, database is ready!
   - ❌ If error, check:
     - Environment variables are correct
     - PostgreSQL connection string is valid
     - Database allows connections

3. **Test Your App**
   - Go to: `https://YOUR-APP-URL.amplifyapp.com`
   - Navigate to **Settings**
   - Add an item and type
   - Add HSN code
   - Create Stock IN event
   - **Refresh the page** → Data should persist!

---

## Step 4: Success! 🎉

Your Sales Dashboard is now live on AWS!

### Your URLs:
- **App**: `https://main.xxxxx.amplifyapp.com`
- **Database Init**: `https://main.xxxxx.amplifyapp.com/api/db/init`

### Automatic Deployments ✅
Every time you push to `main` branch, Amplify auto-deploys!

```bash
git add .
git commit -m "Update feature"
git push origin main
# Amplify automatically deploys in 3-5 minutes
```

---

## Optional: Add Custom Domain

1. Amplify Console → **Domain management**
2. Click **Add domain**
3. Enter your domain (e.g., `dashboard.yourcompany.com`)
4. Follow DNS instructions
5. SSL certificate auto-configured!

---

## 🔍 Monitoring & Logs

1. **View Logs**
   - Amplify Console → Your App → **Build history**
   - Click any deployment to see logs

2. **Performance**
   - Amplify Console → **Monitoring**
   - View traffic, requests, errors

3. **Environment Variables**
   - Amplify Console → **Environment variables**
   - Update `POSTGRES_URL` if database changes

---

## 🚨 Troubleshooting

### Issue: Build Failed
- Click build → View logs
- Usually missing environment variables
- Check `POSTGRES_URL` is set correctly

### Issue: Database Not Connected
- Verify connection string format: `postgresql://user:pass@host:port/db`
- For Neon: Must end with `?sslmode=require`
- For RDS: Check security group allows connections

### Issue: App Loads But No Data Persists
- Did you visit `/api/db/init`?
- Check browser console for API errors
- Verify `POSTGRES_URL` is set (not using mock mode)

---

## 💰 Costs

**With Neon.tech (Free database):**
- Amplify: $0-15/month (depends on traffic)
- Neon: $0 (free tier: 3 GB)
- **Total: ~$0-15/month**

**With AWS RDS (Free tier for 12 months):**
- Amplify: $0-15/month
- RDS: $0 (first 12 months), then ~$15-20/month
- **Total: ~$0-15/month (year 1), ~$15-35/month (after)**

---

## 📞 Next Steps

1. ✅ Share your live URL with team
2. ✅ Set up custom domain
3. ✅ Configure automated database backups
4. ✅ Monitor usage in Amplify Console

**Your Sales Dashboard is production-ready!** 🎉

---

## Need More?

- Full AWS guide: `AWS_DEPLOYMENT_GUIDE.md`
- App Runner option: See full guide
- ECS Fargate: For enterprise scale
