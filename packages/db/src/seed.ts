import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

config({ path: '../../.env' });

// 1. Set up the database connection
const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
    console.log('🌱 Starting Sri Lankan context database seeding...');

    // Clean up existing data (Optional, but good for a fresh seed)
    // await db.delete(schema.session_answers);
    // await db.delete(schema.exam_sessions);
    // await db.delete(schema.questions);
    // await db.delete(schema.purchases);
    // await db.delete(schema.papers);
    // await db.delete(schema.users);

    // 1. Insert Users
    const insertedUsers = await db.insert(schema.users).values([
        {
            email: 'nimsara@student.com',
            password_hash: '$2a$12$LQv3c1V.K08Y9u1v8R2uS.K5QY6v7w8x9y0z1a2b3c4d5e6f7g8h9', // hashed 'nimsara'
            full_name: 'Nimsara Peiris',
            grade_year: 13,
            preferred_language: 'English',
        },
        {
            email: 'sasanka@student.com',
            password_hash: '$2a$12$LQv3c1V.K08Y9u1v8R2uS.K5QY6v7w8x9y0z1a2b3c4d5e6f7g8h9',
            full_name: 'Sasanka Silva',
            grade_year: 11,
            preferred_language: 'Sinhala',
        }
    ]).onConflictDoNothing().returning();

    console.log(`✅ Users setup complete.`);

    // 2. Insert Papers (Sri Lankan Context)
    const papersData = [
        {
            title: '2023 GCE A/L Physics - Component 1 (MCQ)',
            type: 'past_paper' as const,
            subject: 'Physics',
            exam_board: 'GCE_A' as const,
            language: 'English',
            year: 2023,
            price_lkr: '500.00',
            is_published: true,
        },
        {
            title: '2022 GCE A/L Combined Mathematics I',
            type: 'past_paper' as const,
            subject: 'Combined Mathematics',
            exam_board: 'GCE_A' as const,
            language: 'English',
            year: 2022,
            price_lkr: '450.00',
            is_published: true,
        },
        {
            title: '2023 GCE O/L Mathematics',
            type: 'past_paper' as const,
            subject: 'Mathematics',
            exam_board: 'GCE_O' as const,
            language: 'English',
            year: 2023,
            price_lkr: '300.00',
            is_published: true,
        },
        {
            title: '2022 GCE A/L Chemistry - MCQ',
            type: 'past_paper' as const,
            subject: 'Chemistry',
            exam_board: 'GCE_A' as const,
            language: 'English',
            year: 2022,
            price_lkr: '500.00',
            is_published: true,
        },
        {
            title: '2023 GCE O/L Science',
            type: 'past_paper' as const,
            subject: 'Science',
            exam_board: 'GCE_O' as const,
            language: 'Sinhala',
            year: 2023,
            price_lkr: '250.00',
            is_published: true,
        },
        {
            title: 'Model Paper 2024 - Physics (Mechanics)',
            type: 'model_paper' as const,
            subject: 'Physics',
            exam_board: 'GCE_A' as const,
            language: 'English',
            year: 2024,
            price_lkr: '150.00',
            is_published: true,
        }
    ];

    const insertedPapers = await db.insert(schema.papers).values(papersData).onConflictDoNothing().returning();
    console.log(`✅ Inserted ${insertedPapers.length} papers.`);

    // Find the primary paper ID (Physics 2023)
    const physicsPaper = insertedPapers.find(p => p.title.includes('2023 GCE A/L Physics')) || insertedPapers[0];

    // 3. Insert Questions for Physics Paper
    const physicsQuestions = [
        {
            paper_id: physicsPaper.id,
            question_text: 'The dimensions of Universal Gravitational Constant (G) are:',
            options: [
                { id: '1', text: 'M^-1 L^3 T^-2' },
                { id: '2', text: 'M L^2 T^-2' },
                { id: '3', text: 'M L^3 T^-2' },
                { id: '4', text: 'M^-1 L^2 T^-2' },
                { id: '5', text: 'M L^2 T^-1' }
            ],
            correct_option_id: '1',
            explanation: 'G = Fr^2 / m1m2. Dimensions: [L][T^-2][L^2] / [M][M] = M^-1 L^3 T^-2',
            difficulty: 'easy' as const,
            topic_tag: 'Units and Dimensions',
            order_index: 1,
        },
        {
            paper_id: physicsPaper.id,
            question_text: 'A ball is thrown vertically upwards with a velocity of 20 m/s. Neglecting air resistance, what is the maximum height reached? (g = 10 m/s^2)',
            options: [
                { id: '1', text: '10 m' },
                { id: '2', text: '20 m' },
                { id: '3', text: '40 m' },
                { id: '4', text: '5 m' },
                { id: '5', text: '15 m' }
            ],
            correct_option_id: '2',
            explanation: 'h = v^2 / 2g = 20^2 / (2*10) = 400 / 20 = 20 m',
            difficulty: 'easy' as const,
            topic_tag: 'Mechanics',
            order_index: 2,
        },
        {
            paper_id: physicsPaper.id,
            question_text: 'In a Simple Harmonic Motion (SHM), the velocity is maximum at:',
            options: [
                { id: '1', text: 'The extreme positions' },
                { id: '2', text: 'The mean position' },
                { id: '3', text: 'Halfway between mean and extreme' },
                { id: '4', text: 'The point where acceleration is maximum' },
                { id: '5', text: 'Any point in the cycle' }
            ],
            correct_option_id: '2',
            explanation: 'In SHM, v = ω√(A^2 - x^2). At mean position (x=0), v = ωA (maximum).',
            difficulty: 'medium' as const,
            topic_tag: 'Oscillations and Waves',
            order_index: 3,
        },
        {
            paper_id: physicsPaper.id,
            question_text: 'The fundamental frequency of a closed pipe of length L is f. If the pipe is opened at both ends, the fundamental frequency will be:',
            options: [
                { id: '1', text: 'f / 2' },
                { id: '2', text: 'f' },
                { id: '3', text: '2f' },
                { id: '4', text: '4f' },
                { id: '5', text: 'f / 4' }
            ],
            correct_option_id: '3',
            explanation: 'Closed pipe: f = v/4L. Open pipe: f\' = v/2L. Therefore f\' = 2f.',
            difficulty: 'medium' as const,
            topic_tag: 'Sound',
            order_index: 4,
        },
        {
            paper_id: physicsPaper.id,
            question_text: 'Two point charges Q and 4Q are separated by a distance d. At what distance from Q is the electric field zero?',
            options: [
                { id: '1', text: 'd / 2' },
                { id: '2', text: 'd / 3' },
                { id: '3', text: 'd / 4' },
                { id: '4', text: '2d / 3' },
                { id: '5', text: 'd / 5' }
            ],
            correct_option_id: '2',
            explanation: 'E1 = E2 => kQ/x^2 = k(4Q)/(d-x)^2 => (d-x)/x = 2 => d-x = 2x => d = 3x => x = d/3',
            difficulty: 'hard' as const,
            topic_tag: 'Electrostatics',
            order_index: 5,
        }
    ];

    await db.insert(schema.questions).values(physicsQuestions).onConflictDoNothing();
    console.log(`✅ Physics questions populated.`);

    // 4. Insert Purchases for one user
    if (insertedUsers.length > 0) {
        await db.insert(schema.purchases).values([
            {
                user_id: insertedUsers[0].id,
                paper_id: physicsPaper.id,
                amount_paid_lkr: physicsPaper.price_lkr,
                payment_method: 'Card',
            }
        ]).onConflictDoNothing();
        console.log(`✅ Purchases populated for ${insertedUsers[0].full_name}.`);
    }

    console.log('🎉 Seeding complete with Sri Lankan context!');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});