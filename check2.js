const { neon } = require('@neondatabase/serverless');

async function check() {
    const sql = neon("postgresql://neondb_owner:npg_eazT5X9WLjRv@ep-steep-poetry-add97482-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
    const questions = await sql`SELECT * FROM questions`;
    console.log("Total questions in DB:", questions.length);

    const papers = await sql`SELECT * FROM papers`;
    console.log("Total papers in DB:", papers.length);

    const sessions = await sql`SELECT * FROM exam_sessions ORDER BY started_at DESC LIMIT 1`;
    console.log("Latest session:", sessions[0]);

    if (sessions.length > 0) {
        const sessionQs = await sql`SELECT * FROM questions WHERE paper_id = ${sessions[0].paper_id}`;
        console.log(`Questions for session paper (${sessions[0].paper_id}):`, sessionQs.length);
    }
}
check().catch(console.error);
