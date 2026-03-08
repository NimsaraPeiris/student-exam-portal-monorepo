import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

// Define the environment variables (Bindings)
type Bindings = {
    JWT_SECRET: string;
    AUTH_SVC_URL: string;
    PAPERS_SVC_URL: string;
    EXAM_SVC_URL: string;
};

type Variables = {
    jwtPayload: any;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({
    origin: (origin) => {
        const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'];
        if (allowedOrigins.includes(origin)) return origin;
        return 'http://localhost:3000'; // Default
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
}));

// Forward all /auth/* requests to the Auth Service
app.all('/auth/*', async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${c.env.AUTH_SVC_URL}${url.pathname}${url.search}`;

    return fetch(targetUrl, {
        method: c.req.method,
        headers: c.req.header(),
        body: c.req.method !== 'GET' ? await c.req.arrayBuffer() : undefined,
    });
});

// --- 2. Authentication Middleware ---
// Any request starting with /papers or /exams MUST have a valid JWT
app.use('/papers*', (c, next) => {
    return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next);
});

app.use('/exams*', (c, next) => {
    return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next);
});

// --- 3. Protected Forwarding Logic ---

// Forward to Papers Service
app.all('/papers*', async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${c.env.PAPERS_SVC_URL}${url.pathname}${url.search}`;

    console.log(`[Gateway] Routing Papers request to: ${targetUrl}`);
    const payload = c.get('jwtPayload');

    // We need to create a new Request to modify headers, or just pass headers
    const headers = new Headers(c.req.header());
    if (payload && payload.id) {
        headers.set('X-User-Id', payload.id.toString());
        console.log(`[Gateway] Authenticated User ID: ${payload.id}`);
    } else {
        console.log(`[Gateway] Anonymous request (Public)`);
    }

    try {
        const response = await fetch(targetUrl, {
            method: c.req.method,
            headers: headers,
            body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.arrayBuffer() : undefined,
        });
        console.log(`[Gateway] Service response status: ${response.status}`);
        return response;
    } catch (e: any) {
        console.error(`[Gateway] Fetch Error:`, e.message);
        return c.json({ error: 'Upstream service unavailable' }, 502);
    }
});

// Forward to Exam Service
app.all('/exams*', async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${c.env.EXAM_SVC_URL}${url.pathname}${url.search}`;

    // Requirement: Pass the user ID from the JWT to the internal service
    const payload = c.get('jwtPayload');

    const headers = new Headers(c.req.header());
    if (payload && payload.id) {
        headers.set('X-User-Id', payload.id.toString());
    }

    return fetch(targetUrl, {
        method: c.req.method,
        headers: headers,
        body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.arrayBuffer() : undefined,
    });
});

export default app;