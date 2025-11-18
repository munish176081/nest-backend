# PayPal Products and Plans Setup Guide

## Overview
Before PayPal subscriptions can be created, you need to set up Products and Billing Plans in your PayPal Developer Dashboard. Each listing type requires a Product with a recurring Billing Plan.

## Required PayPal Products and Plans

### 1. Semen Listing - $19/month
- **Product Name**: Semen Listing Subscription
- **Plan Name**: Semen Listing Monthly Plan
- **Price**: $19.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_SEMEN`

### 2. Stud Listing - $39/month
- **Product Name**: Stud Listing Subscription
- **Plan Name**: Stud Listing Monthly Plan
- **Price**: $39.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_STUD`

### 3. Future Listing - $19/month
- **Product Name**: Future Listing Subscription
- **Plan Name**: Future Listing Monthly Plan
- **Price**: $19.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_FUTURE`

### 4. Other Services Listing - $19/month
- **Product Name**: Other Services Listing Subscription
- **Plan Name**: Other Services Monthly Plan
- **Price**: $19.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_OTHER_SERVICES`

### 5. Featured Add-on - $79/month
- **Product Name**: Featured & Homepage Gallery Add-on
- **Plan Name**: Featured Add-on Monthly Plan
- **Price**: $79.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_FEATURED`

### 6. Puppy Litter Listing (with Featured) - $128/month
- **Product Name**: Puppy Litter Listing with Featured
- **Plan Name**: Puppy Litter with Featured Monthly Plan
- **Price**: $128.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_PUPPY_LITTER_WITH_FEATURED`

### 7. Puppy Litter Listing (without Featured) - $49/month
- **Product Name**: Puppy Litter Listing
- **Plan Name**: Puppy Litter Monthly Plan
- **Price**: $49.00 USD
- **Billing Period**: Monthly (recurring)
- **Environment Variable**: `PAYPAL_PLAN_ID_PUPPY_LITTER_WITHOUT_FEATURED`

## Setup Steps

### Option 1: Using PayPal Dashboard (Recommended)

