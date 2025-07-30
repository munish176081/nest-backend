#!/bin/bash

echo "=== Deployment Check Script ==="
echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Not in the correct directory. Please run this from the nest-backend folder."
    exit 1
fi

echo "✅ In correct directory"
echo ""

# Check git status
echo "=== Git Status ==="
if [ -d ".git" ]; then
    echo "Current branch: $(git branch --show-current)"
    echo "Latest commit: $(git log --oneline -1)"
    echo "Remote origin: $(git remote get-url origin)"
    echo ""
    
    # Check if we're behind
    git fetch origin build
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/build)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "✅ Repository is up to date"
    else
        echo "⚠️  Repository is behind. Pulling latest changes..."
        git pull origin build
    fi
else
    echo "❌ Not a git repository"
fi
echo ""

# Check Node.js and pnpm
echo "=== Environment Check ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "PNPM version: $(pnpm --version)"
echo ""

# Check PM2
echo "=== PM2 Status ==="
if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""
    echo "PM2 Logs (last 20 lines):"
    pm2 logs backend --lines 20 --nostream
else
    echo "❌ PM2 not installed"
fi
echo ""

# Check if app is running
echo "=== Application Check ==="
if curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "✅ Application is responding on port 3001"
else
    echo "❌ Application is not responding on port 3001"
fi

echo ""
echo "=== Check Complete ===" 