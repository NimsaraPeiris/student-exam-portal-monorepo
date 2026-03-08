import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index';

// Mock neon and drizzle
vi.mock('@neondatabase/serverless', () => ({
    neon: vi.fn(() => ({
        // some client mock
    }))
}));

const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn().mockReturnThis(),
};

vi.mock('drizzle-orm/neon-http', () => ({
    drizzle: vi.fn(() => mockDb)
}));

describe('Exam Service integration tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POST /exams/start should start a new session', async () => {
        mockDb.returning.mockResolvedValueOnce([{ id: 'session-123' }]);

        const res = await app.request('/exams/start', {
            method: 'POST',
            body: JSON.stringify({ paper_id: 'paper-1', user_id: 'user-1' }),
            headers: { 'Content-Type': 'application/json' }
        }, { DATABASE_URL: 'postgresql://user:pass@localhost/db' });

        expect(res.status).toBe(201);
        const data = await res.json() as { session_id: string };
        expect(data.session_id).toBe('session-123');
    });

    it('POST /exams/:id/answer should return correctness', async () => {
        // Mock session check
        mockDb.limit.mockResolvedValueOnce([{ id: 'session-1', status: 'in_progress', expires_at: new Date(Date.now() + 10000).toISOString() }]);
        // Mock question check
        mockDb.limit.mockResolvedValueOnce([{ id: 'q-1', correct_option_id: 'opt-1' }]);
        // Mock insert answer
        mockDb.insert.mockReturnThis();

        const res = await app.request('/exams/session-1/answer', {
            method: 'POST',
            body: JSON.stringify({ question_id: 'q-1', selected_option_id: 'opt-1' }),
            headers: { 'Content-Type': 'application/json' }
        }, { DATABASE_URL: 'postgresql://user:pass@localhost/db' });

        expect(res.status).toBe(200);
        const data = await res.json() as { is_correct: boolean };
        expect(data.is_correct).toBe(true);
    });
});
