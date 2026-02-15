# Auto Concierge - Production Deployment Guide

This guide covers everything you need to deploy your Auto Concierge application to Render.

## Architecture Overview

Your application consists of:
- **Frontend**: React + Vite + Tailwind CSS (static site)
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Database**: SQLite (file-based, stored on persistent disk)
- **Auth**: Supabase (for frontend), JWT (for backend API)

---

## Pre-Deployment Checklist

### 1. Generate Secure JWT Secret

Run this command locally to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save the output - you'll need it for Render environment variables.

### 2. Test Locally in Production Mode

Test your application locally before deploying:

```bash
# Backend (production mode)
cd backend
NODE_ENV=production npm start

# Frontend (in another terminal)
npm run build
npm run preview
```

---

## Deployment Options

### Option A: Manual Deployment (Recommended for First Time)

#### Step 1: Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `auto-concierge-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Advanced" → Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DB_PATH` = `/opt/render/project/src/auto-concierge.db`
   - `JWT_SECRET` = (your generated secret)
   - `CORS_ORIGIN` = `*` (for now, update later)
6. **Important**: Add a Persistent Disk
   - Click "Create Disk"
   - Size: 1GB minimum
   - Mount Path: `/opt/render/project/src`
7. Click "Deploy Web Service"

#### Step 2: Seed the Database (One Time)

After backend is deployed, run the seed script:

```bash
# From your local machine (temporarily allow access)
curl https://your-backend.onrender.com/api/health
curl -X POST https://your-backend.onrender.com/api/admin/seed
```

Or manually trigger seeding through your admin interface.

#### Step 3: Deploy Frontend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `auto-concierge-frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Add Environment Variables:
   - `VITE_API_URL` = `https://auto-concierge-backend.onrender.com`
   - `VITE_APP_ENV` = `production`
6. Click "Deploy Static Site"

#### Step 4: Update CORS

After frontend is deployed:
1. Go to your backend service on Render
2. Update `CORS_ORIGIN` to your frontend URL: `https://auto-concierge-frontend.onrender.com`
3. Redeploy backend

---

### Option B: Automated Deployment with Blueprint

We've created a `render.yaml` file for automated deployment.

1. Push your code to GitHub
2. Go to [Render Blueprint](https://dashboard.render.com/blueprints)
3. Click "New Blueprint Instance"
4. Connect your GitHub repository
5. Render will automatically create both services

**Note**: You'll still need to manually add the Persistent Disk for the backend.

---

## Environment Variables Reference

### Backend (.env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (Render assigns 10000) | `10000` |
| `NODE_ENV` | Environment mode | `production` |
| `DB_PATH` | Path to SQLite database | `/opt/render/project/src/auto-concierge.db` |
| `JWT_SECRET` | Secret for JWT tokens | (64-char hex string) |
| `CORS_ORIGIN` | Allowed frontend origin | `https://your-app.onrender.com` |

### Frontend (.env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-backend.onrender.com` |
| `VITE_APP_ENV` | Environment mode | `production` |

---

## Database Persistence

Your SQLite database is stored on a Render Persistent Disk:
- **Location**: `/opt/render/project/src/auto-concierge.db`
- **Backup**: Download periodically from Render dashboard or implement automated backups
- **Migration**: For schema changes, you'll need to modify the database manually or implement migration scripts

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGIN` matches your frontend URL exactly
   - Include `https://` prefix

2. **Database Not Found**
   - Verify Persistent Disk is attached
   - Check `DB_PATH` environment variable

3. **Build Failures**
   - Ensure all dependencies are in `package.json`
   - Check that `npm install` runs successfully

4. **Health Check Fails**
   - Backend may need 30-60 seconds to start
   - Check logs in Render dashboard

### Checking Logs

```bash
# View backend logs in Render dashboard
# Or use Render CLI
render logs -s auto-concierge-backend
```

---

## Post-Deployment Tasks

1. [ ] Verify backend health: `https://your-backend.onrender.com/health`
2. [ ] Test API endpoints with Postman or curl
3. [ ] Verify frontend loads correctly
4. [ ] Test user registration/login
5. [ ] Test booking flow
6. [ ] Set up monitoring alerts (optional)
7. [ ] Configure custom domain (optional)

---

## Estimated Costs (Render)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Backend Web Service | Free (or Starter) | $7/mo for persistent disk |
| Frontend Static Site | Free | $0 |
| PostgreSQL (optional upgrade) | Starter | $5/mo |

For SQLite with persistent disk: ~$7/month

---

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- Check backend logs in Render dashboard for detailed errors