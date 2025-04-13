import fs from "fs";
import path from "path";
import { log } from "./logger";
import dotenv from "dotenv";

const envContent = `# .env file for storing the uploader information
ROBLOSECURITY_COOKIE=your-roblox-cookie`;

const resourcesDir = path.join(process.cwd(), "resources");
const envFilePath = path.join(resourcesDir, ".env");
const logsFilePath = path.join(resourcesDir, "logs.txt");

/**
 * Ensures the resources directory exists.
 * Creates the directory if it doesn't exist.
 */
export async function ensureResourcesDirectory(): Promise<void> {
    try {
        if (!fs.existsSync(resourcesDir)) {
            await fs.promises.mkdir(resourcesDir, { recursive: true });
            log.debug(`Resources directory created at ${resourcesDir}`);
        }
    } catch (error: any) {
        log.error(`Failed to create resources directory: ${error}`);
        process.exit(1);
    }
}

/**
 * Generates or overwrites a logs.txt file.
 */
export async function generateLogsFile(): Promise<void> {
    try {
        await ensureResourcesDirectory();
        await fs.promises.writeFile(logsFilePath, "", "utf-8");
        log.debug(`Logs file created at ${logsFilePath}`);
    } catch (error: any) {
        log.error(`Failed to create logs file: ${error}`);
        process.exit(1);
    }
}

/**
 * Appends a log message to the logs.txt file.
 * @param {string} message - The log message to append.
 */
export async function appendToLogFile(message: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logsFilePath, `[${timestamp}] ${message}\n`, "utf-8");
}

/**
 * Generates a .env file if it doesn't exist.
 */
export async function generateEnvFile(): Promise<void> {
    try {
        await ensureResourcesDirectory();

        if (!fs.existsSync(envFilePath)) {
            await fs.promises.writeFile(envFilePath, envContent, "utf-8");
            log.debug(`.env file created at ${envFilePath}`);
        }
    } catch (error: any) {
        log.error(`Failed to create .env file: ${error}`);
        process.exit(1);
    }
}

/**
 * Dynamically reads a value from the .env file (without using process.env cache).
 * @param {string} key - The environment variable name to retrieve.
 * @returns {Promise<string | undefined>} - The value, or undefined if not found.
 */
export async function getEnvValue(key: string): Promise<string | undefined> {
    if (!fs.existsSync(envFilePath)) return undefined;

    const envContent = fs.readFileSync(envFilePath, "utf-8");
    const parsed = dotenv.parse(envContent);

    return parsed[key];
}

/**
 * Updates or creates a key in the .env file.
 * @param {string} key - The name of the environment variable (e.g., "API_KEY").
 * @param {string} value - The value to set (e.g., "1234").
 */
export function updateEnvFile(key: string, value: string): void {
    let lines: string[] = [];

    if (fs.existsSync(envFilePath)) {
        const content = fs.readFileSync(envFilePath, "utf-8");
        lines = content.split(/\r?\n/);
    }

    let keyFound = false;
    const updatedLines = lines.map((line) => {
        const trimmed = line.trim();

        if (trimmed === "" || trimmed.startsWith("#")) return line;

        const [k, ...rest] = trimmed.split("=");
        if (k === key) {
            keyFound = true;
            return `${key}=${value}`;
        }

        return line;
    });

    if (!keyFound) {
        updatedLines.push(`${key}=${value}`);
    }

    fs.writeFileSync(envFilePath, updatedLines.join("\n"), "utf-8");
}
