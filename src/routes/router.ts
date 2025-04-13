import express from "express";
import { getEnvValue } from "../utils/filesManager";
import { validateAssets } from "../services/robloxApi";
import { processWithConcurrencyLimit } from "../utils/concurrencyLimits";
import { publishAssetAsync } from "../services/assetPublisher";
import { log, sleep } from "../utils/logger";
import { CURRENT_VERSION } from "../utils/updatesChecker";

let activeTasks = 0;
let completedAssets: Record<string, string> = {};
const router = express.Router();
let hasFinished = false;
let hasStarted = false;

/**
 * Publishes a batch of assets and maps old IDs to new uploaded IDs.
 * @param {"Animation" | "Audio"} assetType - Type of asset being published.
 * @param {number[]} assetIds - List of original asset IDs to upload.
 * @param {number} creatorId - The ID of the uploader.
 * @param {boolean} isGroup - Whether the upload is under a group.
 * @returns {Promise<Record<string, string>>} - A map of old IDs to new uploaded asset IDs.
 */
async function bulkPublishAssetsAsync(
    assetType: "Animation" | "Audio",
    assetIds: number[],
    creatorId: number,
    isGroup: boolean
): Promise<void> {
    const cookie = (await getEnvValue("ROBLOSECURITY_COOKIE")) as string;
    const validAssetIds = await validateAssets(assetIds, cookie, assetType, creatorId);
    const concurrencyLimit = 5;

    await processWithConcurrencyLimit(
        validAssetIds.map((oldId) => async () => {
            activeTasks++;

            try {
                const newId = await publishAssetAsync(oldId, cookie, assetType, creatorId, isGroup);
                if (newId) {
                    completedAssets[oldId.toString()] = newId;
                    log.info(`[${oldId}] Published as ${newId}.`);
                }
            } catch (error: Error | any) {
                log.error(error);
                activeTasks--;
            } finally {
                await sleep(500);
                activeTasks--;
            }
        }),

        concurrencyLimit
    );
}

/**
 * GET /connect - Endpoint to check the server connection.
 * Returns the current version of the application.
 */
router.get("/connect", (_, res) => {
    res.status(200).send(CURRENT_VERSION);
});

/**
 * GET /status - Poll endpoint to retrieve completed asset uploads.
 * Returns 200 if reupload is finished, 200 if idle, or JSON result of completed uploads.
 */
router.get("/status", (_, res) => {
    const isUploadDone = hasFinished && hasStarted && activeTasks === 0 && Object.keys(completedAssets).length === 0;

    if (isUploadDone) {
        log.info("Finished uploading all assets!");
        log.info("You may close this terminal, or leave it open to reupload more assets.");

        hasFinished = false;
        hasStarted = false;
        res.status(200).send("Done");
        return;
    }

    if (Object.keys(completedAssets).length > 0) {
        const response = { ...completedAssets };
        completedAssets = {};
        res.status(200).json(response);
        return;
    }

    res.status(200).send("Idle");
});

/**
 * POST /post - Start a new batch upload of animations or audio assets.
 * Expects: assetType, assetIds, creatorId, isGroup in body.
 */
router.post("/upload", async (req, res) => {
    if (hasStarted) {
        res.status(401).send("POST has already started.");
        return;
    }

    const { assetType, assetIds, creatorId, isGroup } = req.body;
    if (!assetType || !assetIds || !creatorId || isGroup === undefined || isGroup === null) {
        log.error("Missing data, your plugin may be out of date. Aborting reupload.");
        res.status(400).send("MissingData");

        hasFinished = false;
        hasStarted = false;
        return;
    }

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
        log.error("Invalid asset IDs provided. Aborting reupload.");
        res.status(400).send("InvalidAssetIds");

        hasFinished = false;
        hasStarted = false;
        return;
    }

    console.clear();
    hasStarted = true;

    log.info("Starting upload...");
    bulkPublishAssetsAsync(assetType, assetIds, creatorId, isGroup)
        .then(() => {
            hasFinished = true;
        })
        .catch((error) => {
            log.error(`Error during bulk upload: ${error}`);
        });

    res.status(200).send("Upload started successfully.");
});

export default router;
