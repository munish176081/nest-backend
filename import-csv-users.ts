import { DataSource } from 'typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
// CSV parsing using csv-parse
let parse: (input: string, options: any) => any[];
try {
  // Try ESM import first
  const csvParse = require('csv-parse/sync');
  parse = csvParse.parse || csvParse.default || csvParse;
} catch {
  try {
    // Fallback to main package
    const csvParse = require('csv-parse');
    parse = csvParse.parse;
  } catch {
    // Simple CSV parser fallback if csv-parse is not installed
    parse = (input: string, options: any) => {
      const lines = input.split('\n').filter((line: string) => line.trim());
      if (lines.length === 0) return [];
      
      // Parse header
      const headers = lines[0].split(',').map((h: string) => 
        h.trim().replace(/^["']|["']$/g, '').replace(/^"|"$/g, '')
      );
      const records: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if ((char === '"' || char === "'") && (!inQuotes || char === quoteChar)) {
            if (inQuotes && char === quoteChar) {
              inQuotes = false;
              quoteChar = '';
            } else {
              inQuotes = true;
              quoteChar = char;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        const record: any = {};
        headers.forEach((header: string, idx: number) => {
          record[header] = (values[idx] || '').replace(/^["']|["']$/g, '').replace(/^"|"$/g, '');
        });
        records.push(record);
      }
      
      return records;
    };
  }
}

// User entity matching the database schema
@Entity({ name: 'users' })
class UserImport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256, unique: true, name: 'email' })
  email: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'name' })
  name?: string;

  @Column({ type: 'varchar', length: 256, unique: true, name: 'username' })
  username: string;

  @Column({ type: 'varchar', length: 32, default: 'not_verified', name: 'status' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'user', name: 'role' })
  role: string;

  @Column({ type: 'boolean', default: false, name: 'is_super_admin' })
  isSuperAdmin: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone' })
  phone?: string;

  @Column({ type: 'text', nullable: true, name: 'bio' })
  bio?: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'website' })
  website?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'business_name' })
  businessName?: string;

  @Column({ type: 'varchar', length: 11, nullable: true, name: 'business_abn' })
  businessABN?: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'location' })
  location?: string;

  // CSV Import fields
  @Column({ type: 'varchar', length: 256, nullable: true, name: 'email2' })
  email2?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone2' })
  phone2?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'fax' })
  fax?: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'address' })
  address?: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'address2' })
  address2?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'zip' })
  zip?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'city' })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'state' })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'country' })
  country?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'first_name' })
  firstName?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'last_name' })
  lastName?: string;

  // CSV Import tracking flags
  @Column({ type: 'boolean', default: false, name: 'is_imported_from_csv' })
  isImportedFromCsv: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_profile_complete' })
  isProfileComplete: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'missing_required_fields' })
  missingRequiredFields?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'csv_optional_fields' })
  csvOptionalFields?: Record<string, any>;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'ip' })
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
  entities: [UserImport],
  synchronize: false,
  logging: false, // Set to true for debugging
});

// Configuration
const BATCH_SIZE = 100; // Process users in batches for better performance
const REQUIRED_FIELDS = ['email', 'username']; // Minimum required fields
const CSV_DIRECTORY = process.env.CSV_DIR || path.join(__dirname, 'csv-imports');
const DRY_RUN = process.env.DRY_RUN === 'true'; // Set to true to test without inserting

// Utility functions
function normalizeEmail(email: string): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  // Remove spaces, parentheses, dashes, and keep only digits and +
  const cleaned = phone.replace(/[\s()\-]/g, '').trim();
  if (cleaned.length === 0) return null;
  // Truncate to 20 characters (database limit)
  return cleaned.length > 20 ? cleaned.substring(0, 20) : cleaned;
}

function normalizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Add http:// if no protocol
  if (!trimmed.match(/^https?:\/\//i)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

function generateUsername(email: string, fallbackUsername?: string): string {
  // Try to extract username from email
  if (email) {
    const emailUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (emailUsername && emailUsername.length >= 3) {
      return emailUsername;
    }
  }
  
  // Use fallback if provided and valid
  if (fallbackUsername) {
    const cleaned = fallbackUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleaned.length >= 3) {
      return cleaned;
    }
  }
  
  // Generate random username as last resort
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function makeUniqueUsername(baseUsername: string, existingUsernames: Set<string>): string {
  let username = baseUsername;
  let counter = 1;
  
  while (existingUsernames.has(username)) {
    username = `${baseUsername}_${counter}`;
    counter++;
  }
  
  return username;
}

function buildLocation(address?: string, address2?: string, city?: string, state?: string, zip?: string, country?: string): string | null {
  const parts = [address, address2, city, state, zip, country].filter(Boolean);
  const location = parts.join(', ');
  return location.length > 0 ? location.substring(0, 256) : null;
}

function checkProfileCompleteness(user: Partial<UserImport>): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
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

interface CsvRow {
  [key: string]: string;
}

function parseCsvFile(filePath: string): CsvRow[] {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });
    
    return records as CsvRow[];
  } catch (error: any) {
    console.error(`❌ Error parsing CSV file ${filePath}:`, error.message);
    return [];
  }
}

