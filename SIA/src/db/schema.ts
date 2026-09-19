import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { AnalysisResult } from "@/lib/nlp/types";

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename"),
  wordCount: integer("word_count").notNull().default(0),
  sceneCount: integer("scene_count").notNull().default(0),
  characterCount: integer("character_count").notNull().default(0),
  protagonist: text("protagonist"),
  payload: jsonb("payload").$type<AnalysisResult>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AnalysisRow = typeof analyses.$inferSelect;

export const appliedFixes = pgTable("applied_fixes", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull(),
  issueId: text("issue_id").notNull(),
  optionId: text("option_id").notNull(),
  optionLabel: text("option_label").notNull(),
  issueTitle: text("issue_title").notNull(),
  sceneNumber: integer("scene_number").notNull(),
  original: text("original").notNull(),
  modified: text("modified").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AppliedFixRow = typeof appliedFixes.$inferSelect;
