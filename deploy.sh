#!/bin/bash
cd /home/ec2-user/pups4sale/nest-backend
git pull origin main
pnpm install
npm run build
pm2 restart backend