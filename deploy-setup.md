# Railway Deployment Setup

After deploying to Railway, you need to initialize the database. Here are three ways to do it:

## Option 1: Via Railway CLI (Recommended)

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run database setup
railway run npm run setup:db
```

## Option 2: Via Admin Panel

1. Go to your deployed app URL: `https://your-app.railway.app`
2. Navigate to `/admin/database-setup`
3. Click "Initialize Database"
4. Wait for completion

## Option 3: Manual Railway Console

1. Go to Railway dashboard → Your project → Web service
2. Open "Deploy Logs" tab
3. Click on "View deployment"
4. Run command: `npm run setup:db`

## Verification

After setup, visit your app and try to:
1. Create an account at `/auth/signup`
2. Login at `/auth/login`
3. Access the dashboard

## Troubleshooting

If you get connection errors:
- Ensure all environment variables are set correctly
- Check that PostgreSQL service is running
- Verify DATABASE_URL is the public URL (not internal Railway URL)
- Make sure pgvector extension is available in your PostgreSQL instance