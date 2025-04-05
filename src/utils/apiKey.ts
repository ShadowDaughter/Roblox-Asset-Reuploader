import * as fs from "fs";
import dotenv from "dotenv";
import { validateApiKey } from "../services/robloxApi";
import { log } from "./logger";

dotenv.config();

/**
 * Prompts the user for input in the terminal.
 * @param {string} question The question to display.
 * @returns {Promise<string>} The user's input.
 */
const prompt = (question: string): Promise<string> => {
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer: string) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

/**
 * Reads the API key from the .env file.
 * @returns {Promise<string>} The API Key.
 */
export const getApiKeyFromEnv = async (): Promise<string | undefined> => {
    const apiKey = process.env.API_KEY;
    return apiKey;
};

/**
 * Prompts the user for the Roblox API Key if it's not already in the .env file.
 * @param {string} cookie The valid .ROBLOSECURITY cookie to verify the key.
 * @returns {Promise<string>} The API_KEY entered by the user.
 */
export const getApiKeyFromUserInput = async (cookie: string): Promise<string> => {
    let apiKey = await getApiKeyFromEnv();
    if (!apiKey || !(await validateApiKey(apiKey, cookie))) {
        console.clear();

        let validCookie = false;
        while (!validCookie) {
            apiKey = await prompt("Please enter your API Key to proceed: ");
            validCookie = await validateApiKey(apiKey, cookie);

            if (!validCookie) {
                console.clear();
                log.error("That API Key is invalid. Please try again.");
            }
        }

        console.clear();
        log.info("API Key validated successfully.");
        updateEnvFile(apiKey!);
    }

    return apiKey!;
};

/**
 * Updates or creates the .env file with the provided API key.
 * @param {string} apiKey The valid API_KEY to be saved in the .env file.
 */
export const updateEnvFile = (apiKey: string): void => {
    let envContent = "";

    if (fs.existsSync(".env")) {
        envContent = fs.readFileSync(".env", "utf-8");
    }

    if (envContent.includes("API_KEY")) {
        envContent = envContent.replace(/API_KEY=.*/, `API_KEY=${apiKey}`);
    } else {
        envContent += `\nAPI_KEY=${apiKey}\n`;
    }

    fs.writeFileSync(".env", envContent.trim(), "utf-8");
};
