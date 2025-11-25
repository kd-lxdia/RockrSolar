# 🗄️ Database Setup Guide - Preventing Data Loss

## ⚠️ CRITICAL: Why Data Gets Deleted

Your data was being deleted because of these issues:

### Problem 1: Mock Database in Production
AWS Amplify build logs show:
```bash
export USE_MOCK_DB=true
```
This forces the app to use **local fallback storage** instead of your RDS database, which resets on every deployment.

### Problem 2: Auto-Initialization on Every Load
The app was calling `/api/db/init` on **every page load**, which could trigger reseeding if tables appeared empty.

---

## ✅ SOLUTION: Proper Database Configuration

### Step 1: Remove Mock Database Flag

**In AWS Amplify Console:**

1. Go to your Amplify app
2. Click "App settings" → "Environment variables"
3. **DELETE or set to false**: `USE_MOCK_DB`
4. Click "Save"

**Or update your build settings:**

Edit the build specification in Amplify Console:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 20
        - nvm use 20
        - node --version
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        # REMOVE THIS LINE: export USE_MOCK_DB=true
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Step 2: Set PostgreSQL Connection String

**Required Environment Variable:**

```
POSTGRES_URL=postgres://username:password@your-rds-endpoint.amazonaws.com:5432/database_name
```

**Example:**
```
POSTGRES_URL=postgres://admin:MySecurePass123@rsspl-db.abc123.us-east-1.rds.amazonaws.com:5432/rsspl_dashboard
```

**In AWS Amplify Console:**
1. Go to "App settings" → "Environment variables"
2. Add new variable:
   - Key: `POSTGRES_URL`
   - Value: Your RDS connection string
3. Click "Save"

### Step 3: Configure RDS Security Group

**Allow Amplify to connect to RDS:**

