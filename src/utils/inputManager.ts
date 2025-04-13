import { getEnvValue, updateEnvFile } from "./filesManager";
import { log } from "./logger";

/**
 * Clears the specified number of lines in the console output.
 * @param lines The number of lines to clear.
 */
function clearLines(lines: number) {
    for (let i = 0; i < lines; i++) {
        process.stdout.write("\x1B[1A");
        process.stdout.write("\x1B[2K");
    }
}

/**
 * Prompts the user for input with optional masking and prompt line clearing.
 * @param question The prompt text to display.
 * @param mask Whether to mask the user input (like passwords or tokens).
 * @returns The trimmed user input.
 */
export function prompt(question: string, mask: boolean = false): Promise<string> {
    return new Promise((resolve) => {
        process.stdout.write(question);
        const input: string[] = [];

        const wasRaw = process.stdin.isRaw;
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        let currentLineCount = 1;
        const onData = (char: string) => {
            if (char === "\r" || char === "\n") {
                process.stdin.setRawMode(wasRaw ?? false);
                process.stdin.pause();
                process.stdin.removeListener("data", onData);
                process.stdout.write("\n");
                clearLines(currentLineCount);
                resolve(input.join("").trim());
                return;
            }

            if (char === "\u0003") {
                process.exit();
            }

            if (char === "\u007F") {
                if (input.length > 0) {
                    input.pop();

                    const currentInput = input.join("");
                    const maskedInput = mask ? "*".repeat(currentInput.length) : currentInput;
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(question + maskedInput);

                    const totalLength = question.length + maskedInput.length;
                    currentLineCount = Math.ceil(totalLength / process.stdout.columns);
                }
            } else {
                input.push(char);

                const maskedChar = mask ? "*" : char;
                process.stdout.write(maskedChar);

                const totalLength = question.length + input.length;
                const newLineCount = Math.ceil(totalLength / process.stdout.columns);

                if (newLineCount > currentLineCount) {
                    currentLineCount = newLineCount;
                }
            }
        };

        process.stdin.on("data", onData);
    });
}

/**
 * Dynamically prompts the user for an env value, validates, saves, and returns it.
 * @param {string} key - The .env key to fetch or prompt for.
 * @param {() => Promise<string | undefined>} retrieveFn - Function to retrieve the value if not found in .env.
 * @param {(value: string) => Promise<boolean>} validateFn - Validation logic.
 * @param {boolean} maskInput - Whether to hide user input (e.g. for secrets).
 * @returns {Promise<string>} - The validated value.
 */
export async function getEnvInput(
    key: string,
    retrieveFn: () => Promise<string | undefined>,
    validateFn: (value: string) => Promise<boolean>,
    maskInput: boolean = false
): Promise<string> {
    let value = (await getEnvValue(key)) || (await retrieveFn());

    if (value && (await validateFn(value))) {
        return value;
    }

    let valid = false;
    while (!valid) {
        value = await prompt(`Please enter your ${key}: `, maskInput);
        valid = await validateFn(value);

        if (!valid) {
            log.error(`${key} is invalid. Please try again.`);
        }
    }

    log.info(`${key} validated successfully.`);
    updateEnvFile(key, value!);

    return value!;
}
