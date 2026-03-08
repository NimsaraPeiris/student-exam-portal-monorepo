import { defineProject } from 'vitest/config';

export default [
    'apps/*/vitest.config.{ts,js}',
    'services/*/vitest.config.{ts,js}',
    'packages/*/vitest.config.{ts,js}',
    defineProject({
        test: {
            name: 'root',
            include: ['**/*.test.{ts,js}'],
            environment: 'node',
        },
    }),
];