1. Go to AWS RDS Console
2. Select your database instance
3. Click on the VPC security group
4. Add inbound rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source: `0.0.0.0/0` (or Amplify's IP range)
   - Description: "Allow Amplify connection"

**⚠️ For production, use VPC peering or PrivateLink for better security**

---

## 🔧 Code Changes Applied

### Change 1: Removed Auto-Init on Page Load

**File: `lib/inventory-store-postgres.tsx`**

**BEFORE (CAUSED DATA LOSS):**
```typescript
useEffect(() => {
  const initializeData = async () => {
    await fetch('/api/db/init'); // ❌ Called every time app loads!
    await refreshData();
  };
  initializeData();
}, []);
```

**AFTER (SAFE):**
```typescript
useEffect(() => {
  const initializeData = async () => {
    // Only fetch data - tables auto-create on first query
    await refreshData(); // ✅ No initialization, just fetch
  };
  initializeData();
}, []);
```

### Change 2: Safer Seed Logic

**File: `lib/db.ts` - `seedInitialData()` function**

**BEFORE:**
```typescript
// Only checked items table
const { rows } = await sql`SELECT COUNT(*) as count FROM items`;
if (rows[0].count > 0) {
  return; // Skip seeding
}
```

**AFTER (TRIPLE CHECK):**
```typescript
// Check items, events, AND BOMs before seeding
const { rows: itemRows } = await sql`SELECT COUNT(*) as count FROM items`;
const { rows: eventRows } = await sql`SELECT COUNT(*) as count FROM events`;
const { rows: bomRows } = await sql`SELECT COUNT(*) as count FROM bom`;

// Skip if ANY data exists
if (itemRows[0].count > 0 || eventRows[0].count > 0 || bomRows[0].count > 0) {
  console.log('✅ Database has existing data, skipping seed');
  return;
}
```

---

## 📋 Manual Database Initialization (One-Time)

**Only run this ONCE when setting up a new database:**

### Option 1: Via Browser (Recommended)
1. Deploy your app to Amplify
2. Open browser and go to: `https://your-app-url.amplifyapp.com/api/db/init`
3. You should see: `{"success":true,"message":"Database initialized successfully"}`
4. Done! Never call this endpoint again.

### Option 2: Via SQL Client
Connect to your RDS instance and run the initialization SQL manually:

```sql
-- Create all tables (safe, won't drop existing data)
CREATE TABLE IF NOT EXISTS items (
  name VARCHAR(255) PRIMARY KEY,
  hsn_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS types (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  type_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_name, type_name)
);

CREATE TABLE IF NOT EXISTS sources (
  name VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  source_name VARCHAR(255) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_name, supplier_name)
);

CREATE TABLE IF NOT EXISTS brands (
  name VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(255) PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  item VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  brand VARCHAR(255) DEFAULT 'standard',
  qty INTEGER NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  source VARCHAR(255) NOT NULL,
  supplier VARCHAR(255) NOT NULL,
  kind VARCHAR(10) NOT NULL,
  invoice_no VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bom (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  project_in_kw DECIMAL(10,2) NOT NULL,
  wattage_of_panels INTEGER NOT NULL,
  panel_name VARCHAR(255),
  table_option VARCHAR(50) NOT NULL,
  phase VARCHAR(20) NOT NULL,
  ac_wire VARCHAR(255),
  dc_wire VARCHAR(255),
  la_wire VARCHAR(255),
  earthing_wire VARCHAR(255),
  no_of_legs INTEGER,
  front_leg VARCHAR(255),
  back_leg VARCHAR(255),
  roof_design VARCHAR(255),
  created_at BIGINT NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_item ON events(item);
CREATE INDEX IF NOT EXISTS idx_bom_created_at ON bom(created_at);
```

---

## 🔍 Verify Database Connection

**Check if your app is using RDS or mock database:**

1. Open browser developer console (F12)
2. Look for these log messages when app loads:

**✅ Connected to RDS:**
```
✅ Connected to PostgreSQL database
```

**❌ Using Mock (DATA WILL BE LOST):**
```
⚠️ Database unavailable - using local fallback storage
💡 To use real database: ensure network access to AWS RDS or deploy to production
```

---

## 🚨 Emergency Data Recovery

**If you lost data and need to recover:**

### Option 1: RDS Automated Backups
1. Go to AWS RDS Console
2. Select your database
3. Click "Actions" → "Restore to point in time"
4. Choose a time before data was deleted
5. Create a new instance from backup

### Option 2: Manual Backup (Prevent Future Loss)

**Set up automated backups:**

```bash
# Install PostgreSQL client
npm install -g pg

# Create backup script
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $POSTGRES_URL < backup_20251125.sql
```

---

## ✅ Deployment Checklist

Before deploying to Amplify:

- [ ] `POSTGRES_URL` environment variable is set in Amplify
- [ ] `USE_MOCK_DB` is removed or set to false
- [ ] RDS security group allows Amplify connections
- [ ] Database initialization was run once (manual or via /api/db/init)
- [ ] Test connection by checking browser console logs
- [ ] Verify existing data is visible in the app

---

## 📞 Troubleshooting

### Issue: "Database unavailable" in production
**Solution:** Check `POSTGRES_URL` environment variable is set in Amplify Console

### Issue: Connection timeout to RDS
**Solution:** Update RDS security group to allow inbound connections on port 5432

### Issue: Data disappears after deployment
**Solution:** 
1. Verify `USE_MOCK_DB` is not set to true
2. Check `POSTGRES_URL` is correct
3. Ensure `/api/db/init` is not being called automatically

### Issue: Can't connect from local development
**Solution:** 
1. Add your local IP to RDS security group
2. Or use SSH tunnel: `ssh -L 5432:rds-endpoint:5432 ec2-user@your-ec2-ip`

---

## 🎯 Best Practices

1. **Never use mock database in production**
2. **Only call `/api/db/init` once during initial setup**
3. **Enable RDS automated backups (7-35 days retention)**
4. **Use environment variables for all database credentials**
5. **Test database connection before deploying**
6. **Monitor RDS performance metrics in CloudWatch**

---

**Your data is now protected!** 🛡️

The code changes ensure:
- ✅ No automatic initialization on page load
- ✅ Triple-check before seeding (items, events, BOMs)
- ✅ Tables use `CREATE IF NOT EXISTS` (safe)
- ✅ No `DROP TABLE` or `TRUNCATE` commands
- ✅ Real database connection required for production
