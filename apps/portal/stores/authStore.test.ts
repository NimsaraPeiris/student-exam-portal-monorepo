import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
    beforeEach(() => {
        useAuthStore.getState().clearAuth();
    });

    it('should initialize with default state', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('should set auth state', () => {
        const user = { id: '1', email: 'test@example.com', full_name: 'Test User' };
        const token = 'fake-token';

        useAuthStore.getState().setAuth(user, token);

        const state = useAuthStore.getState();
        expect(state.user).toEqual(user);
        expect(state.accessToken).toBe(token);
        expect(state.isAuthenticated).toBe(true);
    });

    it('should clear auth state', () => {
        const user = { id: '1', email: 'test@example.com', full_name: 'Test User' };
        const token = 'fake-token';

        useAuthStore.getState().setAuth(user, token);
        useAuthStore.getState().clearAuth();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });
});
