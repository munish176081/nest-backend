"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const typeorm_2 = require("typeorm");
const bcryptjs = require("bcryptjs");
let UserSeed = class UserSeed {
};
__decorate([
    (0, typeorm_2.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserSeed.prototype, "id", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, unique: true }),
    __metadata("design:type", String)
], UserSeed.prototype, "email", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true }),
    __metadata("design:type", String)
], UserSeed.prototype, "name", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, unique: true }),
    __metadata("design:type", String)
], UserSeed.prototype, "username", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 32, default: 'not_verified' }),
    __metadata("design:type", String)
], UserSeed.prototype, "status", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 32, default: 'user' }),
    __metadata("design:type", String)
], UserSeed.prototype, "role", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: false, name: 'is_super_admin' }),
    __metadata("design:type", Boolean)
], UserSeed.prototype, "isSuperAdmin", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 512, nullable: true, name: 'image_url' }),
    __metadata("design:type", String)
], UserSeed.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true }),
    __metadata("design:type", String)
], UserSeed.prototype, "ip", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'hashed_password' }),
    __metadata("design:type", String)
], UserSeed.prototype, "hashedPassword", void 0);
__decorate([
    (0, typeorm_2.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], UserSeed.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_2.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], UserSeed.prototype, "updatedAt", void 0);
UserSeed = __decorate([
    (0, typeorm_2.Entity)({ name: 'users' })
], UserSeed);
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
    entities: [UserSeed],
    synchronize: false,
    logging: true,
});
async function createSuperAdmin() {
    try {
        await dataSource.initialize();
        console.log('🔗 Database connection established');
        const userRepository = dataSource.getRepository(UserSeed);
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
        console.log('✅ Super admin created successfully!');
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
            console.log('🔗 Database connection closed');
        }
    }
}
createSuperAdmin();
//# sourceMappingURL=create-super-admin-simple.js.map