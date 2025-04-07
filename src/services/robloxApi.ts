import got from "got";
import { log } from "../utils/logger";

const ROBLOX_AUTH_URL = "https://users.roblox.com/v1/users/authenticated";
const ROBLOX_LOGOUT_URL = "https://auth.roblox.com/v2/logout";
const ROBLOX_ASSETS_URL = "https://apis.roblox.com/assets/v1/assets/14215126016";

/**
 * Validates if the provided cookie is valid by making a request to Roblox's API.
 * @param {string} cookie The .ROBLOSECURITY cookie.
 * @returns {Promise<boolean>} True if the cookie is valid, otherwise false.
 */
export const validateCookie = async (cookie: string): Promise<boolean> => {
    if (cookie === "your-roblox-cookie") {
        return false;
    }

    try {
        const response = await got(ROBLOX_AUTH_URL, {
            method: "GET",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`
            },
        });

        return response.statusCode === 200;
    } catch (error: any) {
        return false;
    }
};

/**
 * Retrieves a CSRF token from Roblox by intentionally triggering a 403 response
 * on the logout endpoint. Roblox returns a CSRF token in the response headers
 * when this request is made without a valid token.
 *
 * @param {string} cookie - The .ROBLOSECURITY token used for authentication.
 * @returns {Promise<string>} A promise that resolves with the CSRF token string.
 * @throws Will throw an error if the token is not found or the response is not 403.
 */
export const getCsrfToken = async (cookie: string): Promise<string> => {
    try {
        const response = await got(ROBLOX_LOGOUT_URL, {
            method: "POST",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
        });

        throw new Error(`Expected 403 response to retrieve CSRF token, but got ${response.statusCode}.`);
    } catch (error: any) {
        if (error.response && error.response.statusCode === 403) {
            const token = Array.isArray(error.response.headers["x-csrf-token"])
                ? error.response.headers["x-csrf-token"][0]
                : error.response.headers["x-csrf-token"];

            if (token) {
                return token;
            } else {
                throw new Error("CSRF token not found in the 403 response headers.");
            }
        }

        throw new Error(`Failed to get CSRF token: ${error}`);
    }
};

/**
 * Returns an Authorization header with the API key.
 * @returns {object} The header to be used in requests.
 */
/*export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (apiKey === "your-roblox-api-key") {
        return false;
    }

    try {
        const response = await got(ROBLOX_ASSETS_URL, {
            method: "GET",
            headers: {
                "x-api-key": apiKey,
            },
        });

        return response.statusCode === 200;
    } catch (error: any) {
        return false;
    }
};*/

/**
 * Validates asset IDs by checking type, ownership, and Roblox ownership.
 * @param {number[]} assetIds - The asset IDs to validate.
 * @param {string} cookie - Roblox security cookie.
 * @param {string} expectedType - The expected asset type
 * @param {number} creatorId - Target creator ID to match.
 * @returns {Promise<number[]>} - A filtered list of valid asset IDs.
 */
export const validateAssets = async (
    assetIds: number[],
    cookie: string,
    expectedType: string,
    creatorId: number
): Promise<number[]> => {
    try {
        const assetIdsString = assetIds.join(",");
        const response = await got(`https://develop.roblox.com/v1/assets?assetIds=${assetIdsString}`, {
            method: "GET",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
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
