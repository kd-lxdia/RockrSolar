# Railway Deployment Guide for RSSPL Sales Dashboard

This guide will walk you through deploying the RSSPL Sales Dashboard to Railway with PostgreSQL.

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Your code pushed to a GitHub repository

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Add PostgreSQL support for Railway deployment"
git push origin main
```

### 2. Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Login" and sign in with GitHub
3. Authorize Railway to access your repositories

### 3. Create a New Project

1. Click **"New Project"** in your Railway dashboard
2. Select **"Deploy from GitHub repo"**
3. Choose your repository from the list
4. Railway will automatically detect it's a Next.js app

### 4. Add PostgreSQL Database

1. In your project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway will provision a PostgreSQL database automatically

### 5. Link Database to Your App

Railway automatically sets these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

**You don't need to configure anything manually!**

### 6. Deploy

1. Railway will automatically build and deploy your app
2. The build process will:
   - Install dependencies
   - Build the Next.js application
   - Start the production server

### 7. Access Your Application

1. In your Railway project, click on your app service
2. Go to **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"**
5. Your app will be available at: `https://your-app-name.up.railway.app`

### 8. Verify Database Initialization

1. Visit your deployed app URL
2. The database will automatically initialize on first load
3. Check `/api/db/init` if you need to manually trigger initialization

## Troubleshooting

### Build Fails

If the build fails, check the logs in Railway:
1. Click on your service
2. Go to "Deployments" tab
3. Click on the failed deployment
4. Review the build logs

Common issues:
- **Missing dependencies**: Make sure `package.json` is up to date
- **TypeScript errors**: Fix any type errors locally first
- **Environment variables**: Railway should auto-inject database vars

### Database Connection Issues

If you see database connection errors:

1. **Check PostgreSQL service is running**:
   - Go to Railway dashboard
   - Make sure PostgreSQL service is active

2. **Verify environment variables**:
   - Click on your app service
   - Go to "Variables" tab
   - Make sure `POSTGRES_URL` is set

3. **Check database logs**:
   - Click on PostgreSQL service
   - Review logs for any errors

### Application Not Loading

1. **Check deployment status**:
   - Make sure deployment shows "Success"
   
2. **Review application logs**:
   - Click on your service
   - Check "Logs" tab for errors

3. **Verify domain is active**:
   - Go to Settings → Domains
   - Domain should show "Active" status

## Updating Your Application

Railway automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main
```

Railway will automatically:
1. Detect the push
2. Build the new version
3. Deploy with zero downtime

## Environment Variables (Optional)

If you need to add custom environment variables:

1. Click on your app service
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add your key-value pairs

## Monitoring

### View Logs

1. Click on your service
2. Go to "Logs" tab
3. See real-time logs from your application

### View Metrics

1. Click on your service
2. Go to "Metrics" tab
3. See CPU, Memory, and Network usage

## Database Management

### Connect to PostgreSQL

Railway provides connection details in the Variables tab:

Using `psql`:
```bash
psql $POSTGRES_URL
```

Or use a GUI tool like:
- pgAdmin
- DBeaver
- TablePlus

### Backup Database

1. Click on PostgreSQL service
2. Go to "Data" tab
3. Use Railway's backup features
4. Or use `pg_dump` with connection string

## Cost

- **Starter Plan**: $5/month (includes $5 credit)
- **Pay as you go**: Additional usage billed monthly
- Free trial available for testing

## Additional Features

### Custom Domain

1. Go to Settings → Domains
2. Click "Custom Domain"
3. Add your domain
4. Configure DNS as instructed

### Automatic SSL

Railway automatically provides SSL certificates for all domains.

### Monitoring & Alerts

Set up alerts in Railway dashboard for:
- Deployment failures
- High resource usage
- Service downtime

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues**: Report bugs in your repository

## Summary

✅ Push code to GitHub  
✅ Connect Railway to GitHub  
✅ Deploy from repository  
✅ Add PostgreSQL database  
✅ Railway auto-configures everything  
✅ Access your live application  

Your dashboard is now live and connected to PostgreSQL! 🎉
