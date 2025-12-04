"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const account_entity_1 = require("./src/features/accounts/entities/account.entity");
const external_auth_accounts_entity_1 = require("./src/features/authentication/entities/external-auth-accounts.entity");
const bcryptjs = require("bcryptjs");
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
    entities: [account_entity_1.User, external_auth_accounts_entity_1.ExternalAuthAccount],
    synchronize: false,
    logging: true,
});
async function createSuperAdmin() {
    try {
        await dataSource.initialize();
        console.log('Database connection established');
        const userRepository = dataSource.getRepository(account_entity_1.User);
        const existingAdmin = await userRepository.findOne({
            where: { email: 'admin@pups4sale.com' }
        });
        if (existingAdmin) {
            console.log('✅ Super admin already exists:', existingAdmin.email);
            return;
        }
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
    }
    catch (error) {
        console.error('❌ Error creating super admin:', error);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('Database connection closed');
        }
    }
}
createSuperAdmin();
//# sourceMappingURL=create-super-admin-blog.js.map