import fs from "fs";
import { log } from "./logger";

const envContent = `# .env file for storing the uploader information
ROBLOSECURITY_COOKIE=your-roblox-cookie
API_KEY=your-roblox-api-key`;

/**
 * Generates a .env file if it doesn't exist.
 * @param {string} envPath The file path for the .env file.
 */
export const generateEnvFile = (envPath: string): void => {
    try {
        fs.writeFileSync(envPath, envContent);
    } catch (error: any) {
        log.error(`Failed to create .env file: ${error.message}`);
        process.exit();
    }
};
