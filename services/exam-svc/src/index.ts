import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { exam_sessions, questions, session_answers, purchases, papers } from '@assessment/db/src/schema';
import { Env } from './types/env';
import { eq, and, sql, avg, count } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env }>();

app.post('/exams/start', async (c) => {
  try {
    const body = await c.req.json();
    const paper_id = body.paper_id;
    // Try to get user_id from body, fallback to X-User-Id header from Gateway
    const user_id = body.user_id || c.req.header('X-User-Id');

    if (!user_id || !paper_id) {
      return c.json({ error: 'Missing user_id or paper_id' }, 400);
    }

    const client = neon(c.env.DATABASE_URL);
    const db = drizzle(client);

    // Set duration for 60 minutes
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000);

    const session = await db.insert(exam_sessions).values({
      user_id,
      paper_id,
      started_at: startedAt,
      expires_at: expiresAt,
      status: 'in_progress',
    }).returning();

    return c.json({
      message: 'Exam session started',
      session_id: session[0].id,
      expires_at: expiresAt
    }, 201);

  } catch (error) {
    return c.json({ error: 'Failed to start session' }, 500);
  }
});

// --- GET /exams (get all participated exams with marks) ---
app.get('/exams', async (c) => {
  const user_id = c.req.header('X-User-Id');
  if (!user_id) return c.json({ error: 'Unauthorized' }, 401);

  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    const results = await db.execute(sql`
      SELECT 
        es.id as session_id,
        es.started_at,
        es.expires_at,
        es.submitted_at,
        es.score_pct,
        es.status,
        p.id as paper_id,
        p.title,
        p.subject,
        p.exam_board,
        p.year
      FROM ${exam_sessions} es
      JOIN papers p ON es.paper_id = p.id
      WHERE es.user_id = ${user_id}
      ORDER BY es.started_at DESC
    `);

    const sessions = (results as any).rows || results;
    return c.json(sessions);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch exam sessions' }, 500);
  }
});