#### Step 1: Access PayPal Developer Dashboard
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard)
2. Log in with your PayPal business account
3. Select your app or create a new one
4. Note your **Client ID** and **Secret** (you'll need these for environment variables)

#### Step 2: Create Products
For each product above:

1. Navigate to **Products** → **Create Product**
2. Fill in the product details:
   - **Product Name**: (e.g., "Semen Listing Subscription")
   - **Description**: (e.g., "Monthly subscription for semen listings")
   - **Product Type**: Select **Service**
   - **Category**: Select **Software**
3. Click **Save**
4. **Copy the Product ID** (you'll need it for creating the plan)

#### Step 3: Create Billing Plans
For each product, create a billing plan:

1. Go to **Products** → Select your product → **Plans** → **Create Plan**
2. Fill in plan details:
   - **Plan Name**: (e.g., "Semen Listing Monthly Plan")
   - **Description**: (e.g., "Monthly recurring subscription")
   - **Billing Cycle**:
     - **Frequency**: Monthly
     - **Price**: Enter the amount (e.g., $19.00)
     - **Currency**: USD
   - **Payment Preferences**:
     - **Auto-billing**: Enabled
     - **Payment Failure Action**: Continue billing
   - **Plan Status**: **ACTIVE**
3. Click **Create Plan**
4. **Copy the Plan ID** (starts with `P-` or `I-`)
5. Add it to your `.env` file

#### Step 4: Add Plan IDs to Environment Variables

Add the Plan IDs to your `nest-backend/.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_SECRET=your_secret_here
PAYPAL_ENVIRONMENT=sandbox  # or 'production' for live mode

# PayPal Plan IDs
PAYPAL_PLAN_ID_SEMEN=P-XXXXXXXXXXXXX
PAYPAL_PLAN_ID_STUD=P-XXXXXXXXXXXXX
PAYPAL_PLAN_ID_FUTURE=P-XXXXXXXXXXXXX
PAYPAL_PLAN_ID_OTHER_SERVICES=P-XXXXXXXXXXXXX
PAYPAL_PLAN_ID_FEATURED=P-XXXXXXXXXXXXX
PAYPAL_PLAN_ID_PUPPY_LITTER_WITH_FEATURED=P-XXXXXXXXXXXXX
PAYPAL_PLAN_ID_PUPPY_LITTER_WITHOUT_FEATURED=P-XXXXXXXXXXXXX
```

### Option 2: Using PayPal API (Programmatic Setup)

You can create a script similar to the Stripe setup script. Here's an example:

```typescript
// scripts/create-paypal-products.ts
import { PayPalHttpClient, ProductsProductsCreateRequest, PlansPlansCreateRequest } from '@paypal/checkout-server-sdk';

// Initialize PayPal client
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// Create product
const productRequest = new ProductsProductsCreateRequest();
productRequest.requestBody({
  name: 'Semen Listing Subscription',
  description: 'Monthly subscription for semen listings',
  type: 'SERVICE',
  category: 'SOFTWARE',
});

const product = await client.execute(productRequest);
const productId = product.result.id;

// Create plan
const planRequest = new PlansPlansCreateRequest();
planRequest.requestBody({
  product_id: productId,
  name: 'Semen Listing Monthly Plan',
  description: 'Monthly recurring subscription',
  billing_cycles: [
    {
      frequency: {
        interval_unit: 'MONTH',
        interval_count: 1,
      },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0, // 0 means infinite
      pricing_scheme: {
        fixed_price: {
          value: '19.00',
          currency_code: 'USD',
        },
      },
    },
  ],
  payment_preferences: {
    auto_bill_outstanding: true,
    setup_fee: {
      value: '0',
      currency_code: 'USD',
    },
    setup_fee_failure_action: 'CONTINUE',
    payment_failure_threshold: 3,
  },
  taxes: {
    percentage: '0',
    inclusive: false,
  },
  status: 'ACTIVE',
});

const plan = await client.execute(planRequest);
const planId = plan.result.id;
console.log(`Plan ID: ${planId}`);
```

## Verification

After setting up the products and plans:

1. Check that all environment variables are set in your `.env` file
2. Restart your backend server
3. Check the logs when creating a PayPal subscription - you should see the plan IDs being used
4. If you see errors about "plan ID not configured", verify the environment variable names match exactly

## Important Notes

- **Sandbox vs Live Mode**: 
  - Use `PAYPAL_ENVIRONMENT=sandbox` for testing
  - Use `PAYPAL_ENVIRONMENT=production` for live mode
  - Create products/plans in the corresponding environment

- **Plan IDs are unique**: Each plan ID is unique to your PayPal account and environment

- **Currency**: All plans are in USD. If you need other currencies, you'll need to create additional plans

- **Recurring**: All subscriptions are monthly recurring. The `total_cycles: 0` means they continue indefinitely until cancelled

- **Plan Status**: Plans must be **ACTIVE** to be used for subscriptions

## Troubleshooting

### Error: "PayPal plan ID not configured for X"
- Check that the environment variable is set correctly
- Verify the variable name matches exactly (case-sensitive)
- Restart the backend server after adding environment variables
- Ensure the plan ID starts with `P-` or `I-`

### Error: "PayPal is not configured"
- Check that `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` are set
- Verify `PAYPAL_ENVIRONMENT` is set to either `sandbox` or `production`
- Ensure the credentials are valid for the selected environment

### Plan Not Found
- Verify the plan ID is correct
- Check that the plan is in **ACTIVE** status
- Ensure you're using the correct environment (sandbox vs production)
- Verify the plan belongs to the same PayPal account as your app credentials

## Next Steps

After creating all PayPal products and plans:

1. Add all Plan IDs to your `.env` file
2. Restart the backend server
3. Test subscription creation with PayPal
4. Update frontend to use PayPal plan IDs (similar to Stripe price IDs)

