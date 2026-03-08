import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index';

// Mock postgres and drizzle
vi.mock('postgres', () => {
    return {
        default: vi.fn(() => ({
            // mock the client if needed
        }))
    };
});

vi.mock('drizzle-orm/postgres-js', () => {
    return {
        drizzle: vi.fn(() => ({
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        limit: vi.fn(() => [])
                    }))
                }))
            })),
            insert: vi.fn(() => ({
                values: vi.fn(() => Promise.resolve())
            }))
        }))
    };
});

describe('Auth Service integration tests', () => {
    it('GET / should return "Auth Service is running!"', async () => {
        const res = await app.request('/');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('Auth Service is running!');
    });

    it('POST /auth/register should return 400 for invalid email', async () => {
        const res = await app.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'invalid-email',
                password: 'password123',
                full_name: 'Test User'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        expect(res.status).toBe(400);
        const data = await res.json() as { error: string };
        expect(data.error).toBe('Invalid email');
    });
});
