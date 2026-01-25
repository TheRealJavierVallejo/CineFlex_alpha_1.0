/**
 * Debounce utility function
 * Delays execution of a function until after a specified wait time has elapsed
 * since the last time it was invoked.
 * 
 * Now supports .cancel() and .flush() methods (Lodash-style API).
 * 
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait before executing
 * @returns Debounced function with .cancel() and .flush() methods
 */

interface DebouncedFunc<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel: () => void;
    flush: () => void;
}

export function debounce<T extends (...args: any[]) => any>(
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
 * Throttle utility function  
 * Ensures a function is only called once per specified time period
 * 
 * @param func - Function to throttle
 * @param limit - Minimum milliseconds between calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
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
