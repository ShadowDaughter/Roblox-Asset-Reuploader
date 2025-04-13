import { generateLogsFile, generateEnvFile } from "./utils/filesManager";
import { checkForUpdates } from "./utils/updatesChecker";
import { installRobloxPlugin } from "./utils/installPlugin";
import { getEnvInput } from "./utils/inputManager";
import { getCookie, validateCookie } from "./services/robloxApi";
import express from "express";
import router from "./routes/router";
import { log } from "./utils/logger";

/**
 * Starts the Roblox Asset Reuploader.
 *
 * Ensures the environment is set up, validates required inputs,
 * initializes the Express server, and sets up API routes.
 */
const start = async () => {
    await generateLogsFile();
    await generateEnvFile();
    await checkForUpdates();
    await installRobloxPlugin();

    const app = express();
    const PORT = 5544;

    await getEnvInput("ROBLOSECURITY_COOKIE", getCookie, validateCookie, true);
    app.use(express.json());
    app.use("/api", router);

    app.listen(PORT, () => {
        log.info(`Listening on http://localhost:${PORT}`);
    });
};

process.title = "Roblox Asset Reuploader";
start();
