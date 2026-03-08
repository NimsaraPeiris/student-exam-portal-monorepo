import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, sql } from 'drizzle-orm';
import { papers, questions, purchases } from '@assessment/db/src/schema';
import { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

// --- 1. GET /papers (with Caching & Filtering) ---
app.get('/papers', async (c) => {
  const subject = c.req.query('subject');
  const board = c.req.query('exam_board') || c.req.query('board'); // support both
  const type = c.req.query('type');
  const year = c.req.query('year');
  const language = c.req.query('language');

  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const offset = (page - 1) * limit;

  // Create a unique cache key based on the filters and pagination
  const cacheKey = `papers_list_${subject || 'all'}_${board || 'all'}_${type || 'all'}_${year || 'all'}_${language || 'all'}_p${page}_l${limit}`;

  // Try to get from Cloudflare KV first
  const cached = await c.env.PAPERS_CACHE.get(cacheKey);
  if (cached) {
    return c.json({ ...JSON.parse(cached), source: 'cache' });
  }

  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  // Build dynamic query
  const filters = [];
  if (subject) filters.push(eq(papers.subject, subject));
  if (board) filters.push(eq(papers.exam_board, board as any));
  if (type) filters.push(eq(papers.type, type as any));
  if (year) filters.push(eq(papers.year, Number(year)));
  if (language) filters.push(eq(papers.language, language));

  // 1. Get total count for pagination
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(papers)
    .where(filters.length > 0 ? and(...filters) : undefined);

  const total = Number(countResult[0]?.count || 0);

  // 2. Get paginated results with purchase status
  const userId = c.req.header('X-User-Id');

  // We use a LEFT JOIN to check if the paper is purchased by the current user
  const result = await db.execute(sql`
    SELECT 
      p.*,
      EXISTS (
        SELECT 1 FROM ${purchases} pu 
        WHERE pu.paper_id = p.id AND pu.user_id = ${userId || null}
      ) as is_purchased
    FROM ${papers} p
    WHERE ${filters.length > 0 ? and(...filters) : sql`TRUE`}
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const responseData = {
    data: result.map(p => ({
      ...p,
      price_lkr: Number(p.price_lkr) // Ensure numeric
    })),
    total,
    page,
    limit,
    source: 'database'
  };

  // Store in KV for 5 minutes (300 seconds)
  await c.env.PAPERS_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 300 });

  return c.json(responseData);
});

// --- 4. GET /papers/purchased ---
app.get('/papers/purchased', async (c) => {
  const userId = c.req.header('X-User-Id');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    const result = await db.execute(sql`
            SELECT 
                p.*,
                TRUE as is_purchased
            FROM ${papers} p
            JOIN ${purchases} pu ON p.id = pu.paper_id
            WHERE pu.user_id = ${userId}
            ORDER BY pu.purchased_at DESC
        `);

    return c.json({
      data: result.map(p => ({
        ...p,
        price_lkr: Number(p.price_lkr)
      }))
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch purchased papers' }, 500);
  }
});

// --- 3. POST /papers/:id/purchase (Simplified Purchase) ---
app.post('/papers/:id/purchase', async (c) => {
  const paperId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // 1. Check if paper exists
    const paper = await db.select().from(papers).where(eq(papers.id, paperId)).limit(1);
    if (paper.length === 0) return c.json({ error: 'Paper not found' }, 404);

    // 2. Check if already purchased
    const existing = await db.select().from(purchases)
      .where(and(eq(purchases.user_id, userId), eq(purchases.paper_id, paperId)))
      .limit(1);

    if (existing.length > 0) return c.json({ message: 'Already purchased' }, 200);

    // 3. Create purchase record
    await db.insert(purchases).values({
      user_id: userId,
      paper_id: paperId,
      amount_paid_lkr: paper[0].price_lkr.toString(),
      payment_method: 'mock_pay',
    });

    return c.json({ message: 'Purchase successful' }, 201);
  } catch (error) {
    return c.json({ error: 'Purchase failed' }, 500);
  }
});

// --- 2. GET /papers/search (Full-Text Search) ---
app.get('/papers/search', async (c) => {
  const q = c.req.query('q');
  if (!q) return c.json({ data: [], total: 0 });

  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  // Requirement: tsvector across title, subject, and topic tags.
  // We use a subquery to aggregate topic tags for each paper.
  const result = await db.execute(sql`
    WITH paper_topics AS (
      SELECT paper_id, string_agg(DISTINCT topic_tag, ' ') as tags
      FROM ${questions}
      GROUP BY paper_id
    )
    SELECT p.*, pt.tags
    FROM ${papers} p
    LEFT JOIN paper_topics pt ON p.id = pt.paper_id
    WHERE 
      to_tsvector('english', p.title || ' ' || p.subject || ' ' || COALESCE(pt.tags, '')) 
      @@ plainto_tsquery('english', ${q})
    LIMIT 20
  `);

  return c.json({
    data: result,
    total: result.length,
    source: 'database'
  });
});

// --- 3. GET /papers/:id/questions (Question Metadata) ---
app.get('/papers/:id/questions', async (c) => {
  const paperId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  // Check if paper is purchased
  let isPurchased = false;
  if (userId) {
    const purchase = await db.select()
      .from(purchases)
      .where(and(eq(purchases.user_id, userId), eq(purchases.paper_id, paperId)))
      .limit(1);
    isPurchased = purchase.length > 0;
  }

  // Requirement: Return metadata (order, difficulty, topic) without the answers
  let query = db.select({
    id: questions.id,
    order: questions.order_index,
    text: questions.question_text,
    options: questions.options,
    difficulty: questions.difficulty,
    topic: questions.topic_tag
  })
    .from(questions)
    .where(eq(questions.paper_id, paperId))
    .orderBy(questions.order_index);

  let result = await query;

  // Requirement: Display full questions only for purchased papers; unpurchased papers show only the first three questions as a preview.
  if (!isPurchased) {
    result = result.slice(0, 3);
  }

  return c.json({
    questions: result,
    is_preview: !isPurchased,
    total_count: result.length // This might be misleading if we want the actual total count
  });
});

export default app;