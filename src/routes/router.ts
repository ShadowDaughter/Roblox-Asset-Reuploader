import express from "express";
import { publishAssetAsync } from "../services/assetPublisher";
import { log } from "../utils/logger";
import { getEnvValue } from "../utils/dotenv";
import { validateAssets } from "../services/robloxApi";

const router = express.Router();
let hasStarted = false;
let hasFinished = false;
let completedAssets: Record<string, string> = {};

/**
 * Sleep function to wait for a specific time (ms).
 * @param {number} ms - The time to sleep in milliseconds.
 * @returns {Promise<void>}
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Publishes a batch of assets and maps old IDs to new uploaded IDs.
 * @param {"Animation" | "Audio"} assetType - Type of asset being published.
 * @param {number[]} assetIds - List of original asset IDs to upload.
 * @param {number} creatorId - The ID of the uploader.
 * @param {boolean} isGroup - Whether the upload is under a group.
 * @returns {Promise<Record<string, string>>} - A map of old IDs to new uploaded asset IDs.
 */
const bulkPublishAssetsAsync = async (
    assetType: "Animation" | "Audio",
    assetIds: number[],
    creatorId: number,
    isGroup: boolean
): Promise<Record<string, string>> => {
    const cookie = (await getEnvValue("ROBLOSECURITY_COOKIE")) as string;
    const result: Record<string, string> = {};

    const validAssetIds = await validateAssets(assetIds, cookie, assetType, creatorId);
    for (const oldId of validAssetIds) {
        try {
            const newId = await publishAssetAsync(oldId, cookie, assetType, creatorId, isGroup);
            if (newId) {
                result[oldId.toString()] = newId;
                log.info(`Published ${oldId} as ${newId}.`);
            }
        } catch (error: any) {
            log.error(`Failed to publish ${oldId}: ${error.message}`);
        }

        await sleep(1);
    }

    return result;
};

/**
 * GET / - Poll endpoint to retrieve completed asset uploads.
 * Returns 200 if reupload is finished, 204 if idle, or JSON result of completed uploads.
 */
router.get("/", (req, res) => {
    const isUploadDone = hasFinished && Object.keys(completedAssets).length === 0;

    if (isUploadDone) {
        if (hasStarted) {
            log.info("Finished uploading all assets!");
            log.info("You may close this terminal, or leave it open to reupload more assets.");
        }

        hasStarted = false;
        hasFinished = false;
        res.status(200).send("Done");
        return;
    }

    if (Object.keys(completedAssets).length > 0) {
        const response = { ...completedAssets };
        completedAssets = {};
        res.json(response);
        return;
    }

    res.status(204).send("Uploading");
});

/**
 * POST / - Start a new batch upload of animations or audio assets.
 * Expects: assetType, assetIds, creatorId, isGroup in body.
 */
router.post("/", async (req, res) => {
    if (hasStarted) {
        res.status(401).send("POST has already started.");
        return;
    }

    const { assetType, assetIds, creatorId, isGroup } = req.body;

    if (!assetType || !assetIds || !creatorId || isGroup === undefined || isGroup === null) {
        hasFinished = true;
        log.error("Missing data, your plugin may be out of date. Aborting reupload.");
        res.status(400).send("MissingData");
        return;
    }

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
        hasFinished = true;
        log.error("Invalid asset IDs provided. Aborting reupload.");
        res.status(400).send("InvalidAssetIds");
        return;
    }

    console.clear();
    hasStarted = true;

    const result = await bulkPublishAssetsAsync(assetType, assetIds, creatorId, isGroup);
    if (result) {
        completedAssets = result;
        res.status(200).send("Upload started successfully.");
    } else {
        res.status(500).send("Failed to start upload.");
    }

    hasFinished = true;
});

export default router;
