#!/bin/sh
set -e

echo " Running database migrations..."
npx prisma migrate deploy || (npx prisma migrate resolve --applied 20261012000000_init && npx prisma migrate deploy)

echo " Running database seed..."
node dist/prisma/seed.js

echo " Starting production server..."
exec node dist/server.js
