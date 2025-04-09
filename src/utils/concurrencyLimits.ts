export const processWithConcurrencyLimit = async <T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> => {
    const results: T[] = [];
    const executing: Promise<any>[] = [];

    for (const task of tasks) {
        const promise = task().then((result) => results.push(result));
        executing.push(promise);

        if (executing.length >= limit) {
            await Promise.race(executing);
            const index = executing.findIndex((p) => p === promise);
            executing.splice(index, 1);
        }
    }

    await Promise.all(executing);
    return results;
};
