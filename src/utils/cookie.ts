import readline from "readline";
import * as fs from "fs";
import dotenv from "dotenv";
import { validateCookie } from "../services/robloxApi";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

dotenv.config();

/**
 * Reads the cookie from the .env file.
 * @returns {string | undefined} The .ROBLOSECURITY cookie if found, otherwise undefined.
 */
const getCookieFromEnv = (): string | undefined => {
    return process.env.ROBLOSECURITY_COOKIE;
};

/**
 * Prompts the user for the Roblox cookie if it's not already in the .env file.
 * @returns {Promise<string>} The .ROBLOSECURITY cookie entered by the user.
 */
export const getCookieFromUserInput = async (): Promise<string> => {
    let cookie = getCookieFromEnv();

    if (cookie && (await validateCookie(cookie))) {
        return cookie;
    }

    let validCookie = false;
    while (!validCookie) {
        cookie = await new Promise<string>((resolve) => {
            rl.question("Please enter your .ROBLOSECURITY cookie: ", (inputCookie) => {
                resolve(inputCookie);
            });
        });

        validCookie = await validateCookie(cookie);

        if (!validCookie) {
            console.clear();
            console.log("That cookie is invalid. Please try again.");
        }
    }

    console.clear();
    rl.close();

    updateEnvFile(cookie!);
    return cookie!;
};

/**
 * Updates the .env file with the provided cookie.
 * @param {string} cookie The valid .ROBLOSECURITY cookie to be saved in the .env file.
 */
export const updateEnvFile = (cookie: string): void => {
    let envContent = fs.readFileSync(".env", "utf-8");

    if (envContent.includes("ROBLOSECURITY_COOKIE")) {
        envContent = envContent.replace(/ROBLOSECURITY_COOKIE=.*/, `ROBLOSECURITY_COOKIE=${cookie}`);
    } else {
        envContent += `\nROBLOSECURITY_COOKIE=${cookie}\n`;
    }

    fs.writeFileSync(".env", envContent, "utf-8");
};
