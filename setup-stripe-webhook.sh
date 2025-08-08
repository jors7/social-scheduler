#!/bin/bash

echo "=== Setting up Stripe Webhook for Local Development ==="
echo ""
echo "This script will help you set up Stripe webhooks for local testing."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Login to Stripe CLI${NC}"
echo "Running: stripe login"
stripe login

echo ""
echo -e "${YELLOW}Step 2: Start webhook forwarding to localhost${NC}"
echo "This will forward Stripe events to your local server."
echo ""
echo -e "${GREEN}Run this command in a new terminal:${NC}"
echo ""
echo "stripe listen --forward-to localhost:3001/api/webhooks/stripe"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Copy the webhook signing secret that appears (starts with 'whsec_')"
echo "and update your .env.local file:"
echo ""
echo "STRIPE_WEBHOOK_SECRET_LOCAL=whsec_..."
echo ""
echo -e "${GREEN}Step 3: Test the webhook${NC}"
echo "In another terminal, trigger a test event:"
echo ""
echo "stripe trigger checkout.session.completed"
echo ""
echo -e "${YELLOW}Step 4: For production${NC}"
echo "Your production webhook secret should be different and configured in Vercel."
echo "STRIPE_WEBHOOK_SECRET=whsec_... (production secret from Stripe Dashboard)"
echo ""