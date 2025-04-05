import * as fs from "fs";
import dotenv from "dotenv";
import { validateCookie } from "../services/robloxApi";
import { log } from "./logger";

// Load environment variables
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
 * Reads the cookie from the .env file.
 * @returns {Promise<string>} The .ROBLOSECURITY cookie.
 * @throws {Error} If the .ROBLOSECURITY_COOKIE environment variable is not set.
 */
export const getCookieFromEnv = async (): Promise<string | undefined> => {
    const cookie = process.env.ROBLOSECURITY_COOKIE;
    return cookie;
};

/**
 * Prompts the user for the Roblox cookie if it's not already in the .env file.
 * @returns {Promise<string>} The .ROBLOSECURITY cookie entered by the user.
 */
export const getCookieFromUserInput = async (): Promise<string> => {
    let cookie = await getCookieFromEnv();
    if (!cookie || !(await validateCookie(cookie))) {
        console.clear();

        let validCookie = false;
        while (!validCookie) {
            cookie = await prompt("Please enter your .ROBLOSECURITY cookie to proceed: ");
            validCookie = await validateCookie(cookie);

            if (!validCookie) {
                console.clear();
                log.error("That cookie is invalid. Please try again.");
            }
        }

        console.clear();
        log.info("Cookie validated successfully.");
        updateEnvFile(cookie!);
    }

    return cookie!;
};

/**
 * Updates or creates the .env file with the provided cookie.
 * @param {string} cookie The valid .ROBLOSECURITY cookie to be saved in the .env file.
 */
export const updateEnvFile = (cookie: string): void => {
    let envContent = "";

    if (fs.existsSync(".env")) {
        envContent = fs.readFileSync(".env", "utf-8");
    }

    if (envContent.includes("ROBLOSECURITY_COOKIE")) {
        envContent = envContent.replace(/ROBLOSECURITY_COOKIE=.*/, `ROBLOSECURITY_COOKIE=${cookie}`);
    } else {
        envContent += `\nROBLOSECURITY_COOKIE=${cookie}\n`;
    }

    fs.writeFileSync(".env", envContent.trim(), "utf-8");
};
