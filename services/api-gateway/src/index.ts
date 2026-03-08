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
app.use('/papers/*', (c, next) => {
    return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next);
});

app.use('/exams/*', (c, next) => {
    return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next);
});

// --- 3. Protected Forwarding Logic ---

// Forward to Papers Service
app.all('/papers/*', async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${c.env.PAPERS_SVC_URL}${url.pathname}${url.search}`;

    const payload = c.get('jwtPayload');
    const newRequest = new Request(c.req.raw);

    if (payload && payload.id) {
        newRequest.headers.set('X-User-Id', payload.id.toString());
    }

    return fetch(targetUrl, newRequest);
});

// Forward to Exam Service
app.all('/exams/*', async (c) => {
    const url = new URL(c.req.url);
    const targetUrl = `${c.env.EXAM_SVC_URL}${url.pathname}${url.search}`;

    // Requirement: Pass the user ID from the JWT to the internal service
    const payload = c.get('jwtPayload');
    const newRequest = new Request(c.req.raw);

    if (payload && payload.id) {
        newRequest.headers.set('X-User-Id', payload.id.toString());
    }

    return fetch(targetUrl, newRequest);
});

export default app;