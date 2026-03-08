import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

config({ path: '../../.env' });

// 1. Set up the database connection
const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient, { schema });

async function main() {
    console.log('🌱 Starting database seeding...');

    // 2. Insert 2 Users
    const insertedUsers = await db.insert(schema.users).values([
        {
            email: 'student1@app.com',
            password_hash: 'nimsara',
            full_name: 'Nimsara',
        },
        {
            email: 'student2@app.com',
            password_hash: 'nimsara',
            full_name: 'Sasanka',
        }
    ]).returning();
    console.log(`✅ Inserted ${insertedUsers.length} users.`);

    // 3. Insert 1 Paper
    const insertedPapers = await db.insert(schema.papers).values([
        {
            title: '2023 GCE A/L Physics Past Paper',
            type: 'past_paper',
            subject: 'Physics',
            exam_board: 'GCE_A',
            language: 'English',
            year: 2023,
            price_lkr: '1500.00',
            is_published: true,
        }
    ]).returning();
    console.log(`✅ Inserted 1 paper.`);
    const paperId = insertedPapers[0].id;

    // 4. Insert 5 Questions for the Paper
    const questionsData = Array.from({ length: 5 }).map((_, i) => ({
        paper_id: paperId,
        question_text: `Sample Physics Question ${i + 1}?`,
        options: [
            { id: 'A', text: 'Option A' },
            { id: 'B', text: 'Option B' },
            { id: 'C', text: 'Option C' },
            { id: 'D', text: 'Option D' }
        ],
        correct_option_id: 'A',
        difficulty: 'medium' as const,
        order_index: i + 1,
    }));
    const insertedQuestions = await db.insert(schema.questions).values(questionsData).returning();
    console.log(`✅ Inserted 5 questions.`);

    // 5. Insert 1 Completed Exam Session
    const insertedSessions = await db.insert(schema.exam_sessions).values([
        {
            user_id: insertedUsers[0].id,
            paper_id: paperId,
            started_at: new Date(Date.now() - 3600000), // Started 1 hour ago
            expires_at: new Date(Date.now() + 3600000),
            submitted_at: new Date(),
            score_pct: '80.00',
            status: 'submitted',
        }
    ]).returning();
    console.log(`✅ Inserted 1 completed exam session.`);
    const sessionId = insertedSessions[0].id;

    // 6. Insert Session Answers
    const answersData = insertedQuestions.map((q, i) => ({
        session_id: sessionId,
        question_id: q.id,
        selected_option_id: i < 4 ? 'A' : 'B', // 4 correct answers, 1 wrong
        is_correct: i < 4,
    }));
    await db.insert(schema.session_answers).values(answersData);
    console.log(`✅ Inserted ${answersData.length} session answers.`);

    console.log('🎉 Seeding complete!');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});