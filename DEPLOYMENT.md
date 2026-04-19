# Render Deployment Guide

## Database Configuration

Your StudyBuddy app uses PostgreSQL hosted on Render. The database credentials are:

- **HostName**: dpg-d7ihubvavr4c73fnjarg-a
- **Port**: 5432  
- **Database**: studybuddydb_6b7k
- **Username**: studybuddydb_6b7k_user
- **Password**: drbIRJxeyobmj1Yg2k1H1YUf25k9sUZI

### External Database URL (for Render services)
```
postgresql://studybuddydb_6b7k_user:drbIRJxeyobmj1Yg2k1H1YUf25k9sUZI@dpg-d7ihubvavr4c73fnjarg-a.virginia-postgres.render.com/studybuddydb_6b7k
```

---

## Setup in Render Dashboard

### 1. Backend Service - Environment Variables

Go to your **Backend Service** in Render and add this environment variable:

**Variable Name**: `DATABASE_URL`

**Value**:
```
postgresql://studybuddydb_6b7k_user:drbIRJxeyobmj1Yg2k1H1YUf25k9sUZI@dpg-d7ihubvavr4c73fnjarg-a.virginia-postgres.render.com/studybuddydb_6b7k
```

**Important**: The `sslmode=require` parameter will be added automatically by the code.

### 2. Frontend Service - Deploy to Netlify

Your frontend is now ready to deploy to Netlify. It already has:
- ✅ `netlify.toml` configuration file
- ✅ `.env.production` with backend API URL

---

## Deploy Frontend to Netlify

### Step-by-Step:

1. **Sign up/Login to Netlify**: https://netlify.com

2. **Connect your GitHub repository**:
   - Click "New site from Git"
   - Select "GitHub"
   - Choose your `StudyBuddy` repository
   - Branch: `main`

3. **Configure Build Settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Base directory**: `frontendl`

4. **Deploy**:
   - Netlify will automatically build and deploy
   - Your frontend URL will be displayed (e.g., `https://your-studybuddy.netlify.app`)

### Backend API Configuration

The frontend is already configured to use:
```
VITE_API_URL=https://studybuddy-1-sr8z.onrender.com
```

This is set in `frontendl/.env.production`

If you change the backend URL in the future, update:
1. `frontendl/.env.production` 
2. Redeploy to Netlify

---

## Local Development

To test locally with your Render database, the `.env` files already contain the configuration.

To run locally:
```bash
# Set environment variables (already in .env files)
export $(cat .env | xargs)
export $(cat backend/.env | xargs)

# Start with Docker Compose (if needed)
docker-compose up
```

Or the backend will automatically read from the `.env` file if available.

---

## Troubleshooting

If you see "Database not reachable" errors:

1. **Check DATABASE_URL is set in Render**: 
   - Go to Environment tab in Render dashboard
   - Verify `DATABASE_URL` variable exists

2. **Verify credentials**:
   - Use the PSQL command to test connection:
   ```bash
   PGPASSWORD=drbIRJxeyobmj1Yg2k1H1YUf25k9sUZI psql -h dpg-d7ihubvavr4c73fnjarg-a.virginia-postgres.render.com -U studybuddydb_6b7k_user studybuddydb_6b7k
   ```

3. **Check service logs**:
   - Look at Render deployment logs for detailed errors
   - Look for "📡 Using DATABASE_URL" message (indicates production mode)

---

## How the Code Works

The backend (`backend/internal/db/db.go`) automatically:
1. Checks for `DATABASE_URL` environment variable first (production)
2. If not found, falls back to individual env vars (development)
3. Adds `?sslmode=require` for security with Render

No code changes needed - just set the environment variables!
