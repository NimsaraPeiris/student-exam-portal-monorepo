const { neon } = require('@neondatabase/serverless');
const { config } = require('dotenv');
const path = require('path');

config({ path: path.join(__dirname, '../../../.env') });

async function main() {
    const sql = neon(process.env.DATABASE_URL);

    console.log('Fetching papers and question counts...');

    // Find papers with no questions
    const papersWithNoQuestions = await sql`
        SELECT p.id, p.title 
        FROM papers p 
        LEFT JOIN questions q ON p.id = q.paper_id 
        WHERE q.id IS NULL
    `;

    if (papersWithNoQuestions.length === 0) {
        console.log('No papers without questions found.');
        return;
    }

    console.log(`Found ${papersWithNoQuestions.length} papers without questions:`);
    papersWithNoQuestions.forEach(p => console.log(`- ${p.title} (${p.id})`));

    const idsToDelete = papersWithNoQuestions.map(p => p.id);

    console.log('Deleting papers...');
    // Delete papers. Purchases, exam_sessions etc. have FKs, so we should be careful.
    // In schema.ts: 
    // purchases: user_id references users.id, paper_id references papers.id (no cascade)
    // exam_sessions: user_id references users.id, paper_id references papers.id (no cascade)
    // questions: paper_id references papers.id (onDelete: 'cascade')

    // Since these papers HAVE NO questions, we only need to worry about purchases and exam_sessions.
    // But if they have no questions, they likely have no purchases/sessions either.

    for (const id of idsToDelete) {
        try {
            await sql`DELETE FROM exam_sessions WHERE paper_id = ${id}`;
            await sql`DELETE FROM purchases WHERE paper_id = ${id}`;
            await sql`DELETE FROM papers WHERE id = ${id}`;
            console.log(`Deleted paper: ${id}`);
        } catch (err) {
            console.error(`Failed to delete paper ${id}:`, err.message);
        }
    }

    console.log('Cleanup complete.');
}

main().catch(console.error);
