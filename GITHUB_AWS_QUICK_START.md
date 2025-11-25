# 🚀 Quick Start: GitHub & AWS Deployment Guide

## Current Status
✅ All features completed (Serial Numbers + Customer Names)
✅ Deployment documentation created
✅ Docker configuration ready
✅ GitHub workflow exists
✅ PM2 config created

## 📋 Step-by-Step Deployment

### Step 1: Push to GitHub (5 minutes)

**Prerequisites:**
- Git installed on your system
- GitHub account with access to https://github.com/kd-lxdia/RockrSolar.git

**Commands to run:**

```powershell
# Navigate to project directory
cd "c:\humko khabar nhi\Shubham\RSSPL-Dashboard-main\salesdashboard"

# Initialize git (if not already done)
git init

# Configure git (use your GitHub credentials)
git config user.name "Your Name"
git config user.email "your-email@example.com"

# Add all files
git add .

# Commit with message
git commit -m "Initial commit: RSSPL Dashboard with Serial Numbers and Customer Names"

# Add GitHub remote
git remote add origin https://github.com/kd-lxdia/RockrSolar.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

**Expected Output:**
```
Enumerating objects: 100, done.
Counting objects: 100% (100/100), done.
Writing objects: 100% (100/100), done.
Total 100 (delta 0), reused 0 (delta 0)
To https://github.com/kd-lxdia/RockrSolar.git
 * [new branch]      main -> main
```

**If you get authentication errors:**
```powershell
# Use GitHub Personal Access Token
# Go to: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
# Create token with 'repo' scope
# Use token as password when prompted
```

---

### Step 2: Choose Deployment Method

## 🎯 RECOMMENDED: AWS Amplify (Easiest)

**Why Amplify?**
- ✅ Auto CI/CD from GitHub
- ✅ Auto SSL certificates
- ✅ Auto scaling
- ✅ Built-in monitoring
- ✅ No server management
- ✅ 15-minute setup

**Steps:**

1. **Go to AWS Amplify Console:**
   - Open https://console.aws.amazon.com/amplify
   - Click "New app" → "Host web app"

2. **Connect GitHub:**
   - Select "GitHub" as source
   - Authorize AWS Amplify to access your GitHub
   - Select repository: `kd-lxdia/RockrSolar`
   - Select branch: `main`

3. **Configure Build Settings:**
   - Amplify will auto-detect Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
   - Base directory: `salesdashboard` (if repo has multiple folders)

4. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   POSTGRES_URL=your_postgres_connection_string
   ```

5. **Review and Deploy:**
   - Click "Save and deploy"
   - Wait 5-10 minutes for initial deployment
   - You'll get a URL like: `https://main.d111111abcdef.amplifyapp.com`

6. **Custom Domain (Optional):**
   - In Amplify console, go to "Domain management"
   - Add your custom domain (e.g., dashboard.rockrsolar.com)
   - Follow DNS configuration instructions

**Cost:** ~$5-20/month depending on traffic

---

## 🖥️ Alternative: AWS EC2 (More Control)

**Use this if you need:**
- Full server control
- Custom configurations
- Cost optimization for low traffic

**Steps:**

1. **Launch EC2 Instance:**
   - Go to AWS EC2 Console
   - Click "Launch Instance"
   - Choose Ubuntu 22.04 LTS
   - Instance type: t2.medium or t3.medium
   - Storage: 20 GB
   - Security Group:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
     - Custom TCP (3000) from anywhere (for testing)

