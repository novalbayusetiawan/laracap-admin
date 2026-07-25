import { relations } from 'drizzle-orm'
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

/**
 * D1 schema — 1:1 port of the legacy Laravel migrations (see docs/02-data-model.md).
 *
 * Conventions matching the frozen API contract:
 *  - snake_case column names (raw model serialization, no transformers)
 *  - created_at / updated_at stored as TEXT to reproduce Laravel timestamp strings
 *  - numeric ids as INTEGER PK autoincrement; uuids as unique TEXT
 *
 * Fix vs. legacy: `bundles.size` is INTEGER bytes (legacy DOUBLE(8,2) could not
 * hold real byte counts and the JSON emits a plain number anyway).
 */

const timestamps = {
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerifiedAt: text('email_verified_at'),
  password: text('password').notNull(), // bcrypt hash (Laravel-compatible)
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isSuperadmin: integer('is_superadmin', { mode: 'boolean' }).notNull().default(false),
  rememberToken: text('remember_token'),
  ...timestamps,
})

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(), // public OTA route key
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  bundleLimit: integer('bundle_limit'), // null = unlimited retention
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  ...timestamps,
})

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // intentionally NOT unique per app (legacy quirk)
  ...timestamps,
})

export const bundles = sqliteTable(
  'bundles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }), // X-Bundle-Id
    uuid: text('uuid').notNull().unique(), // X-Bundle-Uuid
    name: text('name'), // version label
    description: text('description'),
    size: integer('size').notNull(), // bytes
    filePath: text('file_path').notNull(), // R2 object key
    applicationId: integer('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    channelId: integer('channel_id').references(() => channels.id, { onDelete: 'set null' }),
    androidMinVersionCode: integer('android_min_version_code'),
    androidMaxVersionCode: integer('android_max_version_code'),
    androidEqVersionCode: integer('android_eq_version_code'),
    iosMinVersionCode: integer('ios_min_version_code'),
    iosMaxVersionCode: integer('ios_max_version_code'),
    iosEqVersionCode: integer('ios_eq_version_code'),
    ...timestamps,
  },
  (t) => [
    // Hot path: findLatestCompatibleBundle walks a channel's bundles created_at DESC.
    index('bundles_channel_created_idx').on(t.channelId, t.createdAt),
    index('bundles_application_idx').on(t.applicationId),
  ],
)

export const devices = sqliteTable('devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceIdentifier: text('device_identifier').notNull().unique(),
  platform: text('platform'), // ios | android | web
  bundleId: integer('bundle_id').references(() => bundles.id, { onDelete: 'set null' }),
  lastActiveAt: text('last_active_at'),
  ...timestamps,
})

export const deviceLogs = sqliteTable(
  'device_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    deviceId: integer('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    applicationId: integer('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    bundleId: integer('bundle_id').references(() => bundles.id, { onDelete: 'set null' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    country: text('country'),
    city: text('city'),
    osVersion: text('os_version'),
    deviceModel: text('device_model'),
    type: text('type', { enum: ['check', 'download'] }).notNull().default('check'),
    ...timestamps,
  },
  (t) => [index('device_logs_device_idx').on(t.deviceId, t.createdAt)],
)

export const personalAccessTokens = sqliteTable(
  'personal_access_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tokenableType: text('tokenable_type').notNull(),
    tokenableId: integer('tokenable_id').notNull(),
    name: text('name').notNull(),
    token: text('token').notNull().unique(), // sha-256 hash of plain token
    abilities: text('abilities'), // JSON string, default ["*"]
    lastUsedAt: text('last_used_at'),
    expiresAt: text('expires_at'),
    ...timestamps,
  },
  (t) => [index('pat_tokenable_idx').on(t.tokenableType, t.tokenableId)],
)

/** App-wide settings (key-value). E.g. registration_enabled. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON-encoded
  updatedAt: text('updated_at'),
})

/** Admin session store (nuxt-auth-utils uses sealed cookies; this backs server-side lookups). */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  payload: text('payload').notNull(),
  lastActivity: integer('last_activity').notNull(),
})

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  email: text('email').primaryKey(),
  token: text('token').notNull(),
  createdAt: text('created_at'),
})

// ---- Relations (query ergonomics; explicit tenancy scoping still applied in queries) ----

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
}))

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  channels: many(channels),
  bundles: many(bundles),
}))

export const channelsRelations = relations(channels, ({ one, many }) => ({
  application: one(applications, {
    fields: [channels.applicationId],
    references: [applications.id],
  }),
  bundles: many(bundles),
}))

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  application: one(applications, {
    fields: [bundles.applicationId],
    references: [applications.id],
  }),
  channel: one(channels, { fields: [bundles.channelId], references: [channels.id] }),
  devices: many(devices),
}))

export const devicesRelations = relations(devices, ({ one, many }) => ({
  bundle: one(bundles, { fields: [devices.bundleId], references: [bundles.id] }),
  logs: many(deviceLogs),
}))

export const deviceLogsRelations = relations(deviceLogs, ({ one }) => ({
  device: one(devices, { fields: [deviceLogs.deviceId], references: [devices.id] }),
  application: one(applications, {
    fields: [deviceLogs.applicationId],
    references: [applications.id],
  }),
  bundle: one(bundles, { fields: [deviceLogs.bundleId], references: [bundles.id] }),
}))

// ---- Inferred types ----
export type User = typeof users.$inferSelect
export type Application = typeof applications.$inferSelect
export type Channel = typeof channels.$inferSelect
export type Bundle = typeof bundles.$inferSelect
export type Device = typeof devices.$inferSelect
export type DeviceLog = typeof deviceLogs.$inferSelect
export type PersonalAccessToken = typeof personalAccessTokens.$inferSelect
export type NewDevice = typeof devices.$inferInsert
export type NewDeviceLog = typeof deviceLogs.$inferInsert
