import express from "express";
import dotenv from "dotenv";
import { generateEnvFile } from "./utils/dotenv";
import { getEnvInput } from "./utils/inputManager";
import { log } from "./utils/logger";
import router from "./routes/router";
import { envPath } from "./utils/dotenv";
import fs from "fs";
import { validateApiKey, validateCookie } from "./services/robloxApi";

/**
 * Sleep function to wait for a specific time (ms).
 * @param {number} ms - The time to sleep in milliseconds.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ensures the .env file is generated, and waits until it exists before moving forward.
 */
const ensureEnvFileCreated = async () => {
    if (!fs.existsSync(envPath)) {
        generateEnvFile();

        while (!fs.existsSync(envPath)) {
            log.info("Waiting for .env file to be created...");
            await sleep(100);
        }
    }

    dotenv.config({ path: envPath });
    return true;
};

const start = async () => {
    await ensureEnvFileCreated();

    const app = express();
    const PORT = 5544;

    const cookie = await getEnvInput("ROBLOSECURITY_COOKIE", validateCookie, true);
    const apiKey = await getEnvInput("API_KEY", (key) => validateApiKey(key, cookie), true);
    //const cookie = await getCookieFromUserInput();
    //await getApiKeyFromUserInput(cookie);

    app.use(express.json());
    app.use("/api", router);

    app.listen(PORT, () => {
        log.info(`Listening on http://localhost:${PORT}`);
    });
};

start();
