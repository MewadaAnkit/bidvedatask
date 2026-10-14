#!/bin/sh
set -e

echo " Running database migrations..."
npx prisma migrate deploy || (npx prisma migrate resolve --applied 20261012000000_init && npx prisma migrate deploy)

echo " Running database seed..."
npm run prisma:seed

echo " Starting production server..."
exec node dist/server.js
