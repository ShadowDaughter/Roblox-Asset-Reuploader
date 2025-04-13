/**
 * Processes a list of asynchronous tasks with a concurrency limit.
 * @param {(() => Promise<T>)[]} tasks - An array of tasks to execute.
 * @param {number} limit - The maximum number of tasks to run concurrently.
 * @returns {Promise<T[]>} - A promise that resolves with the results of all tasks.
 */
export async function processWithConcurrencyLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<any>[] = [];

    for (const task of tasks) {
        const promise = task()
            .then((result) => results.push(result))
            .finally(() => {
                const index = executing.indexOf(promise);
                if (index > -1) {
                    executing.splice(index, 1);
                }
            });

        executing.push(promise);

        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
    return results;
}
