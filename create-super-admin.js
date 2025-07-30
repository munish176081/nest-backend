const bcrypt = require('bcrypt');

async function createSuperAdminSQL() {
  const email = 'admin@pups4sale.com';
  const password = 'Admin@123';
  const name = 'Super Admin';
  const username = 'admin_pups4sale';
  
  try {
    console.log('🔐 Generating bcrypt hash for password...');
    
    // Generate bcrypt hash with 12 salt rounds (same as used in the app)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    console.log('✅ Password hash generated successfully!');
    
    // Create the SQL command
    const sqlCommand = `-- Super Admin Creation SQL
-- Run this command in your PostgreSQL database

INSERT INTO users (
    id,
    email,
    name,
    username,
    status,
    hashed_password,
    role,
    is_super_admin,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '${email}',
    '${name}',
    '${username}',
    'active',
    '${hashedPassword}',
    'super_admin',
    true,
    NOW(),
    NOW()
);`;

    console.log('\n📋 === SUPER ADMIN CREATION SQL ===');
    console.log(sqlCommand);
    
    console.log('\n🔑 === LOGIN CREDENTIALS ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: super_admin`);
    console.log(`Status: active`);
    
    console.log('\n💡 === INSTRUCTIONS ===');
    console.log('1. Copy the SQL command above');
    console.log('2. Run it in your PostgreSQL database');
    console.log('3. Use the credentials to login to the admin panel');
    console.log('4. The user will have full super admin privileges');
    
  } catch (error) {
    console.error('❌ Error generating password hash:', error.message);
    console.error('Make sure bcrypt is installed: npm install bcrypt');
    process.exit(1);
  }
}

// Check if bcrypt is available
try {
  require('bcrypt');
} catch (error) {
  console.error('❌ bcrypt module not found!');
  console.error('Please install bcrypt: npm install bcrypt');
  process.exit(1);
}

// Run the script
createSuperAdminSQL(); 