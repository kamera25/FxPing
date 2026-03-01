// @ts-nocheck
import { test } from 'vitest';
import { execSync } from 'child_process';

test('TypeScript Type Check', () => {
    try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
    } catch (error: any) {
        throw new Error(`TypeScript errors found:\n${error.stdout?.toString()}`);
    }
}, 30000); // Increase timeout for tsc
