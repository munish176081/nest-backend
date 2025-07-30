const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'pups4sale',
  user: 'postgres',
  password: 'postgres'
});

async function checkDatabase() {
  try {
    console.log('Checking database...');
    
    // Check breeds
    const breedsResult = await pool.query('SELECT COUNT(*) as count FROM breeds');
    console.log('Total breeds:', breedsResult.rows[0].count);
    
    const activeBreedsResult = await pool.query('SELECT COUNT(*) as count FROM breeds WHERE is_active = true');
    console.log('Active breeds:', activeBreedsResult.rows[0].count);
    
    // Check listings
    const listingsResult = await pool.query('SELECT COUNT(*) as count FROM listings');
    console.log('Total listings:', listingsResult.rows[0].count);
    
    const activeListingsResult = await pool.query('SELECT COUNT(*) as count FROM listings WHERE status = \'active\'');
    console.log('Active listings:', activeListingsResult.rows[0].count);
    
    // Show some sample data
    const sampleBreeds = await pool.query('SELECT id, name, is_active FROM breeds LIMIT 5');
    console.log('Sample breeds:', sampleBreeds.rows);
    
    const sampleListings = await pool.query('SELECT id, title, status, is_active FROM listings LIMIT 5');
    console.log('Sample listings:', sampleListings.rows);
    
    // Check column names for breeds table
    const breedColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'breeds' 
      ORDER BY ordinal_position
    `);
    console.log('Breeds table columns:', breedColumns.rows.map(row => `${row.column_name} (${row.data_type})`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase(); 