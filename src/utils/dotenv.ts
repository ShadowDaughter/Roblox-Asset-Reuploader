import fs from "fs";
import path from "path";

const envContent = `# .env file for storing the uploader information
ROBLOSECURITY_COOKIE=your-roblox-cookie
API_KEY=your-roblox-api-key`;

/**
 * Generates a .env file if it doesn't exist.
 */
export const generateEnvFile = (): void => {
    const envPath = path.resolve(__dirname, "../../.env");

    if (!fs.existsSync(envPath)) {
        try {
            fs.writeFileSync(envPath, envContent);
        } catch (error) {
            console.error("❌ Error creating .env file:", error);
            process.exit();
        }
    }
};
