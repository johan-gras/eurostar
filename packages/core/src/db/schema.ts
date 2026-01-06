import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
  date,
  decimal,
  index,
  boolean,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const trainTypeEnum = pgEnum('train_type', [
  'e320',
  'e300',
  'classic',
  'ruby',
]);

export const claimStatusEnum = pgEnum('claim_status', [
  'pending',
  'eligible',
  'submitted',
  'approved',
  'rejected',
  'expired',
]);

export const compensationTypeEnum = pgEnum('compensation_type', [
  'cash',
  'voucher',
]);

export const terminalEnum = pgEnum('terminal', [
  'st_pancras',
  'paris_nord',
  'brussels_midi',
  'amsterdam_centraal',
]);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Trains table
export const trains = pgTable(
  'trains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: varchar('trip_id', { length: 20 }).notNull().unique(), // e.g., "9007-0105"
    trainNumber: varchar('train_number', { length: 4 }).notNull(), // 4 digits
    date: date('date', { mode: 'date' }).notNull(),
    scheduledDeparture: timestamp('scheduled_departure', {
      withTimezone: true,
    }).notNull(),
    scheduledArrival: timestamp('scheduled_arrival', {
      withTimezone: true,
    }).notNull(),
    actualArrival: timestamp('actual_arrival', { withTimezone: true }),
    delayMinutes: integer('delay_minutes'),
    trainType: trainTypeEnum('train_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_trains_date').on(table.date),
    index('idx_trains_train_number').on(table.trainNumber),
  ]
);

// Bookings table
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pnr: varchar('pnr', { length: 6 }).notNull(), // 6 alphanumeric
    tcn: varchar('tcn', { length: 12 }).notNull(), // IV + 9 digits or 15 + 9 digits
    trainId: uuid('train_id').references(() => trains.id, {
      onDelete: 'set null',
    }), // nullable until matched
    trainNumber: varchar('train_number', { length: 4 }).notNull(), // for matching before train exists
    journeyDate: date('journey_date', { mode: 'date' }).notNull(), // for matching before train exists
    origin: varchar('origin', { length: 10 }).notNull(), // station code
    destination: varchar('destination', { length: 10 }).notNull(), // station code
    passengerName: varchar('passenger_name', { length: 255 }).notNull(),
    coach: varchar('coach', { length: 3 }), // nullable
    seat: varchar('seat', { length: 5 }), // nullable
    finalDelayMinutes: integer('final_delay_minutes'), // populated after journey
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_bookings_user_id').on(table.userId),
    index('idx_bookings_pnr').on(table.pnr),
    index('idx_bookings_train_id').on(table.trainId),
    index('idx_bookings_journey_date').on(table.journeyDate),
  ]
);

// Claims table
export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' })
      .unique(),
    delayMinutes: integer('delay_minutes').notNull(),
    eligibleCashAmount: decimal('eligible_cash_amount', {
      precision: 10,
      scale: 2,
    }),
    eligibleVoucherAmount: decimal('eligible_voucher_amount', {
      precision: 10,
      scale: 2,
    }),
    status: claimStatusEnum('status').notNull().default('pending'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_claims_booking_id').on(table.bookingId),
    index('idx_claims_status').on(table.status),
  ]
);

// Sessions table
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_token').on(table.token),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ]
);

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  seatPreferences: jsonb('seat_preferences').$type<SeatPreferences>(),
  queueNotifications: boolean('queue_notifications').notNull().default(true),
  defaultTerminal: terminalEnum('default_terminal'),
  preferredCompensationType: compensationTypeEnum('preferred_compensation_type'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Seat preferences JSON structure
export interface SeatPreferences {
  position?: 'window' | 'aisle' | 'middle';
  direction?: 'forward' | 'backward' | 'any';
  coach?: 'quiet' | 'standard' | 'any';
  table?: boolean;
  powerSocket?: boolean;
}

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(bookings),
  sessions: many(sessions),
  preferences: one(userPreferences),
}));

export const trainsRelations = relations(trains, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  train: one(trains, {
    fields: [bookings.trainId],
    references: [trains.id],
  }),
  claim: one(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  booking: one(bookings, {
    fields: [claims.bookingId],
    references: [bookings.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Train = typeof trains.$inferSelect;
export type NewTrain = typeof trains.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type TrainType = (typeof trainTypeEnum.enumValues)[number];
export type ClaimStatus = (typeof claimStatusEnum.enumValues)[number];
export type CompensationType = (typeof compensationTypeEnum.enumValues)[number];
export type Terminal = (typeof terminalEnum.enumValues)[number];

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
