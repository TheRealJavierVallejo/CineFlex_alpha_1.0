/**
 * 🛠️ UTILITY: DEBOUNCE & THROTTLE
 * Professional implementation of execution decorators to improve UI performance
 * and reduce redundant service calls.
 */

/**
 * Functional interface for a debounced function.
 * Includes methods to control the execution lifecycle.
 */
interface DebouncedFunc<T extends (...args: unknown[]) => void> {
    /** Executes the function with debouncing logic */
    (...args: Parameters<T>): void;
    /** Cancels any pending execution */
    cancel: () => void;
    /** Immediately executes any pending call and cancels the timer */
    flush: () => void;
}

/**
 * Creates a debounced version of a function that delays execution until after 
 * 'wait' milliseconds have elapsed since the last time it was invoked.
 * 
 * Useful for handling rapid input events (like search or auto-save).
 * 
 * @param func - The function to debounce.
 * @param wait - Milliseconds to delay.
 * @returns A debounced function with .cancel() and .flush() control methods.
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): DebouncedFunc<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;

    const debouncedFunction = function (...args: Parameters<T>) {
        lastArgs = args;
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            timeout = null;
            lastArgs = null;
            func(...args);
        }, wait);
    } as DebouncedFunc<T>;

    debouncedFunction.cancel = () => {
        if (timeout !== null) {
            clearTimeout(timeout);
            timeout = null;
            lastArgs = null;
        }
    };

    debouncedFunction.flush = () => {
        if (timeout !== null && lastArgs !== null) {
            clearTimeout(timeout);
            timeout = null;
            func(...lastArgs);
            lastArgs = null;
        }
    };

    return debouncedFunction;
}

/**
 * Creates a throttled version of a function that only invokes the provided 
 * function at most once per every 'limit' milliseconds.
 * 
 * Useful for handling scroll or resize events to maintain UI smoothness.
 * 
 * @param func - The function to throttle.
 * @param limit - Minimum milliseconds between calls.
 * @returns A throttled version of the function.
 */
export function throttle<T extends (...args: unknown[]) => void>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