function processCsvRow(row: CsvRow): Partial<UserImport> | null {
  // Normalize email (required)
  const email = normalizeEmail(row.email);
  if (!email) {
    return null; // Skip rows without email
  }

  // Normalize username
  const rawUsername = row.username?.trim() || '';
  const baseUsername = generateUsername(email, rawUsername);

  // Normalize name from firstname/lastname or name field
  const firstName = row.firstname?.trim() || '';
  const lastName = row.lastname?.trim() || '';
  const fullName = row.name?.trim() || '';
  const name = fullName || (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName || null);

  // Normalize phones
  const phone = normalizePhone(row.phone);
  const phone2 = normalizePhone(row.phone2);
  const fax = normalizePhone(row.fax);

  // Normalize address fields
  const address = row.address?.trim() || null;
  const address2 = row.address_2?.trim() || null;
  const zip = row.zip?.trim() || null;
  const city = row.city?.trim() || null;
  const state = row.state?.trim() || row['"state"']?.trim()?.replace(/"/g, '') || null;
  const country = row.country?.trim() || row['"country"']?.trim()?.replace(/"/g, '') || null;

  // Normalize other fields
  const email2 = normalizeEmail(row.email2);
  const website = normalizeUrl(row.url);
  const businessName = row.company_name?.trim() || null;
  const location = buildLocation(address, address2, city, state, zip, country);

  // Collect optional CSV fields
  const csvOptionalFields: Record<string, any> = {};
  for (let i = 1; i <= 10; i++) {
    const fieldName = `optional_field_${i}`;
    if (row[fieldName]?.trim()) {
      csvOptionalFields[fieldName] = row[fieldName].trim();
    }
  }
  
  // Add subscription_expire if present
  const subscriptionExpire = row['"subscription_expire"']?.trim()?.replace(/"/g, '') || 
                             row.subscription_expire?.trim() || null;
  if (subscriptionExpire) {
    csvOptionalFields.subscription_expire = subscriptionExpire;
  }

  const user: Partial<UserImport> = {
    email,
    username: baseUsername, // Will be made unique later
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

  // Check profile completeness
  const completeness = checkProfileCompleteness(user);
  user.isProfileComplete = completeness.isComplete;
  user.missingRequiredFields = completeness.missingFields.length > 0 ? completeness.missingFields : null;

  return user;
}

async function importUsersFromCsv(filePath: string, userRepository: any, existingEmails: Set<string>, existingUsernames: Set<string>): Promise<{
  processed: number;
  imported: number;
  skipped: number;
  errors: number;
}> {
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

  // Process in batches
  for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
    const batch = csvRows.slice(i, i + BATCH_SIZE);
    const usersToInsert: Partial<UserImport>[] = [];
    const newEmails = new Set<string>();
    const newUsernames = new Set<string>();

    for (const row of batch) {
      try {
        processed++;
        const userData = processCsvRow(row);

        if (!userData) {
          skipped++;
          continue;
        }

        // Check for duplicate email
        if (existingEmails.has(userData.email!) || newEmails.has(userData.email!)) {
          skipped++;
          continue;
        }

        // Make username unique
        const uniqueUsername = makeUniqueUsername(userData.username!, existingUsernames);
        userData.username = uniqueUsername;

        newEmails.add(userData.email!);
        newUsernames.add(uniqueUsername);
        usersToInsert.push(userData);
      } catch (error) {
        errors++;
        console.error(`   ❌ Error processing row ${processed}:`, error.message);
      }
    }

    // Batch insert
    if (usersToInsert.length > 0 && !DRY_RUN) {
      try {
        await userRepository.save(usersToInsert);
        imported += usersToInsert.length;
        
        // Update tracking sets
        usersToInsert.forEach(user => {
          existingEmails.add(user.email!);
          existingUsernames.add(user.username!);
        });

        process.stdout.write(`   ✅ Imported batch: ${imported}/${processed} records\r`);
      } catch (error: any) {
        console.error(`\n   ❌ Batch insert error:`, error.message);
        
        // Try individual inserts as fallback with better error handling
        for (const user of usersToInsert) {
          try {
            // Check for duplicates before inserting
            if (existingEmails.has(user.email!)) {
              skipped++;
              continue;
            }
            
            // Make username unique if it already exists
            let uniqueUsername = user.username!;
            if (existingUsernames.has(uniqueUsername.toLowerCase())) {
              let counter = 1;
              let baseUsername = uniqueUsername;
              do {
                uniqueUsername = `${baseUsername}_${counter}`;
                counter++;
              } while (existingUsernames.has(uniqueUsername.toLowerCase()) && counter < 1000);
              
              if (counter >= 1000) {
                // Fallback to timestamp-based username
                uniqueUsername = `${baseUsername}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              }
              user.username = uniqueUsername;
            }
            
            await userRepository.save(user);
            imported++;
            existingEmails.add(user.email!);
            existingUsernames.add(uniqueUsername.toLowerCase());
          } catch (individualError: any) {
            // Check error type
            if (individualError.message?.includes('duplicate key') || 
                individualError.message?.includes('unique constraint')) {
              skipped++;
            } else if (individualError.message?.includes('too long')) {
              errors++;
              // Log the specific field causing issue
              if (individualError.message.includes('phone')) {
                console.error(`   ⚠️  Phone too long for: ${user.email}`);
              }
            } else {
              errors++;
            }
          }
        }
      }
    } else if (DRY_RUN) {
      imported += usersToInsert.length;
      usersToInsert.forEach(user => {
        existingEmails.add(user.email!);
        existingUsernames.add(user.username!);
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
    files: [] as Array<{ file: string; stats: any }>,
  };

  try {
    // Initialize database connection
    await dataSource.initialize();
    console.log('🔗 Database connection established');

    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No data will be inserted');
    }

    const userRepository = dataSource.getRepository(UserImport);

    // Get existing emails and usernames to avoid duplicates
    console.log('📋 Loading existing users...');
    const existingUsers = await userRepository.find({
      select: ['email', 'username'],
    });
    
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
    
    console.log(`   Found ${existingUsers.length} existing users in database`);

    // Find all CSV files in directory
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

    // Process each CSV file
    for (const file of files) {
      const filePath = path.join(CSV_DIRECTORY, file);
      const fileStats = await importUsersFromCsv(
        filePath,
        userRepository,
        existingEmails,
        existingUsernames,
      );

      stats.totalFiles++;
      stats.totalProcessed += fileStats.processed;
      stats.totalImported += fileStats.imported;
      stats.totalSkipped += fileStats.skipped;
      stats.totalErrors += fileStats.errors;
      stats.files.push({ file, stats: fileStats });
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Files Processed: ${stats.totalFiles}`);
    console.log(`Total Records Processed: ${stats.totalProcessed}`);
    console.log(`✅ Successfully Imported: ${stats.totalImported}`);
    console.log(`⏭️  Skipped (duplicates/invalid): ${stats.totalSkipped}`);
    console.log(`❌ Errors: ${stats.totalErrors}`);
    console.log('='.repeat(60));

    if (stats.totalImported > 0) {
      console.log(`\n✅ Successfully imported ${stats.totalImported} users from CSV!`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔗 Database connection closed');
    }
  }
}

// Run the import
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

export { importAllCsvFiles };

