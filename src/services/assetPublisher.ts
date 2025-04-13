import got from "got";
import { log } from "../utils/logger";
import { getCsrfToken } from "./robloxApi";

const ROBLOX_ASSETS_URL = "https://assetdelivery.roblox.com/v1/asset/?id=";
const ROBLOX_PUBLISH_URL = "https://www.roblox.com/ide/publish/uploadnewanimation?";

/**
 * Retrieves asset data from the Roblox API.
 * This function makes multiple attempts to fetch data and retries if it fails.
 * @param {number} oldId - The old ID of the asset to retrieve.
 * @param {string} cookie - The Roblox .ROBLOSECURITY cookie used for authentication.
 * @returns {Promise<string | null>} - The asset data as a string or null if failed.
 */
async function retrieveAssetData(oldId: number, cookie: string): Promise<Buffer | null> {
    try {
        const response = await got(`${ROBLOX_ASSETS_URL}${oldId}`, {
            method: "GET",
            responseType: "buffer",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
            timeout: {
                request: 10000,
            },
            retry: {
                limit: 3,
                methods: ["GET"],
                statusCodes: [408, 429, 500, 502, 503, 504],
            },
            hooks: {
                beforeRetry: [
                    (_, error, retryCount) => {
                        log.warn(
                            `[${oldId}] Failed to retrieve Asset data: ${error}; Retrying attempt #${retryCount! + 1}`
                        );
                    },
                ],
            },
        });

        return response.body;
    } catch (error: any) {
        log.error(`[${oldId}] Failed to retrieve Asset data: ${error}.`);
        return null;
    }
}

/**
 * Publishes an asset asset to Roblox.
 * This function handles the process of publishing the asset and retries if the request fails.
 * @param {number} oldId - The old ID of the asset to publish.
 * @param {string} cookie - The Roblox .ROBLOSECURITY cookie used for authentication.
 * @param {"Animation" | "Audio"} assetType - Type of asset being published.
 * @param {number} creatorId - The ID of the creator of the asset.
 * @param {boolean} isGroup - A boolean indicating if the asset belongs to a group.
 * @returns {Promise<string | null>} - The new asset ID if successful, or null if failed.
 */
export async function publishAssetAsync(
    oldId: number,
    cookie: string,
    assetType: "Animation" | "Audio",
    creatorId: number,
    isGroup: boolean
): Promise<string | null> {
    const assetData = await retrieveAssetData(oldId, cookie);
    const csrfToken = await getCsrfToken(cookie);

    if (!assetData || !csrfToken) {
        throw new Error(`[${oldId}] Missing asset data or CSRF token.`);
    }

    const animUrl =
        `${ROBLOX_PUBLISH_URL}` +
        `AllID=1` +
        `&assetTypeName=${assetType}` +
        `&name=${assetType}` +
        `&ispublic=false` +
        `&allowComments=false` +
        `&isGamesAsset=False` +
        `&groupId=${isGroup ? creatorId.toString() : ""}`;

    try {
        const response = await got(animUrl, {
            method: "POST",
            responseType: "buffer",
            headers: {
                "User-Agent": "Roblox/Linux",
                "x-csrf-token": csrfToken,
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
            body: assetData,
            timeout: {
                request: 10000,
            },
            retry: {
                limit: 3,
                methods: ["GET", "POST"],
                statusCodes: [408, 429, 500, 502, 503, 504],
            },
            hooks: {
                beforeRetry: [
                    (_, error, retryCount) => {
                        log.warn(`[${oldId}] Failed to publish Asset: ${error}; Retrying attempt #${retryCount! + 1}`);
                    },
                ],
            },
        });

        return response.body.toString();
    } catch (error: any) {
        throw new Error(`[${oldId}] Failed to publish Asset: ${error}.`);
    }
}
