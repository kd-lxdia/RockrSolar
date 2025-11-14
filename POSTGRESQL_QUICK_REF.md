# 🎯 PostgreSQL Setup - Quick Reference

## 🔑 Key Concept

**Without `POSTGRES_URL`** → Mock database (data lost on restart)  
**With `POSTGRES_URL`** → Real database (data persists forever)

---

## ⚡ 3-Step Deployment

### Vercel (5 min)
1. **Deploy**: Connect GitHub repo to Vercel
2. **Database**: Storage tab → Create Postgres
3. **Init**: Visit `your-app.vercel.app/api/db/init`

### Railway (7 min)
1. **Deploy**: New Project → Deploy from GitHub
2. **Database**: New → Database → PostgreSQL
3. **Connect**: Copy URL → Add as `POSTGRES_URL` variable
4. **Init**: Visit `your-app.railway.app/api/db/init`

---

## 🔧 Environment Variable

Only one required for production:

```bash
POSTGRES_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Get it from:**
- **Vercel**: Auto-added when you create database
- **Railway**: PostgreSQL service → Connect tab
- **Neon**: [neon.tech](https://neon.tech) → Connection string
- **Supabase**: Settings → Database → Connection string

---

## ✅ Verification Steps

1. Visit `/api/db/init` → Should return `{"success":true}`
2. Add item in Settings → Refresh page → Should persist
3. Create Stock IN event → Refresh → Should persist

---

## 📚 Full Documentation

- **Quick Start**: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- **Detailed Guide**: [POSTGRESQL_DEPLOYMENT.md](./POSTGRESQL_DEPLOYMENT.md)
- **Verification**: [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md)
- **README**: [README.md](./README.md)

---

## 🆓 Free Database Options

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Vercel Postgres** | 256 MB | Vercel deployments |
| **Railway** | 500 MB | Railway deployments |
| **Neon** | 3 GB | Any platform |
| **Supabase** | 500 MB | Any platform |

All include SSL and backups.

---

## 🚨 Troubleshooting

**"Using mock database" warning**  
→ Add `POSTGRES_URL` environment variable

**Data doesn't persist**  
→ Visit `/api/db/init` after deployment

**Connection errors**  
→ Check connection string includes `?sslmode=require`

**Timeout errors**  
→ Use pooled connection URL (Vercel `POSTGRES_PRISMA_URL`)

---

## 💡 Pro Tips

1. **Use Vercel Postgres with Vercel** - Auto-configuration
2. **Use Railway Postgres with Railway** - Zero setup
3. **Use Neon/Supabase for other platforms** - Works everywhere
4. **Always visit `/api/db/init`** after first deployment
5. **Check deployment logs** if issues occur

---

**Need Help?** See full guides in the links above.
