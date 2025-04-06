import got from "got";
import { log } from "../utils/logger";
import { getCsrfToken } from "./robloxApi";

/**
 * Sleep function to wait for a specific time (ms).
 * @param {number} ms - The time to sleep in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieves animation data from the Roblox API.
 * This function makes multiple attempts to fetch data and retries if it fails.
 * @param {string} cookie - The Roblox .ROBLOSECURITY cookie used for authentication.
 * @param {string} apiKey - The Roblox API key used for authentication.
 * @param {number} oldId - The old ID of the animation to retrieve.
 * @returns {Promise<string | null>} - The animation data as a string or null if failed.
 */
const retrieveAnimationData = async (cookie: string, apiKey: string, oldId: number): Promise<string | null> => {
    let retries = 0;
    let animationData = null;

    while (retries < 3) {
        try {
            const response = await got(`https://assetdelivery.roblox.com/v1/asset/?id=${oldId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/xml",
                    "User-Agent": "Roblox/Linux",
                    Cookie: `.ROBLOSECURITY=${cookie}`,
                    Authorization: `Bearer ${apiKey}`,
                },
            });

            const responseData: any = response.body;
            animationData = responseData;
            break;
        } catch (error: any) {
            retries++;

            if (retries === 3) {
                log.error(`Failed to retrieve Asset data for ${oldId}: ${error.message}.`);
                break;
            } else {
                log.error(`Failed to retrieve Asset data for ${oldId}: ${error.message}; Retrying...`);
            }

            await sleep(1);
            continue;
        }
    }

    return animationData;
};

/**
 * Publishes an animation asset to Roblox.
 * This function handles the process of publishing the animation and retries if the request fails.
 * @param {string} cookie - The Roblox .ROBLOSECURITY cookie used for authentication.
 * @param {string} apiKey - The Roblox API key used for authentication.
 * @param {number} oldId - The old ID of the animation to publish.
 * @param {number} creatorId - The ID of the creator of the asset.
 * @param {boolean} isGroup - A boolean indicating if the asset belongs to a group.
 * @returns {Promise<string | null>} - The new animation ID if successful, or null if failed.
 */
export const publishAssetAsync = async (
    cookie: string,
    apiKey: string,
    oldId: number,
    creatorId: number,
    isGroup: boolean
): Promise<string | null> => {
    let newAnimationId: string | null = null;
    let retries = 0;

    const animationData = await retrieveAnimationData(cookie, apiKey, oldId);
    const csrfToken = await getCsrfToken(cookie);

    while (retries < 3) {
        try {
            const animUrl =
                "https://www.roblox.com/ide/publish/uploadnewanimation?" +
                "AllID=1&assetTypeName=Animation&genreTypeId=1&" +
                "name=Animation&ispublic=false&allowComments=false";
            const body: string = animationData!;
            const response = await got(animUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/xml",
                    "User-Agent": "Roblox/Linux",
                    "x-csrf-token": csrfToken,
                    Cookie: `.ROBLOSECURITY=${cookie}`,
                    Authorization: `Bearer ${apiKey}`,
                },
                body,
            });

            newAnimationId = response.body;
            break;
        } catch (error: any) {
            retries++;

            if (retries === 3) {
                log.error(`Failed to publish Asset ${oldId}: ${error.message}.`);
                break;
            } else {
                log.error(`Failed to publish Asset ${oldId}: ${error.message}; Retrying...`);
            }

            await sleep(1);
            continue;
        }
    }

    return newAnimationId;
};
