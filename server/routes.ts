import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertAdViewSchema, insertRewardSchema } from "@shared/schema";
import { z } from "zod";
import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';
import * as path from 'path';

// We'll use pg directly since we're in an ESM context
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve our custom index.html file for both / and /competition
  app.get('/', (req, res) => {
    res.sendFile('index.html', { root: process.cwd() });
  });
  
  app.get('/competition', (req, res) => {
    res.sendFile('index.html', { root: process.cwd() });
  });
  
  // Setup authentication routes
  setupAuth(app);

  // Get ad views for the current user
  app.get("/api/ad-views", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const adViews = await storage.getAdViewsByUserId(req.user.id);
    res.json(adViews);
  });

  // Create a new ad view
  app.post("/api/ad-views", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.id;
      
      // First, store in the storage system for compatibility with existing code
      const validatedData = insertAdViewSchema.parse({ userId });
      const adView = await storage.createAdView(validatedData);
      
      // Then, record in the competition database
      try {
        // Insert ad_view record
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
      } catch (dbError) {
        console.error('Error updating competition database:', dbError);
        // Continue with the response since we already have the adView from storage
      }
      
      res.status(201).json(adView);
    } catch (err) {
      console.error('Error recording ad view:', err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get reward for the current user
  app.get("/api/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const reward = await storage.getRewardByUserId(req.user.id);
    if (!reward) {
      return res.status(404).json({ message: "No reward found" });
    }
    
    res.json(reward);
  });

  // Create a new reward claim
  app.post("/api/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user has watched at least 4 ads
    const adViews = await storage.getAdViewsByUserId(req.user.id);
    if (adViews.length < 4) {
      return res.status(400).json({ message: "Not enough ads watched" });
    }
    
    // Check if user already has a reward
    const existingReward = await storage.getRewardByUserId(req.user.id);
    if (existingReward) {
      return res.status(400).json({ message: "Reward already claimed" });
    }
    
    try {
      // Validate email and create reward
      const validateData = z.object({
        email: z.string().email("Invalid email format")
      }).parse(req.body);
      
      const rewardData = insertRewardSchema.parse({
        userId: req.user.id,
        email: validateData.email
      });
      
      const reward = await storage.createReward(rewardData);
      res.status(201).json(reward);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Get current active competition
  app.get("/api/competition", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM competitions 
        WHERE is_active = TRUE AND end_date > CURRENT_TIMESTAMP
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.json(null);
      }
    } catch (err) {
      console.error('Error getting competition:', err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      // Get current competition
      const competitionResult = await pool.query(`
        SELECT id FROM competitions 
        WHERE is_active = TRUE AND end_date > CURRENT_TIMESTAMP
        LIMIT 1
      `);
      
      if (competitionResult.rows.length === 0) {
        return res.json([]);
      }
      
      const competitionId = competitionResult.rows[0].id;
      
      // Get top participants who have watched at least 5 ads
      const result = await pool.query(`
        SELECT cp.*, u.username, u.email
        FROM competition_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.competition_id = $1 AND cp.ads_watched >= 5
        ORDER BY cp.ads_watched DESC
        LIMIT $2
      `, [competitionId, limit]);
      
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting leaderboard:', err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin route to get qualified users
  app.get("/api/admin/qualified-users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // In a real app, we would check if the user is an admin
    // For simplicity, we'll just return the data
    const users = await storage.getQualifiedUsers();
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  });

  const httpServer = createServer(app);

  return httpServer;
}
