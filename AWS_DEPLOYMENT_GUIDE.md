# AWS Deployment Guide for Sales Dashboard

Complete guide to deploy your Next.js Sales Dashboard on AWS with PostgreSQL.

## 🎯 AWS Deployment Options

### Option 1: AWS Amplify (Easiest - Recommended)
- ✅ Automatic deployments from GitHub
- ✅ Built-in CI/CD
- ✅ Free tier available
- ✅ Automatic SSL certificates
- ✅ Global CDN

### Option 2: AWS App Runner
- ✅ Container-based deployment
- ✅ Automatic scaling
- ✅ Pay per use
- ✅ Simple setup

### Option 3: ECS Fargate + ALB
- ✅ Full container orchestration
- ✅ Advanced scaling options
- ✅ Production-grade
- ⚠️ More complex setup

### Option 4: EC2 + PM2
- ✅ Full server control
- ✅ Traditional deployment
- ⚠️ Manual management required

---

## 🚀 Option 1: AWS Amplify (Recommended)

### Prerequisites
- AWS Account
- GitHub repository with your code
- PostgreSQL database (use AWS RDS or Neon.tech)

### Step 1: Set Up PostgreSQL Database

#### Option A: Use Neon.tech (Free - Easiest)
1. Go to https://neon.tech
2. Create free account
3. Create new project
4. Copy connection string
5. Format: `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`

#### Option B: Use AWS RDS PostgreSQL
1. Go to AWS Console → RDS
2. Click "Create database"
3. Choose:
   - **Engine**: PostgreSQL 15+
   - **Template**: Free tier (for testing) or Production
   - **DB instance class**: db.t3.micro (free tier)
   - **Storage**: 20 GB
   - **Username**: postgres
   - **Password**: (create strong password)
4. Under **Connectivity**:
   - **Public access**: Yes (for Amplify to connect)
   - **VPC security group**: Create new
5. Click **Create database**
6. Wait 5-10 minutes for provisioning
7. Copy the **Endpoint** from RDS dashboard
8. Connection string format: `postgresql://postgres:PASSWORD@endpoint.rds.amazonaws.com:5432/postgres?sslmode=require`

### Step 2: Deploy to AWS Amplify

1. **Go to AWS Amplify Console**
   - Visit: https://console.aws.amazon.com/amplify
   - Click **"Get Started"** under "Host your web app"

2. **Connect Repository**
   - Select **GitHub**
   - Authorize AWS Amplify
   - Choose repository: `khushi-dutta/dashboard`
   - Choose branch: `main`
   - Click **Next**

3. **Configure Build Settings**
   - App name: `sales-dashboard` (or your choice)
   - Amplify will auto-detect Next.js
   - Build settings should auto-populate:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
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
         - node_modules/**/*
   ```
   - Click **Next**

4. **Add Environment Variables**
   - Click **Advanced settings** (expand)
   - Add environment variables:
   
   | Key | Value |
   |-----|-------|
   | `POSTGRES_URL` | Your PostgreSQL connection string |
   | `NODE_ENV` | `production` |
   
   Example:
   ```
   POSTGRES_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

5. **Review and Deploy**
   - Review all settings
   - Click **Save and deploy**
   - Wait 5-10 minutes for initial deployment

6. **Initialize Database**
   - Once deployed, find your app URL (e.g., `https://main.xxxxx.amplifyapp.com`)
   - Visit: `https://your-app.amplifyapp.com/api/db/init`
   - Confirm success: `{"success":true,"message":"Database initialized successfully"}`

7. **Test Your App**
   - Visit your Amplify URL
   - Add items, types, HSN codes
   - Create Stock IN/OUT events
   - Refresh page - data should persist!

### Step 3: Configure Custom Domain (Optional)

1. In Amplify Console, go to **Domain management**
2. Click **Add domain**
3. Enter your domain name
4. Follow DNS configuration steps
5. SSL certificate auto-provisioned

### Step 4: Set Up Automatic Deployments

✅ Already configured! Every push to `main` branch auto-deploys.

**To deploy specific branch:**
1. Amplify Console → App settings → Build settings
2. Add branch pattern
3. Amplify will deploy that branch to a separate URL

---

## 🐳 Option 2: AWS App Runner

### Prerequisites
- Docker installed locally
- AWS CLI configured
- ECR repository created

### Step 1: Create Dockerfile

Already exists in your project. If not, create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

Update `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
};
```

### Step 2: Build and Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name sales-dashboard --region us-east-1

# Build image
docker build -t sales-dashboard .

# Tag image
docker tag sales-dashboard:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/sales-dashboard:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/sales-dashboard:latest
```

### Step 3: Create App Runner Service

1. Go to AWS Console → App Runner
2. Click **Create service**
3. **Source**:
   - Repository type: Container registry
   - Provider: Amazon ECR
   - Container image URI: (select your image)
4. **Deployment settings**:
   - Automatic (deploys on new image push)
5. **Service settings**:
   - Service name: `sales-dashboard`
   - Port: `3000`
   - Environment variables:
     - `POSTGRES_URL`: Your database connection string
     - `NODE_ENV`: `production`
6. **Review and create**

7. **Initialize Database**
   - Visit: `https://your-service.awsapprunner.com/api/db/init`

