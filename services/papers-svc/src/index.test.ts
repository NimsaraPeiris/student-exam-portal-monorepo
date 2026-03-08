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
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve([]), // simple thenable mock
};

vi.mock('drizzle-orm/neon-http', () => ({
    drizzle: vi.fn(() => mockDb)
}));

describe('Papers Service integration tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GET /papers/:id/questions should return only 3 questions for unpurchased papers', async () => {
        // Mock purchase check (not purchased)
        mockDb.select.mockReturnValueOnce({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve([])
                })
            })
        });

        // Mock questions fetch (return 10 questions)
        const manyQuestions = Array.from({ length: 10 }, (_, i) => ({
            id: i.toString(),
            order: i,
            text: `Question ${i}`,
            options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
            difficulty: 'Easy',
            topic: 'General'
        }));
        mockDb.select.mockReturnValueOnce({
            from: () => ({
                where: () => ({
                    orderBy: () => Promise.resolve(manyQuestions)
                })
            })
        });

        const res = await app.request('/papers/paper-1/questions', {
            headers: { 'X-User-Id': 'user-1' }
        }, { DATABASE_URL: 'postgresql://user:pass@localhost/db' });

        expect(res.status).toBe(200);
        const data = await res.json() as { questions: any[], is_preview: boolean };
        expect(data.questions).toHaveLength(3);
        expect(data.is_preview).toBe(true);
    });

    it('GET /papers/:id/questions should return all questions for purchased papers', async () => {
        // Mock purchase check (is purchased)
        mockDb.select.mockReturnValueOnce({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve([{ id: 'purchase-1' }])
                })
            })
        });

        // Mock questions fetch (return 10 questions)
        const manyQuestions = Array.from({ length: 10 }, (_, i) => ({
            id: i.toString(),
            order: i,
            text: `Question ${i}`,
            options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
            difficulty: 'Easy',
            topic: 'General'
        }));
        mockDb.select.mockReturnValueOnce({
            from: () => ({
                where: () => ({
                    orderBy: () => Promise.resolve(manyQuestions)
                })
            })
        });

        const res = await app.request('/papers/paper-1/questions', {
            headers: { 'X-User-Id': 'user-1' }
        }, { DATABASE_URL: 'postgresql://user:pass@localhost/db' });

        expect(res.status).toBe(200);
        const data = await res.json() as { questions: any[], is_preview: boolean };
        expect(data.questions).toHaveLength(10);
        expect(data.is_preview).toBe(false);
    });
});
