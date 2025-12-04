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
exports.importAllCsvFiles = importAllCsvFiles;
const typeorm_1 = require("typeorm");
const typeorm_2 = require("typeorm");
const fs = require("fs");
const path = require("path");
let parse;
try {
    const csvParse = require('csv-parse/sync');
    parse = csvParse.parse || csvParse.default || csvParse;
}
catch {
    try {
        const csvParse = require('csv-parse');
        parse = csvParse.parse;
    }
    catch {
        parse = (input, options) => {
            const lines = input.split('\n').filter((line) => line.trim());
            if (lines.length === 0)
                return [];
            const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').replace(/^"|"$/g, ''));
            const records = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim())
                    continue;
                const values = [];
                let current = '';
                let inQuotes = false;
                let quoteChar = '';
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if ((char === '"' || char === "'") && (!inQuotes || char === quoteChar)) {
                        if (inQuotes && char === quoteChar) {
                            inQuotes = false;
                            quoteChar = '';
                        }
                        else {
                            inQuotes = true;
                            quoteChar = char;
                        }
                    }
                    else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    }
                    else {
                        current += char;
                    }
                }
                values.push(current.trim());
                const record = {};
                headers.forEach((header, idx) => {
                    record[header] = (values[idx] || '').replace(/^["']|["']$/g, '').replace(/^"|"$/g, '');
                });
                records.push(record);
            }
            return records;
        };
    }
}
let UserImport = class UserImport {
};
__decorate([
    (0, typeorm_2.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserImport.prototype, "id", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, unique: true, name: 'email' }),
    __metadata("design:type", String)
], UserImport.prototype, "email", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'name' }),
    __metadata("design:type", String)
], UserImport.prototype, "name", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, unique: true, name: 'username' }),
    __metadata("design:type", String)
], UserImport.prototype, "username", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 32, default: 'not_verified', name: 'status' }),
    __metadata("design:type", String)
], UserImport.prototype, "status", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 32, default: 'user', name: 'role' }),
    __metadata("design:type", String)
], UserImport.prototype, "role", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: false, name: 'is_super_admin' }),
    __metadata("design:type", Boolean)
], UserImport.prototype, "isSuperAdmin", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 512, nullable: true, name: 'image_url' }),
    __metadata("design:type", String)
], UserImport.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 20, nullable: true, name: 'phone' }),
    __metadata("design:type", String)
], UserImport.prototype, "phone", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true, name: 'bio' }),
    __metadata("design:type", String)
], UserImport.prototype, "bio", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 512, nullable: true, name: 'website' }),
    __metadata("design:type", String)
], UserImport.prototype, "website", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'business_name' }),
    __metadata("design:type", String)
], UserImport.prototype, "businessName", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 11, nullable: true, name: 'business_abn' }),
    __metadata("design:type", String)
], UserImport.prototype, "businessABN", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true, name: 'description' }),
    __metadata("design:type", String)
], UserImport.prototype, "description", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'location' }),
    __metadata("design:type", String)
], UserImport.prototype, "location", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'email2' }),
    __metadata("design:type", String)
], UserImport.prototype, "email2", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 20, nullable: true, name: 'phone2' }),
    __metadata("design:type", String)
], UserImport.prototype, "phone2", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 20, nullable: true, name: 'fax' }),
    __metadata("design:type", String)
], UserImport.prototype, "fax", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 512, nullable: true, name: 'address' }),
    __metadata("design:type", String)
], UserImport.prototype, "address", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 512, nullable: true, name: 'address2' }),
    __metadata("design:type", String)
], UserImport.prototype, "address2", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 20, nullable: true, name: 'zip' }),
    __metadata("design:type", String)
], UserImport.prototype, "zip", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'city' }),
    __metadata("design:type", String)
], UserImport.prototype, "city", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 100, nullable: true, name: 'state' }),
    __metadata("design:type", String)
], UserImport.prototype, "state", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 100, nullable: true, name: 'country' }),
    __metadata("design:type", String)
], UserImport.prototype, "country", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'first_name' }),
    __metadata("design:type", String)
], UserImport.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'last_name' }),
    __metadata("design:type", String)
], UserImport.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: false, name: 'is_imported_from_csv' }),
    __metadata("design:type", Boolean)
], UserImport.prototype, "isImportedFromCsv", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: false, name: 'is_profile_complete' }),
    __metadata("design:type", Boolean)
], UserImport.prototype, "isProfileComplete", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'jsonb', nullable: true, name: 'missing_required_fields' }),
    __metadata("design:type", Array)
], UserImport.prototype, "missingRequiredFields", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'jsonb', nullable: true, name: 'csv_optional_fields' }),
    __metadata("design:type", Object)
], UserImport.prototype, "csvOptionalFields", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'ip' }),
    __metadata("design:type", String)
], UserImport.prototype, "ip", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 256, nullable: true, name: 'hashed_password' }),
    __metadata("design:type", String)
], UserImport.prototype, "hashedPassword", void 0);
__decorate([
    (0, typeorm_2.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], UserImport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_2.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], UserImport.prototype, "updatedAt", void 0);
