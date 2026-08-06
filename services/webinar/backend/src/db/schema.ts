import { mysqlTable, varchar, timestamp, int, decimal, text, datetime, mysqlEnum, tinyint } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'client']).default('client').notNull(),
  name: varchar('name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  website: varchar('website', { length: 255 }),
  profileImageUrl: varchar('profile_image_url', { length: 500 }),
  isActive: tinyint('is_active').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const plans = mysqlTable('plans', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  maxDurationMinutes: int('max_duration_minutes'),
  maxParticipants: int('max_participants'),
  replayStorageDays: int('replay_storage_days'),
  features: text('features'),
  isActive: tinyint('is_active').default(1),
  createdAt: timestamp('created_at').defaultNow()
});

export const clientSubscriptions = mysqlTable('client_subscriptions', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull(),
  planId: int('plan_id').notNull(),
  status: mysqlEnum('status', ['active', 'expired', 'cancelled', 'suspended']).default('active'),
  startedAt: timestamp('started_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  paymentStatus: mysqlEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']).default('pending'),
  paymentMethod: varchar('payment_method', { length: 100 }),
  lastPaymentDate: timestamp('last_payment_date'),
  autoRenewal: tinyint('auto_renewal').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const webinars = mysqlTable('webinars', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  scheduledDate: datetime('scheduled_date').notNull(),
  durationMinutes: int('duration_minutes'),
  isRecurring: tinyint('is_recurring').default(0),
  recurrencePattern: varchar('recurrence_pattern', { length: 100 }),
  recurrenceEndDate: datetime('recurrence_end_date'),
  timezone: varchar('timezone', { length: 100 }).default('America/Sao_Paulo'),
  status: mysqlEnum('status', ['draft', 'scheduled', 'live', 'completed', 'cancelled']).default('draft'),
  presenterName: varchar('presenter_name', { length: 255 }),
  presenterBio: text('presenter_bio'),
  presenterImageUrl: varchar('presenter_image_url', { length: 500 }),
  registrationPageColor: varchar('registration_page_color', { length: 7 }).default('#007bff'),
  maxParticipants: int('max_participants'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const webinarAccessCodes = mysqlTable('webinar_access_codes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  webinarId: varchar('webinar_id', { length: 36 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  scheduledAt: datetime('scheduled_at').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  maxLeads: int('max_leads'),
  currentLeads: int('current_leads').default(0).notNull(),
  isActive: tinyint('is_active').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const leads = mysqlTable('leads', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  webinarId: int('webinar_id'),
  sessionId: int('session_id'),
  status: mysqlEnum('status', ['registered', 'attended', 'no-show']).default('registered'),
  registeredAt: timestamp('registered_at').defaultNow(),
  attendedAt: timestamp('attended_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const leadChatMessages = mysqlTable('lead_chat_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  leadId: varchar('lead_id', { length: 36 }).notNull(),
  webinarId: int('webinar_id').notNull(),
  accessCodeId: varchar('access_code_id', { length: 36 }).notNull(),
  message: text('message').notNull(),
  timestamp: datetime('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  webinarId: int("webinar_id").notNull(),
  participantId: int("participant_id"),
  senderName: varchar("sender_name", { length: 255 }),
  senderEmail: varchar("sender_email", { length: 255 }),
  message: text("message").notNull(),
  timestampSeconds: int("timestamp_seconds").notNull(),
  isFromReplay: tinyint("is_from_replay").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id'),
  action: varchar('action', { length: 255 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: varchar('entity_id', { length: 36 }),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow()
});
