/**
 * Script to create PayPal Products and Billing Plans
 * 
 * This script creates all required PayPal products and plans for subscriptions.
 * Run with: npm run create:paypal:products
 * 
 * Make sure PAYPAL_CLIENT_ID, PAYPAL_SECRET, and PAYPAL_ENVIRONMENT are set in your .env file
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

interface ProductConfig {
  name: string;
  description: string;
  price: number; // in dollars
  currency: string;
  envVarName: string;
}

const productsToCreate: ProductConfig[] = [
  {
    name: 'Semen Listing Subscription',
    description: 'Monthly subscription for semen listings',
    price: 19.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_SEMEN',
  },
  {
    name: 'Stud Listing Subscription',
    description: 'Monthly subscription for stud or bitch listings',
    price: 39.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_STUD',
  },
  {
    name: 'Future Listing Subscription',
    description: 'Monthly subscription for future listings',
    price: 19.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_FUTURE',
  },
  {
    name: 'Other Services Listing Subscription',
    description: 'Monthly subscription for other services listings',
    price: 19.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_OTHER_SERVICES',
  },
  {
    name: 'Featured & Homepage Gallery Add-on',
    description: 'Monthly recurring subscription for featured listing and homepage gallery placement',
    price: 79.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_FEATURED',
  },
  {
    name: 'Puppy Litter Listing with Featured',
    description: 'Monthly subscription for puppy litter listing with featured and homepage gallery placement ($49 base + $79 featured)',
    price: 128.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_PUPPY_LITTER_WITH_FEATURED',
  },
  {
    name: 'Puppy Litter Listing without Featured',
    description: 'Monthly subscription for puppy litter listing without featured add-on',
    price: 49.00,
    currency: 'AUD',
    envVarName: 'PAYPAL_PLAN_ID_PUPPY_LITTER_WITHOUT_FEATURED',
  },
];

/**
 * Get PayPal access token
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  const baseUrl = environment === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const options = {
      hostname: environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com',
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const tokenData = JSON.parse(data);
          resolve(tokenData.access_token);
        } else {
          reject(new Error(`Failed to get access token: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

/**
 * Make PayPal API request
 */
async function paypalApiRequest(
  accessToken: string,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  const hostname = environment === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API request failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function createProductAndPlan(config: ProductConfig): Promise<{ productId: string; planId: string }> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set in .env file');
  }

  try {
    // Get access token
    const accessToken = await getPayPalAccessToken();

    // Step 1: Create Product
    console.log(`\n📦 Creating product: ${config.name}...`);
    const productData = {
      name: config.name,
      description: config.description,
      type: 'SERVICE',
      category: 'SOFTWARE',
    };

    const productResponse = await paypalApiRequest(
      accessToken,
      'POST',
      '/v1/catalogs/products',
      productData
    );
    
    const productId = productResponse.id;
    console.log(`✅ Product created: ${productId} - ${productResponse.name}`);

    // Step 2: Create Billing Plan
    console.log(`📋 Creating billing plan for ${config.name}...`);
    const planData = {
      product_id: productId,
      name: `${config.name} - Monthly Plan`,
      description: `Monthly recurring subscription for ${config.name.toLowerCase()}`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 means infinite (never expires)
          pricing_scheme: {
            fixed_price: {
              value: config.price.toFixed(2),
              currency_code: config.currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: config.currency,
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
      taxes: {
        percentage: '0',
        inclusive: false,
      },
      status: 'ACTIVE',
    };

    const planResponse = await paypalApiRequest(
      accessToken,
      'POST',
      '/v1/billing/plans',
      planData
    );
    
    const planId = planResponse.id;
    console.log(`✅ Plan created: ${planId} - ${planResponse.name}`);
    console.log(`   Price: ${config.currency} ${config.price.toFixed(2)}/month`);

    return {
      productId,
      planId,
    };
  } catch (error: any) {
    console.error(`❌ Error creating ${config.name}:`, error.message);
    if (error.message) {
      try {
        const errorDetails = JSON.parse(error.message.split(' - ')[1] || '{}');
        console.error(`   Details:`, JSON.stringify(errorDetails, null, 2));
      } catch {
        console.error(`   Details:`, error.message);
      }
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting PayPal Products and Plans Creation...\n');
  console.log(`Environment: ${process.env.PAYPAL_ENVIRONMENT || 'sandbox'}\n`);

  const results: Array<{ config: ProductConfig; productId: string; planId: string }> = [];

  for (const config of productsToCreate) {
    try {
      const { productId, planId } = await createProductAndPlan(config);
      results.push({ config, productId, planId });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to create ${config.name}, continuing with next product...\n`);
    }
  }

  // Output summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY - Add these to your .env file:');
  console.log('='.repeat(80) + '\n');

  results.forEach(({ config, planId }) => {
    console.log(`${config.envVarName}=${planId}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Created ${results.length} out of ${productsToCreate.length} products and plans`);
  console.log('='.repeat(80) + '\n');

  if (results.length < productsToCreate.length) {
    console.log('⚠️  Some products/plans failed to create. Check the errors above.');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

