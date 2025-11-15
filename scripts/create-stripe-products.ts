#!/usr/bin/env ts-node

/**
 * Script to create Stripe Products and Prices for subscriptions
 * 
 * Usage:
 *   npm run create-stripe-products
 *   or
 *   ts-node scripts/create-stripe-products.ts
 * 
 * Make sure STRIPE_SECRET_KEY is set in your .env file
 */

import Stripe from 'stripe';
import 'dotenv/config';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY is not set in .env file');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

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
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_SEMEN',
  },
  {
    name: 'Stud Listing Subscription',
    description: 'Monthly subscription for stud or bitch listings',
    price: 39.00,
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_STUD',
  },
  {
    name: 'Future Listing Subscription',
    description: 'Monthly subscription for future listings',
    price: 19.00,
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_FUTURE',
  },
  {
    name: 'Other Services Listing Subscription',
    description: 'Monthly subscription for other services listings',
    price: 19.00,
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_OTHER_SERVICES',
  },
  {
    name: 'Featured & Homepage Gallery Add-on',
    description: 'Monthly recurring subscription for featured listing and homepage gallery placement',
    price: 79.00,
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_FEATURED',
  },
  {
    name: 'Puppy Litter Listing with Featured',
    description: 'Monthly subscription for puppy litter listing with featured and homepage gallery placement ($49 base + $79 featured)',
    price: 128.00,
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_PUPPY_LITTER_WITH_FEATURED',
  },
  {
    name: 'Puppy Litter Listing without Featured',
    description: 'Monthly subscription for puppy litter listing without featured add-on',
    price: 49.00,
    currency: 'usd',
    envVarName: 'STRIPE_PRICE_ID_PUPPY_LITTER_WITHOUT_FEATURED',
  },
];

async function createProductAndPrice(config: ProductConfig): Promise<{ productId: string; priceId: string }> {
  try {
    // Check if product already exists
    const existingProducts = await stripe.products.list({
      limit: 100,
    });

    const existingProduct = existingProducts.data.find(
      (p) => p.name === config.name && p.active
    );

    let product: Stripe.Product;
    if (existingProduct) {
      console.log(`   ✓ Product "${config.name}" already exists (${existingProduct.id})`);
      product = existingProduct;
    } else {
      // Create product
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        active: true,
      });
      console.log(`   ✓ Created product: ${product.id}`);
    }

    // Check if price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      limit: 100,
    });

    const existingPrice = existingPrices.data.find(
      (p) =>
        p.active &&
        p.currency === config.currency &&
        p.recurring?.interval === 'month' &&
        p.unit_amount === Math.round(config.price * 100) // Convert to cents
    );

    let price: Stripe.Price;
    if (existingPrice) {
      console.log(`   ✓ Price for "${config.name}" already exists (${existingPrice.id})`);
      price = existingPrice;
    } else {
      // Create recurring price
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(config.price * 100), // Convert dollars to cents
        currency: config.currency,
        recurring: {
          interval: 'month',
        },
      });
      console.log(`   ✓ Created price: ${price.id} ($${config.price}/${config.currency}/month)`);
    }

    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error: any) {
    console.error(`   ❌ Error creating product "${config.name}":`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Stripe Products and Prices creation...\n');
  console.log(`📝 Mode: ${stripeSecretKey?.startsWith('sk_live') ? 'LIVE' : 'TEST'}\n`);

  const results: Array<{ config: ProductConfig; productId: string; priceId: string }> = [];

  for (const config of productsToCreate) {
    console.log(`📦 Creating: ${config.name}`);
    try {
      const { productId, priceId } = await createProductAndPrice(config);
      results.push({ config, productId, priceId });
      console.log('');
    } catch (error) {
      console.error(`   ❌ Failed to create ${config.name}\n`);
      throw error;
    }
  }

  console.log('✅ All products and prices created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Add these to your .env file:\n');
  
  for (const { config, priceId } of results) {
    console.log(`${config.envVarName}=${priceId}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 After adding these to your .env file, restart your backend server.');
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

