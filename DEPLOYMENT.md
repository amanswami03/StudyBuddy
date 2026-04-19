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

### 2. Frontend Service - Environment Variables

Go to your **Frontend Service** in Render and add:

**Variable Name**: `VITE_API_URL`

**Value**: (Replace with your actual backend service URL)
```
https://your-backend-service-name.onrender.com
```

### 3. Deploy

After setting the environment variables:
1. Click **Deploy** on both services
2. Monitor the deployment logs
3. Check if the database connection succeeds (look for ✅ Connected to DB)

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
