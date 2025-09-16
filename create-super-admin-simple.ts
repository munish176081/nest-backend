import { DataSource } from 'typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcryptjs from 'bcryptjs';

// Temporary User entity for seeding (without relationships)
@Entity({ name: 'users' })
class UserSeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 256, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 32, default: 'not_verified' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'user' })
  role: string;

  @Column({ type: 'boolean', default: false, name: 'is_super_admin' })
  isSuperAdmin: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  ip?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'hashed_password' })
  hashedPassword?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
  entities: [UserSeed],
  synchronize: false,
  logging: true,
});

async function createSuperAdmin() {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('🔗 Database connection established');

    // Get the user repository
    const userRepository = dataSource.getRepository(UserSeed);

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
    console.log('✅ Super admin created successfully!');
   
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
      console.log('🔗 Database connection closed');
    }
  }
}

// Run the script
createSuperAdmin();
