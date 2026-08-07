import {
  sqliteTable,
  text,
  integer,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * SQLite schema matching services/webinar/database/sqlite.db
 * (and backend/drizzle/0000_calm_xavin.sql).
 */

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('client').notNull(), // 'admin' | 'client'
  name: text('name'),
  companyName: text('company_name'),
  phone: text('phone'),
  website: text('website'),
  profileImageUrl: text('profile_image_url'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  price: integer('price').notNull(),
  maxDurationMinutes: integer('max_duration_minutes'),
  maxParticipants: integer('max_participants'),
  replayStorageDays: integer('replay_storage_days'),
  features: text('features'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const clientSubscriptions = sqliteTable('client_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull(),
  planId: integer('plan_id').notNull(),
  status: text('status').default('active'),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at'),
  paymentStatus: text('payment_status').default('pending'),
  paymentMethod: text('payment_method'),
  lastPaymentDate: text('last_payment_date'),
  autoRenewal: integer('auto_renewal').default(1),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const webinars = sqliteTable('webinars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  scheduledDate: text('scheduled_date').notNull(),
  durationMinutes: integer('duration_minutes'),
  isRecurring: integer('is_recurring').default(0),
  recurrencePattern: text('recurrence_pattern'),
  recurrenceEndDate: text('recurrence_end_date'),
  timezone: text('timezone').default('America/Sao_Paulo'),
  status: text('status').default('draft'),
  presenterName: text('presenter_name'),
  presenterBio: text('presenter_bio'),
  presenterImageUrl: text('presenter_image_url'),
  registrationPageColor: text('registration_page_color').default('#007bff'),
  maxParticipants: integer('max_participants'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const webinarAccessCodes = sqliteTable('webinar_access_codes', {
  id: text('id').primaryKey(),
  webinarId: integer('webinar_id').notNull(),
  code: text('code').notNull().unique(),
  scheduledAt: text('scheduled_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  maxLeads: integer('max_leads'),
  currentLeads: integer('current_leads').default(0).notNull(),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  webinarId: integer('webinar_id'),
  sessionId: integer('session_id'),
  status: text('status').default('registered'),
  registeredAt: text('registered_at').default(sql`CURRENT_TIMESTAMP`),
  attendedAt: text('attended_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const leadChatMessages = sqliteTable('lead_chat_messages', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').notNull(),
  webinarId: integer('webinar_id').notNull(),
  accessCodeId: text('access_code_id').notNull(),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  webinarId: integer('webinar_id').notNull(),
  participantId: integer('participant_id'),
  senderName: text('sender_name'),
  senderEmail: text('sender_email'),
  message: text('message').notNull(),
  timestampSeconds: integer('timestamp_seconds').notNull(),
  isFromReplay: integer('is_from_replay').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})
