import { users, adViews, rewards, type User, type InsertUser, type AdView, type InsertAdView, type Reward, type InsertReward } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// Memory store for session
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAdViewsByUserId(userId: number): Promise<AdView[]>;
  createAdView(adView: InsertAdView): Promise<AdView>;
  
  getRewardByUserId(userId: number): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateRewardClaimed(userId: number): Promise<Reward | undefined>;
  
  getQualifiedUsers(): Promise<User[]>;
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private adViews: Map<number, AdView>;
  private rewards: Map<number, Reward>;
  sessionStore: session.SessionStore;
  
  private userCurrentId: number;
  private adViewCurrentId: number;
  private rewardCurrentId: number;

  constructor() {
    this.users = new Map();
    this.adViews = new Map();
    this.rewards = new Map();
    this.userCurrentId = 1;
    this.adViewCurrentId = 1;
    this.rewardCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getAdViewsByUserId(userId: number): Promise<AdView[]> {
    return Array.from(this.adViews.values()).filter(
      (adView) => adView.userId === userId,
    );
  }
  
  async createAdView(insertAdView: InsertAdView): Promise<AdView> {
    const id = this.adViewCurrentId++;
    const adView: AdView = { 
      ...insertAdView, 
      id, 
      viewedAt: new Date() 
    };
    this.adViews.set(id, adView);
    return adView;
  }
  
  async getRewardByUserId(userId: number): Promise<Reward | undefined> {
    return Array.from(this.rewards.values()).find(
      (reward) => reward.userId === userId,
    );
  }
  
  async createReward(insertReward: InsertReward): Promise<Reward> {
    const id = this.rewardCurrentId++;
    const reward: Reward = { 
      ...insertReward, 
      id,
      claimed: false,
      claimedAt: undefined
    };
    this.rewards.set(id, reward);
    return reward;
  }
  
  async updateRewardClaimed(userId: number): Promise<Reward | undefined> {
    const reward = await this.getRewardByUserId(userId);
    if (reward) {
      const updatedReward: Reward = {
        ...reward,
        claimed: true,
        claimedAt: new Date()
      };
      this.rewards.set(reward.id, updatedReward);
      return updatedReward;
    }
    return undefined;
  }
  
  async getQualifiedUsers(): Promise<User[]> {
    const qualifiedUserIds = new Set<number>();
    
    // Get users with 4 or more ad views
    for (const userId of Array.from(this.users.keys())) {
      const adViews = await this.getAdViewsByUserId(userId);
      if (adViews.length >= 4) {
        qualifiedUserIds.add(userId);
      }
    }
    
    // Return qualified users
    return Array.from(qualifiedUserIds).map(id => this.users.get(id)!);
  }
}

export const storage = new MemStorage();
