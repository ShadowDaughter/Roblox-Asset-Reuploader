import { appendToLogFile } from "./filesManager";

/**
 * Logger utility to log messages with different levels (info, warn, error).
 * Logs are written to both the console and a file (logs.txt).
 */
export const log = {
    info: (message: string) => {
        console.log(`\x1b[32m[INFO]\x1b[0m ${message}`);
        appendToLogFile(`[INFO] ${message}`);
    },
    debug: (message: string) => {
        console.debug(`\x1b[34m[DEBUG]\x1b[0m ${message}`);
        appendToLogFile(`[DEBUG] ${message}`);
    },
    warn: (message: string) => {
        console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`);
        appendToLogFile(`[WARN] ${message}`);
    },
    error: (message: string) => {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
        appendToLogFile(`[ERROR] ${message}`);
    },
};

/**
 * Sleep function to wait for a specific time (ms).
 * @param {number} ms - The time to sleep in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
