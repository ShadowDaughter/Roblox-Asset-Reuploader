import express from "express";
import got from "got";
import { publishAssetAsync } from "../services/assetPublisher";
import { log } from "../utils/logger";
import { getEnvValue } from "../utils/dotenv";

const router = express.Router();
let hasStarted = false;
let hasFinished = false;
let completedAnimations: Record<string, string> = {};

/**
 * Sleep function to wait for a specific time (ms).
 * @param {number} ms - The time to sleep in milliseconds.
 * @returns {Promise<void>}
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validates asset IDs by checking type, ownership, and Roblox ownership.
 * @param {number[]} assetIds - The asset IDs to validate.
 * @param {string} expectedType - The expected asset type (e.g., "Animation", "Audio").
 * @param {string} cookie - Roblox security cookie.
 * @param {string} apiKey - API key for authorization.
 * @param {number} creatorId - Target creator ID to match.
 * @returns {Promise<number[]>} - A filtered list of valid asset IDs.
 */
const validateAsset = async (
    assetIds: number[],
    expectedType: string,
    cookie: string,
    apiKey: string,
    creatorId: number
): Promise<number[]> => {
    try {
        const assetIdsString = assetIds.join(",");
        const response = await got(`https://develop.roblox.com/v1/assets?assetIds=${assetIdsString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/xml",
                "User-Agent": "Roblox/Linux",
                Cookie: `.ROBLOSECURITY=${cookie}`,
                Authorization: `Bearer ${apiKey}`,
            },
        });

        const responseData = JSON.parse(response.body.toString());
        const assets = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
        const validAssets: number[] = [];

        for (const asset of assets) {
            const isTypeMatch = asset.type === expectedType;
            const targetCreatorId = asset.creator?.targetId;

            if (!isTypeMatch) {
                log.info(`Asset ${asset.id} is not an ${expectedType}. Skipping...`);
                continue;
            }

            if (targetCreatorId === creatorId) {
                log.info(`Asset ${asset.id} is already owned by the uploader. Skipping...`);
                continue;
            }

            if (targetCreatorId === 1) {
                log.info(`Asset ${asset.id} is owned by Roblox. Skipping...`);
                continue;
            }

            validAssets.push(asset.id);
        }

        return validAssets;
    } catch (error: any) {
        log.error(`Error while validating assets: ${error}`);
        return [];
    }
};

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
    const apiKey = (await getEnvValue("API_KEY")) as string;
    const result: Record<string, string> = {};

    const validAssetIds = await validateAsset(assetIds, assetType, cookie, apiKey, creatorId);

    for (const oldId of validAssetIds) {
        try {
            const newId = await publishAssetAsync(cookie, apiKey, oldId, creatorId, isGroup);
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
 * GET / - Poll endpoint to retrieve completed animation uploads.
 * Returns 200 if reupload is finished, 204 if idle, or JSON result of completed uploads.
 */
router.get("/", (req, res) => {
    const isUploadDone = hasFinished && Object.keys(completedAnimations).length === 0;

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

    if (Object.keys(completedAnimations).length > 0) {
        const response = { ...completedAnimations };
        completedAnimations = {};
        res.json(response);
        return;
    }

    res.status(204).send();
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

    console.clear();
    hasStarted = true;

    const result = await bulkPublishAssetsAsync(assetType, assetIds, creatorId, isGroup);
    if (result) {
        completedAnimations = result;
        res.status(200).send("Upload started successfully.");
    } else {
        res.status(500).send("Failed to upload assets.");
    }

    hasFinished = true;
});

export default router;
