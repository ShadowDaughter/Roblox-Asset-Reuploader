import fs from "fs";
import path from "path";
import { log } from "./logger";
import dotenv from "dotenv";

const envContent = `# .env file for storing the uploader information
ROBLOSECURITY_COOKIE=your-roblox-cookie
API_KEY=your-roblox-api-key`;

export const envPath = path.join(process.cwd(), ".env");

/**
 * Generates a .env file if it doesn't exist.
 * @param {string} envPath The file path for the .env file.
 */
export const generateEnvFile = () => {
    try {
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, envContent);
            log.info(`.env file successfully created at ${envPath}.`);
        }
    } catch (error: any) {
        log.error(`Failed to create .env file: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Dynamically reads a value from the .env file (without using process.env cache).
 * @param {string} key - The environment variable name to retrieve.
 * @returns {Promise<string | undefined>} - The value, or undefined if not found.
 */
export const getEnvValue = async (key: string): Promise<string | undefined> => {
    const envPath = path.join(process.cwd(), ".env");

    if (!fs.existsSync(envPath)) return undefined;

    const envContent = fs.readFileSync(envPath, "utf-8");
    const parsed = dotenv.parse(envContent);

    return parsed[key];
};

/**
 * Updates or creates a key in the .env file.
 * @param {string} key - The name of the environment variable (e.g., "API_KEY").
 * @param {string} value - The value to set (e.g., "1234").
 */
export const updateEnvFile = (key: string, value: string): void => {
    let lines: string[] = [];

    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
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

    fs.writeFileSync(envPath, updatedLines.join("\n"), "utf-8");
};
