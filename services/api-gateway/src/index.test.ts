import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index';
import { sign } from 'hono/jwt';

// Mock global fetch
const mockFetch = vi.fn(() =>
    Promise.resolve({
        status: 200,
        text: () => Promise.resolve('Success'),
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
    } as any)
);
global.fetch = mockFetch as any;

describe('API Gateway integration tests', () => {
    const JWT_SECRET = 'test-secret';
    const env = {
        JWT_SECRET,
        AUTH_SVC_URL: 'http://auth-svc',
        PAPERS_SVC_URL: 'http://papers-svc',
        EXAM_SVC_URL: 'http://exam-svc',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should forward /auth/* requests without JWT', async () => {
        const res = await app.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@test.com' }),
            headers: { 'Content-Type': 'application/json' }
        }, env);

        expect(res.status).toBe(200);
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('http://auth-svc/auth/login'),
            expect.any(Object)
        );
    });

    it('should block /papers/* requests without JWT', async () => {
        const res = await app.request('/papers/1', {}, env);
        expect(res.status).toBe(401);
    });

    it('should forward /papers/* with valid JWT and inject X-User-Id header', async () => {
        const token = await sign({ id: 'user-123', exp: Math.floor(Date.now() / 1000) + 60 }, JWT_SECRET);

        const res = await app.request('/papers/1', {
            headers: { 'Authorization': `Bearer ${token}` }
        }, env);

        expect(res.status).toBe(200);

        // Check if fetch was called with X-User-Id header
        const fetchCall = mockFetch.mock.calls[0] as any;
        const passedRequest = fetchCall[1] as unknown as Request;
        expect(passedRequest.headers.get('X-User-Id')).toBe('user-123');
    });
});
