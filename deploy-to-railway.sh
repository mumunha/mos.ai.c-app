#!/bin/bash

echo "🚀 Deploying MOS•AI•C to Railway"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Logging into Railway..."
railway login

# Link to Railway project (if not already linked)
echo "🔗 Linking to Railway project..."
railway link

# Deploy the application
echo "📦 Deploying application..."
railway up

# Check deployment status
echo "✅ Deployment initiated!"
echo "📊 Check deployment status at: https://railway.app"
echo ""
echo "Next steps:"
echo "1. Enable PostgreSQL extensions in Railway dashboard"
echo "2. Set up environment variables"
echo "3. Run database migrations"
echo "4. Configure MinIO service"
echo ""
echo "See railway-deploy.md for detailed instructions."