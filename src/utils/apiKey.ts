import readline from "readline";
import * as fs from "fs";
import dotenv from "dotenv";
import { validateApiKey } from "../services/robloxApi";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

dotenv.config();

/**
 * Reads the key from the .env file.
 * @returns {string | undefined} The API_KEY if found, otherwise undefined.
 */
const getKeyFromEnv = (): string | undefined => {
    return process.env.ROBLOSECURITY_COOKIE;
};

/**
 * Prompts the user for the Roblox key if it's not already in the .env file.
 * @returns {Promise<string>} The API_KEY entered by the user.
 */
export const getApiKeyFromUserInput = async (): Promise<string> => {
    let apiKey = getKeyFromEnv();

    if (apiKey && (await validateApiKey(apiKey))) {
        return apiKey;
    }

    let validKey = false;
    while (!validKey) {
        apiKey = await new Promise<string>((resolve) => {
            rl.question("Please enter your Roblox API_KEY: ", (inputCookie) => {
                resolve(inputCookie);
            });
        });

        validKey = await validateApiKey(apiKey);

        if (!validKey) {
            console.clear();
            console.log("That key is invalid. Please try again.");
        }
    }

    console.clear();
    rl.close();

    updateEnvFile(apiKey!);
    return apiKey!;
};

/**
 * Updates the .env file with the provided key.
 * @param {string} cookie The valid API_KEY to be saved in the .env file.
 */
export const updateEnvFile = (cookie: string): void => {
    let envContent = fs.readFileSync(".env", "utf-8");

    if (envContent.includes("API_KEY")) {
        envContent = envContent.replace(/API_KEY=.*/, `API_KEY=${cookie}`);
    } else {
        envContent += `\API_KEY=${cookie}\n`;
    }

    fs.writeFileSync(".env", envContent, "utf-8");
};