---

## 🔧 Option 3: ECS Fargate (Advanced)

### Step 1: Create ECS Cluster
```bash
aws ecs create-cluster --cluster-name sales-dashboard-cluster --region us-east-1
```

### Step 2: Create Task Definition

Save as `task-definition.json`:
```json
{
  "family": "sales-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "sales-dashboard",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/sales-dashboard:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "POSTGRES_URL",
          "value": "your-postgres-connection-string"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sales-dashboard",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Step 3: Create ECS Service

```bash
aws ecs create-service \
  --cluster sales-dashboard-cluster \
  --service-name sales-dashboard-service \
  --task-definition sales-dashboard \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 4: Set Up Application Load Balancer

1. Create ALB in AWS Console
2. Create target group (port 3000)
3. Update ECS service to use ALB
4. Configure health checks: `/api/db/init`

---

## 🖥️ Option 4: EC2 + PM2 (Traditional)

### Step 1: Launch EC2 Instance

1. Go to EC2 Console
2. Click **Launch Instance**
3. Choose:
   - **AMI**: Amazon Linux 2023 or Ubuntu 22.04
   - **Instance type**: t2.micro (free tier) or t3.small
   - **Key pair**: Create new or use existing
   - **Network**: Allow HTTP (80) and HTTPS (443)
4. Launch instance

### Step 2: Connect and Install Dependencies

```bash
# Connect via SSH
ssh -i your-key.pem ec2-user@your-instance-ip

# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs  # Amazon Linux
# OR
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs  # Ubuntu

# Install PM2
sudo npm install -g pm2

# Install Git
sudo yum install git -y  # Amazon Linux
# OR
sudo apt install git -y  # Ubuntu
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/khushi-dutta/dashboard.git
cd dashboard/salesdashboard

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
POSTGRES_URL=your-postgres-connection-string
NODE_ENV=production
EOF

# Build application
npm run build

# Start with PM2
pm2 start npm --name "sales-dashboard" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 4: Set Up Nginx as Reverse Proxy

```bash
# Install Nginx
sudo yum install nginx -y  # Amazon Linux
# OR
sudo apt install nginx -y  # Ubuntu

# Configure Nginx
sudo tee /etc/nginx/conf.d/sales-dashboard.conf > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 5: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx -y  # Amazon Linux
# OR
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Step 6: Initialize Database

Visit: `http://your-domain.com/api/db/init`

---

## 🗄️ Database Options Summary

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Neon.tech** | 3 GB | Quick setup, development |
| **AWS RDS** | 750 hours/month (12 months) | AWS-native integration |
| **Supabase** | 500 MB | Open source, features |
| **Railway** | $5 credit/month | Simple deployment |

---

## 📊 Cost Estimates (Monthly)

### Amplify + Neon
- Amplify: $0-15 (depends on traffic)
- Neon: $0 (free tier)
- **Total: ~$0-15/month**

### App Runner + RDS
- App Runner: ~$25-50
- RDS t3.micro: ~$15-20
- **Total: ~$40-70/month**

### ECS Fargate + RDS
- Fargate: ~$15-30
- ALB: ~$16
- RDS: ~$15-20
- **Total: ~$46-66/month**

### EC2 + RDS
- EC2 t3.small: ~$15
- RDS t3.micro: ~$15-20
- **Total: ~$30-35/month**

---

## ✅ Recommended Setup for Production

**For Small Business (< 1000 users):**
- **Hosting**: AWS Amplify
- **Database**: Neon.tech (free tier)
- **Cost**: ~$0-15/month
- **Setup Time**: 15 minutes

**For Medium Business (1000-10000 users):**
- **Hosting**: AWS App Runner or Amplify
- **Database**: AWS RDS (db.t3.small)
- **Cost**: ~$50-80/month
- **Setup Time**: 30-60 minutes

**For Enterprise (10000+ users):**
- **Hosting**: ECS Fargate + ALB
- **Database**: AWS RDS (Multi-AZ)
- **Cost**: ~$150-500/month
- **Setup Time**: 2-4 hours

---

## 🚨 Important Security Notes

1. **Never commit `.env` files** - Use AWS Secrets Manager
2. **Enable RDS encryption** at rest
3. **Use VPC** for RDS (don't expose publicly in production)
4. **Enable CloudWatch** logging
5. **Set up AWS WAF** for DDoS protection
6. **Regular backups** - Enable automated RDS snapshots

---

## 📞 Need Help?

- AWS Amplify Docs: https://docs.amplify.aws
- AWS App Runner Docs: https://docs.aws.amazon.com/apprunner
- AWS ECS Docs: https://docs.aws.amazon.com/ecs

---

**Ready to deploy? Start with Option 1 (Amplify) - it's the fastest!** 🚀
