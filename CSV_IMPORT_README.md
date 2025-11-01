# CSV User Import Script

A robust, optimized script to import user data from CSV files into the database.

## Features

- ✅ **Batch Processing** - Processes records in batches of 100 for optimal performance
- ✅ **Duplicate Detection** - Automatically skips duplicate emails and usernames
- ✅ **Data Normalization** - Cleans and normalizes emails, phones, URLs, addresses
- ✅ **Smart Username Generation** - Generates unique usernames from email or CSV data
- ✅ **Error Handling** - Comprehensive error handling with detailed logging
- ✅ **Profile Completeness Tracking** - Automatically sets flags for complete/incomplete profiles
- ✅ **Multiple File Support** - Can process multiple CSV files in a directory
- ✅ **Dry Run Mode** - Test imports without actually inserting data
- ✅ **Comprehensive Logging** - Detailed statistics and progress tracking

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Ensure database migration is run:**
   ```bash
   npm run migration:run
   # This will create the new CSV import fields in the users table
   ```

3. **Set up CSV files directory:**
   - Create a directory (default: `csv-imports/` in project root)
   - Place your CSV files in this directory
   - Or set `CSV_DIR` environment variable to point to your directory

## CSV File Format

The script expects CSV files with the following columns (case-insensitive):

### Required Fields
- `email` - User email address (required)
- `username` - Username (optional, will be generated from email if missing)

### Optional Fields
- `firstname`, `lastname`, `name` - User name fields
- `phone`, `phone2`, `fax` - Phone numbers
- `email2` - Secondary email
- `address`, `address_2`, `city`, `zip` - Address fields
- `state`, `country` - Location fields (may be quoted: `"state"`, `"country"`)
- `company_name` - Business name
- `url` - Website URL
- `optional_field_1` through `optional_field_10` - Custom optional fields
- `subscription_expire` - Subscription expiration (may be quoted: `"subscription_expire"`)

## Usage

### Basic Import

```bash
# Import all CSV files from default directory (csv-imports/)
npm run import:csv

# Or with custom directory
CSV_DIR=/path/to/csv/files npm run import:csv

# Or with custom database URL
DATABASE_URL=postgresql://user:pass@host:5432/dbname npm run import:csv
```

### Dry Run (Test Mode)

Test the import without actually inserting data:

```bash
npm run import:csv:dry
```

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (default: `postgresql://localhost:5432/pups4sale`)
- `CSV_DIR` - Directory containing CSV files (default: `./csv-imports`)
- `DRY_RUN` - Set to `true` for test mode (default: `false`)

## How It Works

1. **Connects to Database** - Establishes connection using TypeORM
2. **Loads Existing Users** - Fetches existing emails/usernames to prevent duplicates
3. **Processes CSV Files** - Reads and parses each CSV file in the directory
4. **Normalizes Data**:
   - Emails: Lowercase, trimmed
   - Phones: Removes spaces, parentheses, dashes
   - URLs: Adds `http://` if missing protocol
   - Names: Combines firstname/lastname or uses name field
5. **Validates & Transforms**:
   - Checks for required fields (email, username)
   - Generates unique usernames if needed
   - Builds location string from address fields
   - Collects optional CSV fields into JSONB
6. **Batch Inserts** - Inserts records in batches of 100 for performance
7. **Sets Flags**:
   - `isImportedFromCsv: true`
   - `isProfileComplete: true/false` based on required fields
   - `missingRequiredFields: []` - Array of missing fields
   - `csvOptionalFields: {}` - JSON object with optional fields

## Output Example

```
🔗 Database connection established
📋 Loading existing users...
   Found 150 existing users in database

📁 Found 9 CSV file(s) to process

📄 Processing file: email_export-1.csv
   📊 Found 1000 records
   ✅ Imported batch: 1000/1000 records
   ✅ Completed: 1000 imported, 0 skipped, 0 errors

📄 Processing file: email_export-2.csv
   📊 Found 1200 records
   ✅ Imported batch: 1200/1200 records
   ✅ Completed: 1200 imported, 0 skipped, 0 errors

...

============================================================
📊 IMPORT SUMMARY
============================================================
Total Files Processed: 9
Total Records Processed: 9000
✅ Successfully Imported: 8950
⏭️  Skipped (duplicates/invalid): 50
❌ Errors: 0
============================================================

✅ Successfully imported 8950 users from CSV!

🔗 Database connection closed
✨ Import script completed
```

## Data Processing Details

### Email Normalization
- Converts to lowercase
- Trims whitespace
- Required field - rows without email are skipped

### Username Generation
1. Extracts from email (before @)
2. Falls back to CSV username field
3. Generates random username as last resort
4. Ensures uniqueness by appending counter if needed

### Phone Normalization
- Removes spaces, parentheses, dashes
- Keeps only digits and +
- Handles formats like: `(07) 1234 5678`, `+61 412 345 678`, etc.

### Location Building
- Combines: address, address2, city, state, zip, country
- Separated by commas
- Max length: 256 characters

### Profile Completeness
Required fields for completion:
- `email`
- `username`

Missing fields are tracked in `missingRequiredFields` array.

## Error Handling

- **Invalid CSV files** - Logged and skipped, script continues
- **Duplicate emails** - Automatically skipped
- **Duplicate usernames** - Made unique with counter suffix
- **Database errors** - Logged with details, continues processing
- **Missing required fields** - Row skipped, counted in statistics

## Performance

- **Batch Processing**: 100 records per batch
- **Single Transaction**: Each batch is atomic
- **Memory Efficient**: Processes files sequentially
- **Optimized Queries**: Loads existing users once at start

For ~9000 records across 9 files, expect:
- Processing time: ~2-5 minutes
- Memory usage: <200MB

## Troubleshooting

### "CSV directory not found"
- Create the `csv-imports/` directory in project root
- Or set `CSV_DIR` environment variable

### "No CSV files found"
- Ensure files have `.csv` extension (case-insensitive)
- Check file permissions

### "Duplicate key" errors
- Script should handle this automatically
- If still occurring, check database constraints

### "Connection refused"
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network/firewall settings

## Notes

- The script processes files sequentially (one at a time)
- All CSV files in the directory are processed automatically
- Files are sorted alphabetically
- Existing users (by email) are never overwritten
- Usernames are made unique automatically
- All imported users have `status: 'not_verified'` and `role: 'user'`

## Migration Required

Before running the import, ensure the database migration has been run:

```bash
npm run migration:run
```

This creates the necessary columns:
- `email2`, `phone2`, `fax`
- `address`, `address2`, `zip`, `city`, `state`, `country`
- `firstName`, `lastName`
- `isImportedFromCsv`, `isProfileComplete`
- `missingRequiredFields`, `csvOptionalFields`