UserImport = __decorate([
    (0, typeorm_2.Entity)({ name: 'users' })
], UserImport);
const DATABASE_URL = "postgres://postgres:root@localhost:5432/pups4sale";
console.log('DATABASE_URL', DATABASE_URL);
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: DATABASE_URL,
    entities: [UserImport],
    synchronize: false,
    logging: false,
    ssl: DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('rds.amazonaws.com') ? {
        rejectUnauthorized: false,
    } : false,
});
const BATCH_SIZE = 100;
const REQUIRED_FIELDS = ['email', 'username'];
const CSV_DIRECTORY = process.env.CSV_DIR || path.join(__dirname, 'csv-imports');
const DRY_RUN = process.env.DRY_RUN === 'true';
const DEBUG_SKIPPED = process.env.DEBUG_SKIPPED === 'true';
function normalizeEmail(email) {
    if (!email)
        return null;
    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}
function normalizePhone(phone) {
    if (!phone)
        return null;
    const cleaned = phone.replace(/[\s()\-]/g, '').trim();
    if (cleaned.length === 0)
        return null;
    return cleaned.length > 20 ? cleaned.substring(0, 20) : cleaned;
}
function normalizeUrl(url) {
    if (!url)
        return null;
    const trimmed = url.trim();
    if (!trimmed)
        return null;
    if (!trimmed.match(/^https?:\/\//i)) {
        return `http://${trimmed}`;
    }
    return trimmed;
}
function generateUsername(email, fallbackUsername) {
    if (email) {
        const emailUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (emailUsername && emailUsername.length >= 3) {
            return emailUsername;
        }
    }
    if (fallbackUsername) {
        const cleaned = fallbackUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleaned.length >= 3) {
            return cleaned;
        }
    }
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
function makeUniqueUsername(baseUsername, existingUsernames) {
    let username = baseUsername;
    let counter = 1;
    while (existingUsernames.has(username)) {
        username = `${baseUsername}_${counter}`;
        counter++;
    }
    return username;
}
function buildLocation(address, address2, city, state, zip, country) {
    const parts = [address, address2, city, state, zip, country].filter(Boolean);
    const location = parts.join(', ');
    return location.length > 0 ? location.substring(0, 256) : null;
}
function checkProfileCompleteness(user) {
    const missingFields = [];
    REQUIRED_FIELDS.forEach(field => {
        if (!user[field] || (typeof user[field] === 'string' && user[field].trim() === '')) {
            missingFields.push(field);
        }
    });
    return {
        isComplete: missingFields.length === 0,
        missingFields,
    };
}
function parseCsvFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
            relax_column_count: true,
        });
        return records;
    }
    catch (error) {
        console.error(`❌ Error parsing CSV file ${filePath}:`, error.message);
        return [];
    }
}
function processCsvRow(row) {
    const email = normalizeEmail(row.email);
    if (!email) {
        return null;
    }
    const rawUsername = row.username?.trim() || '';
    const baseUsername = generateUsername(email, rawUsername);
    const firstName = row.firstname?.trim() || '';
    const lastName = row.lastname?.trim() || '';
    const fullName = row.name?.trim() || '';
    const name = fullName || (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName || null);
    const phone = normalizePhone(row.phone);
    const phone2 = normalizePhone(row.phone2);
    const fax = normalizePhone(row.fax);
    const address = row.address?.trim() || null;
    const address2 = row.address_2?.trim() || null;
    const zip = row.zip?.trim() || null;
    const city = row.city?.trim() || null;
    const state = row.state?.trim() || row['"state"']?.trim()?.replace(/"/g, '') || null;
    const country = row.country?.trim() || row['"country"']?.trim()?.replace(/"/g, '') || null;
    const email2 = normalizeEmail(row.email2);
    const website = normalizeUrl(row.url);
    const businessName = row.company_name?.trim() || null;
    const location = buildLocation(address, address2, city, state, zip, country);
    const csvOptionalFields = {};
    for (let i = 1; i <= 10; i++) {
        const fieldName = `optional_field_${i}`;
        if (row[fieldName]?.trim()) {
            csvOptionalFields[fieldName] = row[fieldName].trim();
        }
    }
    const subscriptionExpire = row['"subscription_expire"']?.trim()?.replace(/"/g, '') ||
        row.subscription_expire?.trim() || null;
    if (subscriptionExpire) {
        csvOptionalFields.subscription_expire = subscriptionExpire;
    }
    const user = {
        email,
        username: baseUsername,
        name: name || null,
        status: 'not_verified',
        role: 'user',
        isSuperAdmin: false,
        phone: phone || null,
        phone2: phone2 || null,
        fax: fax || null,
        email2: email2 || null,
        website: website || null,
        businessName: businessName || null,
        address: address || null,
        address2: address2 || null,
        zip: zip || null,
        city: city || null,
        state: state || null,
        country: country || null,
        firstName: firstName || null,
        lastName: lastName || null,
        location: location || null,
        isImportedFromCsv: true,
        csvOptionalFields: Object.keys(csvOptionalFields).length > 0 ? csvOptionalFields : null,
    };
    const completeness = checkProfileCompleteness(user);
    user.isProfileComplete = completeness.isComplete;
    user.missingRequiredFields = completeness.missingFields.length > 0 ? completeness.missingFields : null;
    return user;
}
async function importUsersFromCsv(filePath, userRepository, existingEmails, existingUsernames) {
    console.log(`\n📄 Processing file: ${path.basename(filePath)}`);
    const csvRows = parseCsvFile(filePath);
    if (csvRows.length === 0) {
        console.log(`   ⚠️  No records found in file`);
        return { processed: 0, imported: 0, skipped: 0, errors: 0 };
    }
    console.log(`   📊 Found ${csvRows.length} records`);
    let processed = 0;
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
        const batch = csvRows.slice(i, i + BATCH_SIZE);
        const usersToInsert = [];
        const newEmails = new Set();
        const newUsernames = new Set();
        for (const row of batch) {
            try {
                processed++;
                const userData = processCsvRow(row);
                if (!userData) {
                    skipped++;
                    if (DEBUG_SKIPPED && skipped <= 10) {
                        console.log(`   ⏭️  Skipping row ${processed}: missing or invalid email`);
                    }
                    continue;
                }
                if (existingEmails.has(userData.email) || newEmails.has(userData.email)) {
                    skipped++;
                    if (DEBUG_SKIPPED && skipped <= 10) {
                        console.log(`   ⏭️  Skipping duplicate email: ${userData.email}`);
                    }
                    continue;
                }
                const uniqueUsername = makeUniqueUsername(userData.username, existingUsernames);
                userData.username = uniqueUsername;
                newEmails.add(userData.email);
                newUsernames.add(uniqueUsername);
                usersToInsert.push(userData);
            }
            catch (error) {
                errors++;
                console.error(`   ❌ Error processing row ${processed}:`, error.message);
            }
        }
        if (usersToInsert.length > 0 && !DRY_RUN) {
            try {
                await userRepository.save(usersToInsert);
                imported += usersToInsert.length;
                usersToInsert.forEach(user => {
                    existingEmails.add(user.email);
                    existingUsernames.add(user.username);
                });
                process.stdout.write(`   ✅ Imported batch: ${imported}/${processed} records\r`);
            }
            catch (error) {
                console.error(`\n   ❌ Batch insert error:`, error.message);
                for (const user of usersToInsert) {
                    try {
                        if (existingEmails.has(user.email)) {
                            skipped++;
                            continue;
                        }
                        let uniqueUsername = user.username;
                        if (existingUsernames.has(uniqueUsername.toLowerCase())) {
                            let counter = 1;
                            let baseUsername = uniqueUsername;
                            do {
                                uniqueUsername = `${baseUsername}_${counter}`;
                                counter++;
                            } while (existingUsernames.has(uniqueUsername.toLowerCase()) && counter < 1000);
                            if (counter >= 1000) {
                                uniqueUsername = `${baseUsername}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                            }
                            user.username = uniqueUsername;
                        }
                        await userRepository.save(user);
                        imported++;
                        existingEmails.add(user.email);
                        existingUsernames.add(uniqueUsername.toLowerCase());
                    }
                    catch (individualError) {
                        if (individualError.message?.includes('duplicate key') ||
                            individualError.message?.includes('unique constraint')) {
                            skipped++;
                        }
                        else if (individualError.message?.includes('too long')) {
                            errors++;
                            if (individualError.message.includes('phone')) {
                                console.error(`   ⚠️  Phone too long for: ${user.email}`);
                            }
                        }
                        else {
                            errors++;
                        }
                    }
                }
            }
        }
        else if (DRY_RUN) {
            imported += usersToInsert.length;
            usersToInsert.forEach(user => {
                existingEmails.add(user.email);
                existingUsernames.add(user.username);
            });
        }
    }
    console.log(`\n   ✅ Completed: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    return { processed, imported, skipped, errors };
}
async function importAllCsvFiles() {
    const stats = {
        totalFiles: 0,
        totalProcessed: 0,
        totalImported: 0,
        totalSkipped: 0,
        totalErrors: 0,
        files: [],
    };
    try {
        await dataSource.initialize();
        console.log('🔗 Database connection established');
        if (DRY_RUN) {
            console.log('⚠️  DRY RUN MODE - No data will be inserted');
        }
        const userRepository = dataSource.getRepository(UserImport);
        console.log('📋 Loading existing users...');
        const existingUsers = await userRepository.find({
            select: ['email', 'username'],
        });
        console.log('existingUsers', existingUsers.length);
        const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
        const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
        console.log(`   Found ${existingUsers.length} existing users in database`);
        if (!fs.existsSync(CSV_DIRECTORY)) {
            console.error(`❌ CSV directory not found: ${CSV_DIRECTORY}`);
            console.log('💡 Create the directory and place your CSV files there, or set CSV_DIR environment variable');
            return;
        }
        const files = fs.readdirSync(CSV_DIRECTORY)
            .filter(file => file.toLowerCase().endsWith('.csv'))
            .sort();
        if (files.length === 0) {
            console.error(`❌ No CSV files found in: ${CSV_DIRECTORY}`);
            return;
        }
        console.log(`\n📁 Found ${files.length} CSV file(s) to process\n`);
        for (const file of files) {
            const filePath = path.join(CSV_DIRECTORY, file);
            const fileStats = await importUsersFromCsv(filePath, userRepository, existingEmails, existingUsernames);
            stats.totalFiles++;
            stats.totalProcessed += fileStats.processed;
            stats.totalImported += fileStats.imported;
            stats.totalSkipped += fileStats.skipped;
            stats.totalErrors += fileStats.errors;
            stats.files.push({ file, stats: fileStats });
        }
        console.log('\n' + '='.repeat(60));
        console.log('📊 IMPORT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Files Processed: ${stats.totalFiles}`);
        console.log(`Total Records Processed: ${stats.totalProcessed}`);
        console.log(`✅ Successfully Imported: ${stats.totalImported}`);
        console.log(`⏭️  Skipped (duplicates/invalid): ${stats.totalSkipped}`);
        console.log(`❌ Errors: ${stats.totalErrors}`);
        console.log('='.repeat(60));
        if (stats.totalSkipped > 0 && stats.totalImported === 0) {
            console.log(`\n💡 All records were skipped because their emails already exist in the database.`);
            console.log(`   Database currently has ${existingUsers.length} users.`);
            console.log(`   To see which emails are being skipped, run with: DEBUG_SKIPPED=true npm run import:csv`);
            console.log(`   To force import/update, you would need to modify the script to use upsert instead of insert.`);
        }
        if (stats.totalImported > 0) {
            console.log(`\n✅ Successfully imported ${stats.totalImported} users from CSV!`);
        }
    }
    catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('\n🔗 Database connection closed');
        }
    }
}
if (require.main === module) {
    importAllCsvFiles()
        .then(() => {
        console.log('\n✨ Import script completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=import-csv-users.js.map