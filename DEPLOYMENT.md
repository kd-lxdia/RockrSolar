# Deployment Guide - RSSPL Dashboard

## GitHub Repository Setup

### 1. Initialize Git (if not already done)
```bash
cd "c:\humko khabar nhi\Shubham\RSSPL-Dashboard-main\salesdashboard"
git init
git add .
git commit -m "Initial commit: RSSPL Sales Dashboard"
```

### 2. Add Remote and Push
```bash
git remote add origin https://github.com/kd-lxdia/RockrSolar.git
git branch -M main
git push -u origin main
```

## AWS Deployment Options

### Option 1: AWS Amplify (Recommended - Easiest)

#### Benefits:
- Automatic CI/CD from GitHub
- Built-in SSL certificate
- Auto-scaling
- Easy environment variables management

#### Steps:
1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/

2. **Connect Repository**
   - Click "New app" → "Host web app"
   - Choose "GitHub" as source
   - Authorize AWS Amplify to access your GitHub
   - Select repository: `kd-lxdia/RockrSolar`
   - Select branch: `main`

3. **Configure Build Settings**
   - Amplify will auto-detect Next.js
   - Verify the build settings (should auto-populate):
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

4. **Environment Variables**
   Add in Amplify Console → App Settings → Environment Variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   POSTGRES_URL=your_postgres_connection_string
   ```

5. **Deploy**
   - Click "Save and deploy"
   - Amplify will automatically build and deploy
   - You'll get a URL like: `https://main.xxxxx.amplifyapp.com`

6. **Custom Domain (Optional)**
   - Go to Domain management
   - Add your custom domain
   - Follow DNS configuration steps

---

### Option 2: AWS EC2 with PM2

#### Steps:

1. **Launch EC2 Instance**
   - AMI: Ubuntu Server 22.04 LTS
   - Instance Type: t3.medium (or larger for production)
   - Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Next.js)

2. **Connect to EC2 and Install Dependencies**
   ```bash
   # SSH into your instance
   ssh -i your-key.pem ubuntu@your-ec2-ip

   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Install Git
   sudo apt install -y git
   ```

3. **Clone and Setup Application**
   ```bash
   # Clone repository
   git clone https://github.com/kd-lxdia/RockrSolar.git
   cd RockrSolar

   # Install dependencies
   npm install

   # Create .env.local file
   nano .env.local
   # Add your environment variables (see below)

   # Build application
   npm run build
   ```

4. **Create PM2 Ecosystem File**
   ```bash
   nano ecosystem.config.js
   ```
   
   Content:
   ```javascript
   module.exports = {
     apps: [{
       name: 'rsspl-dashboard',
       script: 'npm',
       args: 'start',
       cwd: '/home/ubuntu/RockrSolar',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   }
   ```

5. **Start Application with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx as Reverse Proxy**
   ```bash
   sudo apt install -y nginx

   # Create Nginx config
   sudo nano /etc/nginx/sites-available/rsspl-dashboard
   ```
   
   Content:
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
   # Enable site
   sudo ln -s /etc/nginx/sites-available/rsspl-dashboard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

### Option 3: AWS ECS with Docker

#### Steps:

1. **Create Dockerfile** (already provided below)

2. **Build and Push to ECR**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name rsspl-dashboard

   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com

   # Build image
   docker build -t rsspl-dashboard .

   # Tag image
   docker tag rsspl-dashboard:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/rsspl-dashboard:latest

   # Push image
   docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/rsspl-dashboard:latest
   ```

3. **Create ECS Cluster**
   - Go to AWS ECS Console
   - Create cluster (Fargate or EC2)

4. **Create Task Definition**
   - Use the Docker image from ECR
   - Set environment variables
   - Configure CPU/Memory

5. **Create Service**
   - Create Application Load Balancer
   - Configure target group
   - Deploy service with desired task count

---

## Environment Variables (.env.local)

Create this file in your project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Database (if using Vercel Postgres or other)
POSTGRES_URL=postgresql://user:password@host:5432/database
```

---

## Pre-Deployment Checklist

- [ ] All environment variables are configured
- [ ] Firebase project is created and configured
- [ ] Database is set up (Vercel Postgres, Neon, or AWS RDS)
- [ ] Build completes without errors locally: `npm run build`
- [ ] GitHub repository is updated with latest code
- [ ] .env.local is added to .gitignore (do NOT commit secrets)

---

## Monitoring and Maintenance

### For AWS Amplify:
- Check build logs in Amplify Console
- Monitor application logs in CloudWatch

### For EC2:
```bash
# View PM2 logs
pm2 logs rsspl-dashboard

# Monitor application
pm2 monit

# Restart application
pm2 restart rsspl-dashboard

# Update application
cd /home/ubuntu/RockrSolar
git pull origin main
npm install
npm run build
pm2 restart rsspl-dashboard
```

---

## Troubleshooting

### Build Fails
- Check Node.js version (requires 18+)
- Verify all dependencies are installed
- Check environment variables are set

### Application Won't Start
- Check PM2 logs: `pm2 logs`
- Verify port 3000 is not in use
- Check environment variables are loaded

### Database Connection Issues
- Verify POSTGRES_URL is correct
- Check firewall rules allow connections
- Test connection from EC2 instance

---

## Support

For issues or questions:
- Check GitHub Issues: https://github.com/kd-lxdia/RockrSolar/issues
- Review Next.js deployment docs: https://nextjs.org/docs/deployment
