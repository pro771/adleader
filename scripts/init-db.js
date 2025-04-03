/**
 * Database initialization script
 * 
 * This script creates the initial database tables and populates them with
 * a sample weekly competition. Run this script after setting up your PostgreSQL database.
 * 
 * Usage: node scripts/init-db.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create ad_views table
    console.log('Creating ad_views table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_views (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create competitions table
    console.log('Creating competitions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS competitions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create competition_participants table
    console.log('Creating competition_participants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS competition_participants (
        id SERIAL PRIMARY KEY,
        competition_id INTEGER REFERENCES competitions(id),
        user_id INTEGER REFERENCES users(id),
        ads_watched INTEGER DEFAULT 0,
        last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(competition_id, user_id)
      )
    `);
    
    // Create rewards table for potential reward system
    console.log('Creating rewards table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        email VARCHAR(100) NOT NULL,
        is_claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if we already have an active competition
    const competitionCheck = await client.query(`
      SELECT * FROM competitions WHERE is_active = TRUE
    `);
    
    if (competitionCheck.rows.length === 0) {
      // Create a new weekly competition starting from current date
      console.log('Creating initial weekly competition...');
      
      const now = new Date();
      
      // Calculate the next Sunday from today
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + (7 - now.getDay()));
      endDate.setHours(23, 59, 59, 999);
      
      await client.query(`
        INSERT INTO competitions (name, start_date, end_date, is_active)
        VALUES ($1, $2, $3, TRUE)
      `, [
        'Weekly Competition #1',
        now.toISOString(),
        endDate.toISOString()
      ]);
      
      console.log(`Created new competition ending on ${endDate.toLocaleString()}`);
    } else {
      console.log('Active competition already exists, skipping creation');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
initializeDatabase().catch(console.error);