2. **Connect to EC2:**
   ```powershell
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Setup Server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install -y nginx
   
   # Clone repository
   cd /home/ubuntu
   git clone https://github.com/kd-lxdia/RockrSolar.git
   cd RockrSolar/salesdashboard
   
   # Install dependencies
   npm install
   
   # Create .env.local file
   nano .env.local
   # (Paste your environment variables)
   
   # Build application
   npm run build
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/rsspl
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/rsspl /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Setup SSL (Optional but Recommended):**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

6. **Setup Auto-Deployment:**
   - Go to GitHub repository → Settings → Secrets
   - Add these secrets:
     - `EC2_HOST`: Your EC2 public IP
     - `EC2_USER`: ubuntu
     - `EC2_SSH_PRIVATE_KEY`: Your private key content
     - `AWS_ACCESS_KEY_ID`: Your AWS access key
     - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   
   The GitHub workflow (`.github/workflows/deploy.yml`) will auto-deploy on push.

**Cost:** ~$15-30/month for t2.medium

---

## 🐳 Alternative: AWS ECS with Docker (Containers)

**Use this if you prefer:**
- Container orchestration
- Microservices architecture
- Kubernetes-like deployments

**Steps:**

1. **Build and Push Docker Image:**
   ```powershell
   # Login to AWS ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com
   
   # Create ECR repository
   aws ecr create-repository --repository-name rsspl-dashboard
   
   # Build image
   docker build -t rsspl-dashboard .
   
   # Tag image
   docker tag rsspl-dashboard:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/rsspl-dashboard:latest
   
   # Push to ECR
   docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/rsspl-dashboard:latest
   ```

2. **Create ECS Cluster:**
   - Go to AWS ECS Console
   - Create cluster with Fargate
   - Create task definition:
     - Container: Your ECR image
     - CPU: 512
     - Memory: 1024 MB
     - Port: 3000
     - Environment variables: Add all Firebase and Postgres vars

3. **Create ECS Service:**
   - Use the task definition
   - Desired tasks: 2
   - Load balancer: Application Load Balancer
   - Target group: Port 3000

**Cost:** ~$20-40/month for 2 tasks

---

## 📝 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] GitHub repository access
- [ ] AWS account with appropriate permissions
- [ ] Firebase project setup with credentials
- [ ] PostgreSQL database (Vercel Postgres, Neon, or AWS RDS)
- [ ] All environment variables ready
- [ ] Code pushed to GitHub main branch

---

## 🔐 Required Environment Variables

Create a `.env.local` file or add to AWS console:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Database Configuration
POSTGRES_URL=postgres://user:password@host:5432/database
```

**Where to get these:**
- **Firebase:** https://console.firebase.google.com → Project Settings → General
- **Postgres:** Vercel Postgres, Neon.tech, or AWS RDS connection string

---

## 🧪 Testing Before Production

**Local Test:**
```powershell
npm run build
npm start
# Open http://localhost:3000
```

**Docker Test:**
```powershell
docker-compose up
# Open http://localhost:3000
```

**Test Checklist:**
- [ ] Login works
- [ ] Fill Form BOM creates BOMs with serial numbers (ROR1, ROR2...)
- [ ] Custom BOM Creator works
- [ ] Customer names are saved
- [ ] Stock alerts show correct quantities
- [ ] Excel export includes Serial Number and Customer Name
- [ ] Search works for both serial number and customer name

---

## 📊 Post-Deployment Monitoring

**AWS Amplify:**
- Built-in monitoring in Amplify Console
- View logs, build history, performance metrics

**AWS EC2:**
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs rsspl-dashboard

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**AWS ECS:**
- CloudWatch Logs in AWS Console
- ECS task metrics (CPU, memory, network)

---

## 🚨 Troubleshooting

**Build Fails:**
- Check Node.js version (should be 18+)
- Verify all dependencies in package.json
- Check environment variables are set

**Database Connection Fails:**
- Verify POSTGRES_URL is correct
- Check database server is accessible from deployment
- Ensure database tables are created

**Firebase Auth Fails:**
- Verify all NEXT_PUBLIC_FIREBASE_* variables are set
- Check Firebase project has Email/Password auth enabled
- Verify domain is authorized in Firebase Console

**500 Error on Load:**
- Check server logs for errors
- Verify all environment variables are set correctly
- Test database connection manually

---

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ Application loads at your URL
- ✅ Login page appears and authentication works
- ✅ BOMs are created with auto-generated serial numbers (ROR1, ROR2...)
- ✅ Customer names are saved and displayed
- ✅ Stock alerts show correct data
- ✅ Excel export works with all fields

---

## 📞 Next Steps After Deployment

1. **Test All Features:**
   - Create a test BOM
   - Verify serial number generation
   - Add stock items
   - Check stock alerts
   - Download Excel export

2. **Configure Backups:**
   - Database: Enable automated backups
   - Files: Configure AWS S3 for file storage (if needed)

3. **Setup Monitoring:**
   - AWS CloudWatch alarms
   - Uptime monitoring (e.g., UptimeRobot)
   - Error tracking (e.g., Sentry)

4. **Share with Team:**
   - Provide login credentials
   - Share deployment URL
   - Document any custom configurations

---

## 🔗 Useful Links

- GitHub Repo: https://github.com/kd-lxdia/RockrSolar.git
- AWS Amplify Console: https://console.aws.amazon.com/amplify
- AWS EC2 Console: https://console.aws.amazon.com/ec2
- Firebase Console: https://console.firebase.google.com
- Vercel Postgres: https://vercel.com/storage/postgres
- Neon Database: https://neon.tech

---

**RECOMMENDED PATH:** AWS Amplify → Easiest setup, best for most cases
**Need Help?** All detailed instructions are in `DEPLOYMENT.md`
