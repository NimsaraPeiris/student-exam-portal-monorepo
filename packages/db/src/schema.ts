import { 
  pgTable, uuid, text, numeric, boolean, timestamp, pgEnum, jsonb, integer, uniqueIndex, index, unique 
} from 'drizzle-orm/pg-core';

// --- ENUMS ---
export const paperTypeEnum = pgEnum('paper_type', ['past_paper', 'model_paper']);
export const examBoardEnum = pgEnum('exam_board', ['GCE_A', 'GCE_O']);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const sessionStatusEnum = pgEnum('session_status', ['in_progress', 'submitted', 'expired']);

// --- TABLES ---

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  avatar_url: text('avatar_url'),
  grade_year: integer('grade_year'),
  preferred_language: text('preferred_language'),
  two_fa_enabled: boolean('two_fa_enabled').default(false),
  two_fa_secret: text('two_fa_secret'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const papers = pgTable('papers', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  type: paperTypeEnum('type').notNull(),
  subject: text('subject').notNull(),
  exam_board: examBoardEnum('exam_board').notNull(),
  language: text('language').notNull(),
  year: integer('year').notNull(),
  price_lkr: numeric('price_lkr').notNull(),
  is_published: boolean('is_published').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Required index 
  searchIdx: index('papers_search_idx').on(table.subject, table.exam_board, table.language, table.type),
}));

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  paper_id: uuid('paper_id').references(() => papers.id, { onDelete: 'cascade' }).notNull(),
  question_text: text('question_text').notNull(),
  options: jsonb('options').notNull(), // array of {id, text} 
  correct_option_id: text('correct_option_id').notNull(),
  explanation: text('explanation'),
  difficulty: difficultyEnum('difficulty').notNull(),
  topic_tag: text('topic_tag'),
  order_index: integer('order_index').notNull(),
});

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  paper_id: uuid('paper_id').references(() => papers.id).notNull(),
  amount_paid_lkr: numeric('amount_paid_lkr').notNull(),
  payment_method: text('payment_method').notNull(),
  payment_ref: text('payment_ref'),
  purchased_at: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  // Enforce UNIQUE and add index 
  unqPurchase: unique().on(table.user_id, table.paper_id),
  userIdx: index('purchases_user_idx').on(table.user_id),
}));

export const exam_sessions = pgTable('exam_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  paper_id: uuid('paper_id').references(() => papers.id).notNull(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at').notNull(),
  submitted_at: timestamp('submitted_at'),
  score_pct: numeric('score_pct'),
  status: sessionStatusEnum('status').notNull(),
}, (table) => ({
  // Required index 
  userStatusIdx: index('exam_sessions_user_status_idx').on(table.user_id, table.status),
}));

export const session_answers = pgTable('session_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  session_id: uuid('session_id').references(() => exam_sessions.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id).notNull(),
  selected_option_id: text('selected_option_id'),
  is_correct: boolean('is_correct'),
  answered_at: timestamp('answered_at').defaultNow().notNull(),
}, (table) => ({
  // Enforce UNIQUE 
  unqAnswer: unique().on(table.session_id, table.question_id),
}));