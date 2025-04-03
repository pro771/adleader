import { 
  users, adViews, rewards, competitions, competitionParticipants,
  type User, type InsertUser, 
  type AdView, type InsertAdView, 
  type Reward, type InsertReward,
  type Competition, type InsertCompetition,
  type CompetitionParticipant, type InsertCompetitionParticipant
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Memory store for session
const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Ad view operations
  getAdViewsByUserId(userId: number): Promise<AdView[]>;
  createAdView(adView: InsertAdView): Promise<AdView>;
  countAdViewsByUserId(userId: number): Promise<number>;
  
  // Competition operations
  getCurrentCompetition(): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  getCompetitionById(id: number): Promise<Competition | undefined>;
  endCompetition(id: number): Promise<Competition | undefined>;
  
  // Competition participant operations
  getParticipantByUserIdAndCompetitionId(userId: number, competitionId: number): Promise<CompetitionParticipant | undefined>;
  createParticipant(participant: InsertCompetitionParticipant): Promise<CompetitionParticipant>;
  incrementParticipantAdCount(userId: number, competitionId: number): Promise<CompetitionParticipant | undefined>;
  getLeaderboard(competitionId: number, limit?: number): Promise<CompetitionParticipant[]>;
  
  // Reward operations
  getRewardByUserId(userId: number): Promise<Reward | undefined>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateRewardClaimed(userId: number): Promise<Reward | undefined>;
  
  // Legacy methods
  getQualifiedUsers(): Promise<User[]>;
  
  // Session store
  sessionStore: any; // Use any type for session store to avoid type issues
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private adViews: Map<number, AdView>;
  private rewards: Map<number, Reward>;
  private competitions: Map<number, Competition>;
  private participants: Map<number, CompetitionParticipant>;
  sessionStore: any;
  
  private userCurrentId: number;
  private adViewCurrentId: number;
  private rewardCurrentId: number;
  private competitionCurrentId: number;
  private participantCurrentId: number;

  constructor() {
    this.users = new Map();
    this.adViews = new Map();
    this.rewards = new Map();
    this.competitions = new Map();
    this.participants = new Map();
    
    this.userCurrentId = 1;
    this.adViewCurrentId = 1;
    this.rewardCurrentId = 1;
    this.competitionCurrentId = 1;
    this.participantCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create an initial competition if none exists
    this.initializeCompetition();
  }
  
  private async initializeCompetition() {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    
    this.createCompetition({
      name: 'Weekly Competition #1',
      startDate: now,
      endDate: nextWeek,
      isActive: true
    });
  }

  // User operations
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
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }
  
  // Ad view operations
  async getAdViewsByUserId(userId: number): Promise<AdView[]> {
    return Array.from(this.adViews.values()).filter(
      (adView) => adView.userId === userId,
    );
  }
  
  async countAdViewsByUserId(userId: number): Promise<number> {
    const adViews = await this.getAdViewsByUserId(userId);
    return adViews.length;
  }
  
  async createAdView(insertAdView: InsertAdView): Promise<AdView> {
    const id = this.adViewCurrentId++;
    const adView: AdView = { 
      ...insertAdView, 
      id, 
      viewedAt: new Date() 
    };
    this.adViews.set(id, adView);
    
    // Update participant record if there's an active competition
    const competition = await this.getCurrentCompetition();
    if (competition) {
      await this.incrementParticipantAdCount(insertAdView.userId, competition.id);
    }
    
    return adView;
  }
  
  // Competition operations
  async getCurrentCompetition(): Promise<Competition | undefined> {
    return Array.from(this.competitions.values()).find(
      (competition) => competition.isActive,
    );
  }
  
  async getCompetitionById(id: number): Promise<Competition | undefined> {
    return this.competitions.get(id);
  }
  
  async createCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
    const id = this.competitionCurrentId++;
    const competition: Competition = {
      ...insertCompetition,
      id,
      createdAt: new Date(),
      isActive: insertCompetition.isActive ?? true
    };
    this.competitions.set(id, competition);
    return competition;
  }
  
  async endCompetition(id: number): Promise<Competition | undefined> {
    const competition = await this.getCompetitionById(id);
    if (competition) {
      const updatedCompetition: Competition = {
        ...competition,
        isActive: false
      };
      this.competitions.set(id, updatedCompetition);
      return updatedCompetition;
    }
    return undefined;
  }
  
  // Competition participant operations
  async getParticipantByUserIdAndCompetitionId(userId: number, competitionId: number): Promise<CompetitionParticipant | undefined> {
    return Array.from(this.participants.values()).find(
      (participant) => participant.userId === userId && participant.competitionId === competitionId
    );
  }
  
  async createParticipant(insertParticipant: InsertCompetitionParticipant): Promise<CompetitionParticipant> {
    const id = this.participantCurrentId++;
    const participant: CompetitionParticipant = {
      ...insertParticipant,
      id,
      adsWatched: 0,
      lastActive: new Date()
    };
    this.participants.set(id, participant);
    return participant;
  }
  
  async incrementParticipantAdCount(userId: number, competitionId: number): Promise<CompetitionParticipant | undefined> {
    let participant = await this.getParticipantByUserIdAndCompetitionId(userId, competitionId);
    
    // Create participant if it doesn't exist
    if (!participant) {
      participant = await this.createParticipant({
        userId,
        competitionId
      });
    }
    
    // Increment ad count
    const updatedParticipant: CompetitionParticipant = {
      ...participant,
      adsWatched: participant.adsWatched + 1,
      lastActive: new Date()
    };
    
    this.participants.set(participant.id, updatedParticipant);
    return updatedParticipant;
  }
  
  async getLeaderboard(competitionId: number, limit: number = 100): Promise<CompetitionParticipant[]> {
    // Filter participants by competition
    const competitionParticipants = Array.from(this.participants.values())
      .filter(participant => participant.competitionId === competitionId);
    
    // Sort by ad count (descending)
    const sortedParticipants = competitionParticipants.sort(
      (a, b) => b.adsWatched - a.adsWatched
    );
    
    // Return top N participants
    return sortedParticipants.slice(0, limit);
  }
  
  // Reward operations
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
      claimedAt: null,
      createdAt: new Date()
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
  
  // Legacy methods
  async getQualifiedUsers(): Promise<User[]> {
    const qualifiedUserIds = new Set<number>();
    
    // Get users with 5 or more ad views
    for (const userId of Array.from(this.users.keys())) {
      const adViews = await this.getAdViewsByUserId(userId);
      if (adViews.length >= 5) {
        qualifiedUserIds.add(userId);
      }
    }
    
    // Return qualified users
    return Array.from(qualifiedUserIds).map(id => this.users.get(id)!);
  }
}

// Use in-memory storage by default
export const storage = new MemStorage();

// Uncomment to use PostgreSQL storage (requires database setup)
// export class DatabaseStorage implements IStorage {
//   sessionStore: any;
//   
//   constructor() {
//     this.sessionStore = new PostgresSessionStore({ 
//       pool, 
//       createTableIfMissing: true 
//     });
//   }
//   
//   // Implementation would use Drizzle db operations here
// }
