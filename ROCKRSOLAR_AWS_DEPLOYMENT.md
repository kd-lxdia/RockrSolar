# 🚀 RockrSolar AWS Amplify Deployment Guide

Deploy the Sales Dashboard to AWS Amplify using the RockrSolar repository.

## ✅ Prerequisites

- AWS Account (https://aws.amazon.com)
- PostgreSQL database connection string (your existing Neon.tech or AWS RDS database)
- Code pushed to https://github.com/kd-lxdia/RockrSolar (✓ Done)

---

## Step 1: Create/Verify PostgreSQL Database

If you already have a database running, get your connection string. Otherwise:

### Neon.tech (Free - Recommended)
1. Go to https://neon.tech and sign in
2. Find your existing database or create a new one
3. Copy the connection string: `postgresql://user:pass@ep-xxx.neon.tech/dbname`

---

## Step 2: Deploy to AWS Amplify

### 1. Open AWS Amplify Console
- Visit: https://console.aws.amazon.com/amplify
- Sign in with your AWS account
- Click **New app** → **Host web app**

### 2. Connect GitHub Repository
- Select **GitHub**
- Click **Authorize AWS Amplify** (if needed)
- Repository: `kd-lxdia/RockrSolar`
- Branch: `main`
- Click **Next**

### 3. Configure Build Settings
The app will auto-detect Next.js. The build settings are already configured in `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 20
        - nvm use 20
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - node_modules/**/*
```

Click **Next**

### 4. Add Environment Variables (IMPORTANT)

Click **Add environment variable** and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `POSTGRES_URL` | Your full PostgreSQL connection string | From Step 1 |
| `NODE_ENV` | `production` | Required |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` | Auth secret |
| `NEXTAUTH_URL` | Will update after deployment | Your app URL |

**Important:** Keep the `POSTGRES_URL` secret - don't commit it to git!

### 5. Deploy
- Click **Next**
- Review all settings
- Click **Save and deploy**
- Wait 5-7 minutes for build and deployment

---

## Step 3: Initialize Database

After deployment completes:

1. **Find Your App URL**
   - In Amplify Console, you'll see your app URL (e.g., `https://main.xxx.amplifyapp.com`)

2. **Update NEXTAUTH_URL**
   - Go to Amplify Console → Your app → Environment variables
   - Edit `NEXTAUTH_URL` to your deployed URL
   - Save changes

3. **Initialize Database Tables**
   - Visit: `https://your-app-url.amplifyapp.com/api/db/init`
   - You should see: `{"success":true,"message":"Database initialized"}`
   - This creates all tables and seeds initial data

4. **Test the App**
   - Visit: `https://your-app-url.amplifyapp.com`
   - Default login: `admin` / `admin123`
   - **Change the password immediately in production!**

---

## Step 4: Enable Continuous Deployment

AWS Amplify automatically deploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Your changes"

# Push to RockrSolar
git push rockrsolar main
```

Amplify will automatically:
1. Detect the push
2. Run build
3. Deploy new version
4. Zero-downtime switch

---

## 🔧 Troubleshooting

### Build Fails
- Check Build logs in Amplify Console
- Verify environment variables are set correctly
- Ensure `POSTGRES_URL` is accessible from AWS

### Database Connection Fails
- Verify PostgreSQL connection string
- Check database firewall settings (Neon: should be open, RDS: check security groups)
- Test connection: `https://your-app.amplifyapp.com/api/diagnostic`

### App Loads but No Data
- Visit `/api/db/init` to initialize tables
- Check browser console for errors
- Verify authentication is working

---

## 📊 Post-Deployment

### Monitor Your App
- **CloudWatch Logs**: AWS Amplify → Your app → Monitoring
- **Database**: Neon.tech dashboard or RDS monitoring

### Update Environment Variables
- Amplify Console → Your app → Environment variables
- Changes require redeploy (happens automatically)

### Custom Domain (Optional)
- Amplify Console → Your app → Domain management
- Add your custom domain (e.g., `dashboard.rockrsolar.com`)
- Follow AWS instructions for DNS setup

---

## 🎉 Deployment Complete!

Your Sales Dashboard is now live on AWS with:
- ✅ Automatic deployments on git push
- ✅ PostgreSQL database connected
- ✅ SSL/HTTPS enabled
- ✅ Global CDN
- ✅ Scalable infrastructure

**Next Steps:**
1. Change default admin password
2. Add your team members
3. Configure stock alert thresholds
4. Start tracking inventory!

---

## 💰 Cost Estimate

**Free Tier (First Year):**
- AWS Amplify: 1000 build minutes/month free, then $0.01/min
- Neon PostgreSQL: Free tier (0.5GB, 3 projects)
- Total: ~$0-5/month for small usage

**After Free Tier:**
- Amplify hosting: ~$5-15/month
- Database: Free (Neon) or ~$15-30/month (RDS)

---

## 📝 Important URLs

- **AWS Amplify Console**: https://console.aws.amazon.com/amplify
- **GitHub Repo**: https://github.com/kd-lxdia/RockrSolar
- **Neon Dashboard**: https://console.neon.tech

## Need Help?

Check the other deployment guides in the repo:
- `AWS_QUICK_START.md` - Quick reference
- `AWS_DEPLOYMENT_GUIDE.md` - Detailed guide
- `DATABASE_SETUP.md` - Database specifics
