import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertAdViewSchema, insertRewardSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const validatedData = insertAdViewSchema.parse({ userId: req.user.id });
      const adView = await storage.createAdView(validatedData);
      res.status(201).json(adView);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid request" });
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
