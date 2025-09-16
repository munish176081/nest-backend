import { DataSource } from 'typeorm';
import { User } from './src/features/accounts/entities/account.entity';
import { ExternalAuthAccount } from './src/features/authentication/entities/external-auth-accounts.entity';
import * as bcryptjs from 'bcryptjs';

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
  entities: [User, ExternalAuthAccount],
  synchronize: false,
  logging: true,
});

async function createSuperAdmin() {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Database connection established');

    // Get the user repository
    const userRepository = dataSource.getRepository(User);

    // Check if super admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@pups4sale.com' }
    });

    if (existingAdmin) {
      console.log('✅ Super admin already exists:', existingAdmin.email);
      return;
    }

    // Create super admin user
    const hashedPassword = await bcryptjs.hash('Welcome@123', 10);
    
    const superAdmin = userRepository.create({
      email: 'admin@pups4sale.com',
      username: 'superadmin',
      name: 'Super Admin',
      hashedPassword: hashedPassword,
      status: 'active',
      role: 'super_admin',
      isSuperAdmin: true,
      imageUrl: null,
    });

    const savedAdmin = await userRepository.save(superAdmin);
   
    console.log('\n🔑 Login credentials:');
    console.log('Email: admin@pups4sale.com');
    console.log('Password: Welcome@123');
    console.log('\n⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    // Close the connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the script
createSuperAdmin();
