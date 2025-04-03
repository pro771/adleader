const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ad_views table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_views (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create competitions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competitions (
        id SERIAL PRIMARY KEY,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create competition_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competition_participants (
        id SERIAL PRIMARY KEY,
        competition_id INTEGER REFERENCES competitions(id),
        user_id INTEGER REFERENCES users(id),
        ads_watched INTEGER DEFAULT 0,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(competition_id, user_id)
      )
    `);
    
    console.log('Database initialized successfully');
    
    // Create current week's competition if it doesn't exist
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + (7 - now.getDay())); // Next Sunday
    endOfWeek.setHours(23, 59, 59, 999);
    
    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(endOfWeek.getDate() - 7); // Previous Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Check if we have an active competition
    const competitionCheck = await pool.query(`
      SELECT * FROM competitions 
      WHERE is_active = TRUE AND end_date > $1
      LIMIT 1
    `, [now]);
    
    if (competitionCheck.rows.length === 0) {
      // Create a new competition
      await pool.query(`
        INSERT INTO competitions (start_date, end_date)
        VALUES ($1, $2)
      `, [startOfWeek, endOfWeek]);
      
      console.log('New weekly competition created');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// User operations
async function createUser(username, email, password) {
  try {
    const result = await pool.query(`
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `, [username, email, password]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    const result = await pool.query(`
      SELECT * FROM users WHERE username = $1
    `, [username]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
}

async function getUserByEmail(email) {
  try {
    const result = await pool.query(`
      SELECT * FROM users WHERE email = $1
    `, [email]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

// Ad view operations
async function recordAdView(userId) {
  try {
    const result = await pool.query(`
      INSERT INTO ad_views (user_id)
      VALUES ($1)
      RETURNING id, user_id, viewed_at
    `, [userId]);
    
    // Get the active competition
    const competitionResult = await pool.query(`
      SELECT id FROM competitions 
      WHERE is_active = TRUE AND end_date > CURRENT_TIMESTAMP
      LIMIT 1
    `);
    
    if (competitionResult.rows.length > 0) {
      const competitionId = competitionResult.rows[0].id;
      
      // Check if user is already in the competition
      const participantCheck = await pool.query(`
        SELECT * FROM competition_participants
        WHERE competition_id = $1 AND user_id = $2
      `, [competitionId, userId]);
      
      if (participantCheck.rows.length > 0) {
        // Update existing participant
        await pool.query(`
          UPDATE competition_participants
          SET ads_watched = ads_watched + 1, last_active = CURRENT_TIMESTAMP
          WHERE competition_id = $1 AND user_id = $2
        `, [competitionId, userId]);
      } else {
        // Add new participant
        await pool.query(`
          INSERT INTO competition_participants (competition_id, user_id, ads_watched)
          VALUES ($1, $2, 1)
        `, [competitionId, userId]);
      }
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error recording ad view:', error);
    throw error;
  }
}

async function getAdViewsByUserId(userId) {
  try {
    const result = await pool.query(`
      SELECT * FROM ad_views WHERE user_id = $1
    `, [userId]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting ad views by user ID:', error);
    throw error;
  }
}

// Competition operations
async function getCurrentCompetition() {
  try {
    const result = await pool.query(`
      SELECT * FROM competitions 
      WHERE is_active = TRUE AND end_date > CURRENT_TIMESTAMP
      LIMIT 1
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting current competition:', error);
    throw error;
  }
}

async function getLeaderboard(limit = 100) {
  try {
    // Get current competition
    const competition = await getCurrentCompetition();
    
    if (!competition) {
      return [];
    }
    
    // Get top participants
    const result = await pool.query(`
      SELECT cp.*, u.username, u.email
      FROM competition_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.competition_id = $1
      ORDER BY cp.ads_watched DESC
      LIMIT $2
    `, [competition.id, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}

// Initialize the database when this module is loaded
initDatabase();

module.exports = {
  pool,
  createUser,
  getUserByUsername,
  getUserByEmail,
  recordAdView,
  getAdViewsByUserId,
  getCurrentCompetition,
  getLeaderboard
};