import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adViews = pgTable("ad_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const competitionParticipants = pgTable("competition_participants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  adsWatched: integer("ads_watched").notNull().default(0),
  lastActive: timestamp("last_active").notNull().defaultNow(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  email: text("email").notNull(),
  claimed: boolean("claimed").notNull().default(false),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create base schemas from database tables
const baseUserSchema = createInsertSchema(users);
const baseAdViewSchema = createInsertSchema(adViews);
const baseCompetitionSchema = createInsertSchema(competitions);
const baseCompetitionParticipantSchema = createInsertSchema(competitionParticipants);
const baseRewardSchema = createInsertSchema(rewards);

// User schemas
export const insertUserSchema = baseUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Ad view schemas
export const insertAdViewSchema = baseAdViewSchema.pick({
  userId: true,
});

// Competition schemas
export const insertCompetitionSchema = baseCompetitionSchema.pick({
  name: true,
  startDate: true,
  endDate: true,
  isActive: true,
});

// Competition participant schemas
export const insertCompetitionParticipantSchema = baseCompetitionParticipantSchema.pick({
  competitionId: true,
  userId: true,
});

// Reward schemas
export const insertRewardSchema = baseRewardSchema.pick({
  userId: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAdView = z.infer<typeof insertAdViewSchema>;
export type AdView = typeof adViews.$inferSelect;

export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;

export type InsertCompetitionParticipant = z.infer<typeof insertCompetitionParticipantSchema>;
export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;

export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
