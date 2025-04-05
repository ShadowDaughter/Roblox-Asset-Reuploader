export const log = {
    info: (message: string) => console.log(`\x1b[32m[INFO]\x1b[0m ${message}`),
    error: (message: string) => console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`),
};
