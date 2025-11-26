import { describe, it, expect } from 'vitest';
import { debounce, throttle } from './debounce';

describe('Debounce Utility', () => {
    it('should delay function execution', async () => {
        let callCount = 0;
        const debouncedFn = debounce(() => {
            callCount++;
        }, 100);

        // Call multiple times rapidly
        debouncedFn();
        debouncedFn();
        debouncedFn();

        // Should not have been called yet
        expect(callCount).toBe(0);

        // Wait for debounce delay
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should have been called only once
        expect(callCount).toBe(1);
    });

    it('should pass arguments correctly', async () => {
        let receivedArgs: any[] = [];
        const debouncedFn = debounce((...args: any[]) => {
            receivedArgs = args;
        }, 100);

        debouncedFn('arg1', 'arg2', 123);

        await new Promise(resolve => setTimeout(resolve, 150));

        expect(receivedArgs).toEqual(['arg1', 'arg2', 123]);
    });
});

describe('Throttle Utility', () => {
    it('should limit function calls', async () => {
        let callCount = 0;
        const throttledFn = throttle(() => {
            callCount++;
        }, 100);

        // Call multiple times
        throttledFn();
        throttledFn();
        throttledFn();

        // Should have been called immediately once
        expect(callCount).toBe(1);

        // Wait for throttle period
        await new Promise(resolve => setTimeout(resolve, 150));

        // Call again
        throttledFn();

        // Should have been called one more time
        expect(callCount).toBe(2);
    });
});
