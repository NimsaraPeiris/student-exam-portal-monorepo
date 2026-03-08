import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import { setCookie } from 'hono/cookie';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { users } from '@assessment/db/src/schema';
import { Env } from './types/env';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

const app = new Hono<{ Bindings: Env }>();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(2),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// Add this before your other routes
app.get('/', (c) => c.text('Auth Service is running!'));

// --- Register Endpoint ---
app.post('/auth/register', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password, full_name } = registerSchema.parse(body);
        console.log(`Attempting to register user: ${email}`);

        const client = neon(c.env.DATABASE_URL);
        const db = drizzle(client);

        console.log('Checking for existing user...');
        // 1. Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        console.log('Existing user check completed.');

        if (existingUser.length > 0) {
            return c.json({ error: 'User already exists' }, 409);
        }

        console.log('Hashing password...');
        // 2. Hash password (using 10 rounds for speed in development if needed, 12 is hefty for JS)
        const password_hash = await bcrypt.hash(password, 10);
        console.log('Password hashed.');

        console.log('Inserting user into database...');
        // 3. Create user
        await db.insert(users).values({
            email,
            password_hash,
            full_name,
        });
        console.log('User inserted.');

        return c.json({ message: 'User registered successfully' }, 201);

    } catch (error: any) {
        console.error('Registration error:', error);
        if (error instanceof z.ZodError) return c.json({ error: error.issues[0].message }, 400);
        return c.json({ error: 'Internal Server Error', details: error.message }, 500);
    }
});


// --- Login Endpoint ---
app.post('/auth/login', async (c) => {
    try {
        const body = await c.req.json();
        const { email, password } = loginSchema.parse(body);

        const client = neon(c.env.DATABASE_URL);
        const db = drizzle(client);

        // 1. Find user
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (user.length === 0) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // 2. Verify Password
        const isValid = await bcrypt.compare(password, user[0].password_hash);
        if (!isValid) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // 3. Generate Access Token (Short-lived, e.g., 15 mins)
        const accessToken = await sign(
            { id: user[0].id, email: user[0].email, exp: Math.floor(Date.now() / 1000) + 60 * 15 },
            c.env.JWT_SECRET,
            'HS256'
        );

        // 4. Generate Refresh Token (Long-lived, e.g., 7 days)
        const refreshToken = await sign(
            { id: user[0].id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
            c.env.JWT_SECRET,
            'HS256'
        );

        // 5. Set httpOnly Refresh Cookie (Required by assessment)
        setCookie(c, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: true, // Cloudflare enforces HTTPS
            sameSite: 'Strict',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return c.json({
            message: 'Login successful',
            access_token: accessToken,
            user: { id: user[0].id, email: user[0].email, full_name: user[0].full_name }
        });

    } catch (error) {
        if (error instanceof z.ZodError) return c.json({ error: error.issues[0].message }, 400);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});

//auth verify in 15 minutes
app.post('/auth/refresh', async (c) => {
    try {
        // 1. Get the refresh token from the httpOnly cookie
        const refreshToken = getCookie(c, 'refresh_token');

        if (!refreshToken) {
            return c.json({ error: 'Refresh token missing' }, 401);
        }

        // 2. Verify the token
        const payload = await verify(refreshToken, c.env.JWT_SECRET, 'HS256');

        if (!payload || !payload.id) {
            return c.json({ error: 'Invalid refresh token' }, 401);
        }

        const client = neon(c.env.DATABASE_URL);
        const db = drizzle(client);

        // Fetch user data
        const user = await db.select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
        })
            .from(users)
            .where(eq(users.id, payload.id as string))
            .limit(1);

        if (user.length === 0) {
            return c.json({ error: 'User not found' }, 401);
        }

        // 3. Issue a new short-lived Access Token
        const newAccessToken = await sign(
            {
                id: user[0].id,
                email: user[0].email,
                exp: Math.floor(Date.now() / 1000) + 60 * 15 // 15 minutes
            },
            c.env.JWT_SECRET,
            'HS256'
        );

        return c.json({
            access_token: newAccessToken,
            user: user[0]
        });

    } catch (error) {
        return c.json({ error: 'Token expired or invalid' }, 401);
    }
});

// --- Logout Endpoint ---
app.post('/auth/logout', async (c) => {
    setCookie(c, 'refresh_token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 0, // Expire immediately
    });
    return c.json({ message: 'Logged out successfully' });
});

// --- Get Current User ---
app.get('/auth/me', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const token = authHeader.split(' ')[1];
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256');

        if (!payload || !payload.id) {
            return c.json({ error: 'Invalid token' }, 401);
        }

        const client = neon(c.env.DATABASE_URL);
        const db = drizzle(client);

        const user = await db.select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
        })
            .from(users)
            .where(eq(users.id, payload.id as string))
            .limit(1);

        if (user.length === 0) {
            return c.json({ error: 'User not found' }, 401);
        }

        return c.json({ user: user[0] });

    } catch (error) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
});

export default app;