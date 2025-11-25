# 🔧 NEW DATABASE CONFIGURATION

## ✅ Updated Database Credentials

**Old Database:** `rsspl-dashboard-db.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com`  
**New Database:** `database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com`  

### New Connection Details:
- **Host:** `database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com`
- **Database Name:** `RS`
- **Username:** `postgres`
- **Password:** `Solar235`
- **Port:** `5432`
- **SSL Mode:** `require`

---

## 🚀 CRITICAL: Update AWS Amplify Environment Variables

### Step 1: Go to AWS Amplify Console
1. Open AWS Console → AWS Amplify
2. Select your app (RockrSolar dashboard)
3. Click on **"App settings"** in the left sidebar
4. Click on **"Environment variables"**

### Step 2: Update POSTGRES_URL
Find the variable `POSTGRES_URL` and update it to:

```
postgresql://postgres:Solar235@database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com:5432/RS?sslmode=require
```

**⚠️ IMPORTANT:** Make sure:
- Database name is `RS` (not `postgres`)
- Host is `database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com`
- No extra spaces or line breaks

### Step 3: Redeploy
After updating the environment variable:
1. Go to the app's main page in Amplify Console
2. Click **"Redeploy this version"** or push a new commit
3. Wait for the build to complete

---

## 🔒 Configure RDS Security Group

To allow AWS Amplify to connect to your new database:

### Step 1: Find the Security Group
1. Go to AWS RDS Console
2. Click on your database: `database-1`
3. Scroll down to **"Connectivity & security"** section
4. Note the **Security group ID** (looks like `sg-xxxxxxxxx`)

### Step 2: Add Amplify IPs (if needed)
1. Click on the Security Group ID
2. Go to **"Inbound rules"** tab
3. Click **"Edit inbound rules"**
4. Make sure there's a rule allowing:
   - **Type:** PostgreSQL
   - **Protocol:** TCP
   - **Port:** 5432
   - **Source:** AWS Amplify's IP range OR `0.0.0.0/0` (all IPs - less secure but works)

### Step 3: For Local Development (Optional)
To connect from your local machine:
1. Add another rule with:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** My IP (it will auto-detect your current IP)

---

## 🧪 Test the Connection

After updating AWS Amplify environment variables and redeploying:

1. **Open the deployed app URL**
2. **Go to Stock IN** and add some test data
3. **Refresh the page** - data should persist
4. **Redeploy the app again** - data should still be there

---

## 📋 What Changed

### ✅ Updated Files:
- `.env.local` - Updated with new database connection string

### ⚠️ Still Using Fallback Locally:
If you can't connect to RDS from your local machine (security group blocking), the app will use localStorage fallback. This is normal and expected.

### ✅ Production Will Use Real Database:
Once you update the AWS Amplify environment variable, production will connect to the new `database-1` RDS instance.

---

## 🔍 Troubleshooting

### Issue: "Data disappearing on refresh in production"
**Solution:** Make sure you updated the `POSTGRES_URL` environment variable in AWS Amplify Console and redeployed.

### Issue: "Can't connect to database locally"
**Solution:** This is normal. Add your local IP to the RDS security group, or just test on the deployed app.

### Issue: "Database connection timeout"
**Solution:** Check that the security group allows inbound connections on port 5432.

---

## ✅ Next Steps

1. **Update AWS Amplify environment variable** (CRITICAL)
2. **Redeploy the app**
3. **Test Stock IN/OUT on deployed app**
4. **Verify data persists across refreshes**
5. **(Optional)** Add local IP to security group for local development

---

**Connection String Template:**
```
postgresql://postgres:Solar235@database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com:5432/RS?sslmode=require
```

**Remember:** The local `.env.local` file is already updated. You only need to update AWS Amplify's environment variables!