app.get('/exams/stats', async (c) => {
  const user_id = c.req.header('X-User-Id');
  if (!user_id) return c.json({ error: 'Unauthorized' }, 401);

  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // 1. Total Enrolled Papers
    const enrolled = await db.select({ count: count() })
      .from(purchases)
      .where(eq(purchases.user_id, user_id));

    // 2. Completed Exams
    const completed = await db.select({ count: count() })
      .from(exam_sessions)
      .where(and(
        eq(exam_sessions.user_id, user_id),
        eq(exam_sessions.status, 'submitted')
      ));

    // 3. Average Score (Only include released results - time has ended)
    const average = await db.select({ avg: avg(exam_sessions.score_pct) })
      .from(exam_sessions)
      .where(and(
        eq(exam_sessions.user_id, user_id),
        eq(exam_sessions.status, 'submitted'),
        sql`expires_at <= NOW()`
      ));

    // 4. Total Papers (for the "suffix" if needed, or just return total)
    const totalPapers = await db.select({ count: count() })
      .from(papers)
      .where(eq(papers.is_published, true));

    return c.json({
      enrolled_count: enrolled[0]?.count || 0,
      completed_count: completed[0]?.count || 0,
      average_score: Math.round(parseFloat(average[0]?.avg || '0')),
      total_available_papers: totalPapers[0]?.count || 0
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// --- GET /exams/sessions/:id ---
app.get('/exams/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    const session = await db.select()
      .from(exam_sessions)
      .where(eq(exam_sessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const answers = await db.select()
      .from(session_answers)
      .where(eq(session_answers.session_id, sessionId));

    const answersMap = answers.reduce((acc, curr) => {
      acc[curr.question_id] = curr.selected_option_id;
      return acc;
    }, {} as Record<string, string | null>);

    return c.json({
      id: session[0].id,
      status: session[0].status,
      started_at: session[0].started_at,
      expires_at: session[0].expires_at,
      answers: answersMap
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});

// --- GET /exams/:id/questions ---
app.get('/exams/:id/questions', async (c) => {
  const sessionId = c.req.param('id');
  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    const session = await db.select()
      .from(exam_sessions)
      .where(eq(exam_sessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const result = await db.select()
      .from(questions)
      .where(eq(questions.paper_id, session[0].paper_id));

    // Assume questions.options is already the format the frontend expects (JSON array of Choice)
    // We map it to Choice[] if needed, but Hono/Drizzle usually handles JSON columns well.
    const mappedQuestions = result.map(q => ({
      id: q.id,
      content: q.question_text,
      choices: (q.options as any[]).map((opt: any) => ({
        id: opt.id,
        content: opt.text || opt.content // Map 'text' to 'content' for frontend compatibility
      }))
    }));

    return c.json(mappedQuestions);
  } catch (error) {
    return c.json({ error: 'Failed to fetch questions' }, 500);
  }
});

// --- POST /exams/:id/answer ---
app.post('/exams/:id/answer', async (c) => {
  const sessionId = c.req.param('id');
  const body = await c.req.json();
  // Support both snake_case (internal) and camelCase (frontend)
  const question_id = body.question_id;
  const selected_option_id = body.choice_id || body.selected_option_id;

  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // 1. Validate Session (Must be 'in_progress' and not expired)
    const session = await db.select()
      .from(exam_sessions)
      .where(eq(exam_sessions.id, sessionId))
      .limit(1);

    if (!session[0] || session[0].status !== 'in_progress') {
      return c.json({ error: 'Session is not active' }, 403);
    }

    if (new Date() > new Date(session[0].expires_at)) {
      return c.json({ error: 'Session has expired' }, 403);
    }

    // 2. Fetch the question to check the correct answer
    const question = await db.select()
      .from(questions)
      .where(eq(questions.id, question_id))
      .limit(1);

    if (!question[0]) {
      return c.json({ error: 'Question not found' }, 404);
    }

    // 3. Compare answers
    const isCorrect = question[0].correct_option_id === selected_option_id;

    // 4. Save/Upsert the answer
    const existingAnswer = await db.select()
      .from(session_answers)
      .where(and(eq(session_answers.session_id, sessionId), eq(session_answers.question_id, question_id)))
      .limit(1);

    if (existingAnswer[0]) {
      await db.update(session_answers)
        .set({
          selected_option_id: selected_option_id,
          is_correct: isCorrect,
          answered_at: new Date()
        })
        .where(eq(session_answers.id, existingAnswer[0].id));
    } else {
      await db.insert(session_answers).values({
        session_id: sessionId,
        question_id: question_id,
        selected_option_id: selected_option_id,
        is_correct: isCorrect,
      });
    }

    return c.json({
      success: true,
      is_correct: isCorrect, // keeping this for backwards compatibility, but frontend shouldn't use it
    });

  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/exams/:id/submit', async (c) => {
  const sessionId = c.req.param('id');
  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // 1. Get Session & Paper info
    const session = await db.select().from(exam_sessions).where(eq(exam_sessions.id, sessionId)).limit(1);
    if (!session[0] || session[0].status !== 'in_progress') {
      return c.json({ error: 'Invalid or already submitted session' }, 400);
    }

    // 2. Count total questions for this paper
    const totalQuestions = await db.select({ count: sql`count(*)` })
      .from(questions)
      .where(eq(questions.paper_id, session[0].paper_id));

    // 3. Count correct answers in this session
    const correctAnswers = await db.select({ count: sql`count(*)` })
      .from(session_answers)
      .where(and(
        eq(session_answers.session_id, sessionId),
        eq(session_answers.is_correct, true)
      ));

    const total = Number((totalQuestions[0] as any).count);
    const correct = Number((correctAnswers[0] as any).count);

    // 4. Calculate Percentage (Strict Requirement)
    const scorePct = total > 0 ? ((correct / total) * 100).toFixed(2) : "0.00";

    // 5. Update Session Status and Score
    const updated = await db.update(exam_sessions)
      .set({
        status: 'submitted',
        submitted_at: new Date(),
        score_pct: scorePct
      })
      .where(eq(exam_sessions.id, sessionId))
      .returning();

    return c.json({
      message: 'Exam submitted successfully',
      score: correct,
      total_questions: total,
      percentage: scorePct
    });

  } catch (error) {
    return c.json({ error: 'Submission failed' }, 500);
  }
});

// --- GET /exams/sessions/:id/analytics ---
app.get('/exams/sessions/:id/analytics', async (c) => {
  const sessionId = c.req.param('id');
  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    const session = await db.select().from(exam_sessions).where(eq(exam_sessions.id, sessionId)).limit(1);
    if (!session[0]) return c.json({ error: 'Session not found' }, 404);

    // Get performance by topic
    const response = await db.execute(sql`
      SELECT 
        q.topic_tag as topic,
        count(*) as total,
        count(*) FILTER (WHERE sa.is_correct = true) as correct
      FROM ${questions} q
      JOIN ${session_answers} sa ON q.id = sa.question_id
      WHERE sa.session_id = ${sessionId}
      GROUP BY q.topic_tag
    `);
    const topicBreakdown = (response as any).rows || response;

    return c.json({
      score_pct: session[0].score_pct,
      topic_breakdown: topicBreakdown
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// --- GET /exams/sessions/:id/review ---
app.get('/exams/sessions/:id/review', async (c) => {
  const sessionId = c.req.param('id');
  const client = neon(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    const response = await db.execute(sql`
      SELECT 
        q.id,
        q.question_text,
        q.options,
        q.correct_option_id,
        q.explanation,
        sa.selected_option_id,
        sa.is_correct
      FROM ${questions} q
      JOIN ${session_answers} sa ON q.id = sa.question_id
      WHERE sa.session_id = ${sessionId}
      ORDER BY q.order_index
    `);
    const reviewData = (response as any).rows || response;

    return c.json(reviewData);
  } catch (error) {
    return c.json({ error: 'Failed to fetch review data' }, 500);
  }
});

export default app;