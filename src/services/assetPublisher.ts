import got from "got";
import { log, sleep } from "../utils/logger";
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
const retrieveAssetData = async (oldId: number, cookie: string): Promise<string | null> => {
    let retries = 0;
    let assetData = null;

    while (retries < 3) {
        try {
            const response = await got(`${ROBLOX_ASSETS_URL + oldId}`, {
                method: "GET",
                responseType: "buffer",
                headers: {
                    Cookie: `.ROBLOSECURITY=${cookie}`,
                },
            });

            const responseData: any = response.body;
            assetData = responseData;
            break;
        } catch (error: any) {
            retries++;

            if (retries === 3) {
                log.error(`[${oldId}] Failed to retrieve Asset data: ${error}.`);
                break;
            } else {
                log.warn(`[${oldId}] Failed to retrieve Asset data: ${error}; Retrying...`);
            }

            await sleep(10);
            continue;
        }
    }

    return assetData;
};

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
export const publishAssetAsync = async (
    oldId: number,
    cookie: string,
    assetType: "Animation" | "Audio",
    creatorId: number,
    isGroup: boolean
): Promise<string | null> => {
    let newAssetId: string | null = null;
    let retries = 0;

    const assetData = await retrieveAssetData(oldId, cookie);
    const csrfToken = await getCsrfToken(cookie);

    if (!assetData || !csrfToken) {
        return null;
    }

    while (retries < 3) {
        try {
            const animUrl =
                `${ROBLOX_PUBLISH_URL}` +
                `AllID=1` +
                `&assetTypeName=${assetType}` +
                `&name=${assetType}` +
                `&ispublic=false` +
                `&allowComments=false` +
                `&isGamesAsset=False` +
                `&groupId=${isGroup ? creatorId.toString() : ""}`;

            const body: string = assetData!;
            const response = await got(animUrl, {
                method: "POST",
                responseType: "buffer",
                headers: {
                    "User-Agent": "Roblox/Linux",
                    "x-csrf-token": csrfToken,
                    Cookie: `.ROBLOSECURITY=${cookie}`,
                },
                body,
            });

            newAssetId = response.body.toString();
            break;
        } catch (error: any) {
            retries++;

            if (retries === 3) {
                log.error(`[${oldId}] Failed to publish Asset: ${error}.`);
                break;
            } else {
                log.warn(`[${oldId}] Failed to publish Asset: ${error}; Retrying...`);
            }

            await sleep(10);
            continue;
        }
    }

    return newAssetId;
};
