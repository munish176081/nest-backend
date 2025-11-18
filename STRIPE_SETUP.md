# Stripe Products and Prices Setup Guide

## Overview
Before subscriptions can be created, you need to set up Products and Prices in your Stripe Dashboard. Each listing type requires a Product with a recurring Price.

## Required Stripe Products and Prices

### 1. Semen Listing - $19/month
- **Product Name**: Semen Listing Subscription
- **Price**: $19.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `STRIPE_PRICE_ID_SEMEN`

### 2. Stud Listing - $39/month
- **Product Name**: Stud Listing Subscription
- **Price**: $39.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `STRIPE_PRICE_ID_STUD`

### 3. Future Listing - $19/month
- **Product Name**: Future Listing Subscription
- **Price**: $19.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `STRIPE_PRICE_ID_FUTURE`

### 4. Other Services Listing - $19/month
- **Product Name**: Other Services Listing Subscription
- **Price**: $19.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `STRIPE_PRICE_ID_OTHER_SERVICES`

### 5. Featured Add-on - $79/month
- **Product Name**: Featured & Homepage Gallery Add-on
- **Price**: $79.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `STRIPE_PRICE_ID_FEATURED`

## Setup Steps

### Option 1: Using Automated Script (Easiest) ⚡

We have a script that automatically creates all products and prices for you!

1. Make sure `STRIPE_SECRET_KEY` is set in your `.env` file
2. Run the script:
```bash
npm run create:stripe:products
```

The script will:
- Create all required products and prices
- Check if they already exist (won't create duplicates)
- Output the Price IDs you need to add to your `.env` file

3. Copy the output Price IDs and add them to your `.env` file:
```env
STRIPE_PRICE_ID_SEMEN=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_STUD=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_FUTURE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_OTHER_SERVICES=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_FEATURED=price_xxxxxxxxxxxxx
```

4. Restart your backend server

**Note**: The script works in both test and live mode based on your `STRIPE_SECRET_KEY`.

### Option 2: Using Stripe Dashboard (Manual)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. For each product above:
   - Enter the product name
   - Set price to the amount specified
   - Select **Recurring** billing
   - Set billing period to **Monthly**
   - Click **Save**
   - Copy the **Price ID** (starts with `price_`)

4. Add the Price IDs to your `.env` file:
```env
STRIPE_PRICE_ID_SEMEN=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_STUD=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_FUTURE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_OTHER_SERVICES=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_FEATURED=price_xxxxxxxxxxxxx
```

### Option 2: Using Stripe CLI

```bash
# Install Stripe CLI if not already installed
# https://stripe.com/docs/stripe-cli

# Create Semen Listing Product and Price
stripe products create \
  --name="Semen Listing Subscription" \
  --description="Monthly subscription for semen listings"

stripe prices create \
  --product=<PRODUCT_ID> \
  --unit-amount=1900 \
  --currency=usd \
  --recurring[interval]=month

# Repeat for other products...
```

### Option 3: Using Stripe API (Programmatic Setup)

You can create a setup script to create all products and prices programmatically. This is useful for development/testing.

## Verification

After setting up the products and prices:

1. Check that all environment variables are set in your `.env` file
2. Restart your backend server
3. Check the logs when creating a subscription - you should see the price IDs being used
4. If you see errors about "price ID not configured", verify the environment variable names match exactly

## Important Notes

- **Test Mode vs Live Mode**: Make sure you're using the correct Stripe keys (test vs live) and create products in the corresponding mode
- **Price IDs are unique**: Each price ID is unique to your Stripe account
- **Currency**: All prices are in USD. If you need other currencies, you'll need to create additional prices
- **Recurring**: All subscriptions are monthly recurring. The `total_cycles: 0` means they continue indefinitely until cancelled

## Troubleshooting

### Error: "Stripe price ID not configured for X"
- Check that the environment variable is set correctly
- Verify the variable name matches exactly (case-sensitive)
- Restart the backend server after adding environment variables

### Error: "This PaymentMethod was previously used"
- This happens when a payment method is used for a one-time payment and then tried to be reused for a subscription
- Solution: The code now handles this by checking if the payment method is already attached
- Alternative: Use a setup intent to collect a new payment method for subscriptions

