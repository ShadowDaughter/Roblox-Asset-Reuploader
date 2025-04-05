import express from "express";
import dotenv from "dotenv";
import { generateEnvFile } from "./utils/dotenv";
import { getCookieFromUserInput } from "./utils/cookie";
import { getApiKeyFromUserInput } from "./utils/apiKey";
import { log } from "./utils/logger";
import router from "./routes/router";
import fs from "fs";
import path from "path";

/**
 * Sleep function to wait for a specific time (ms).
 * @param {number} ms - The time to sleep in milliseconds.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ensures the .env file is generated, and waits until it exists before moving forward.
 */
const ensureEnvFileCreated = async () => {
    const envPath = path.resolve(__dirname, "../.env");

    if (!fs.existsSync(envPath)) {
        generateEnvFile(envPath);

        while (!fs.existsSync(envPath)) {
            log.info("Waiting for .env file to be created...");
            await sleep(1);
        }

        log.info(".env file created successfully, reloading environment variables...");
    }

    dotenv.config();
};

const start = async () => {
    await ensureEnvFileCreated();

    const app = express();
    const PORT = 5544;

    const cookie = await getCookieFromUserInput();
    await getApiKeyFromUserInput(cookie);

    app.use(express.json());
    app.use("/api", router);

    app.listen(PORT, () => {
        log.info(`Listening on http://localhost:${PORT}`);
    });
};

start();
