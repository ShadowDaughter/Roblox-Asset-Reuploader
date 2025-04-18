import keytar from "keytar";
import got from "got";
import { log } from "../utils/logger";
import chunk from "lodash.chunk";

const SERVICE_NAME = "http://www.roblox.com";
const ACCOUNT_NAME = "RobloxStudioAuth.ROBLOSECURITY";

const ROBLOX_AUTH_URL = "https://users.roblox.com/v1/users/authenticated";
const ROBLOX_LOGOUT_URL = "https://auth.roblox.com/v2/logout";
const ROBLOX_DEVELOP_URL = "https://develop.roblox.com/v1/assets?assetIds=";

/**
 * Retrieves the stored ROBLOSECURITY cookie from the system's credential store.
 * @returns {Promise<string | undefined>} The ROBLOSECURITY cookie if found, otherwise undefined.
 */
export async function getCookie(): Promise<string | undefined> {
    try {
        const cookie = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

        if (!cookie || typeof cookie !== "string" || cookie.trim().length === 0) {
            return undefined;
        }

        return cookie;
    } catch (error) {
        log.error(`Failed to retrieve ROBLOSECURITY from the credential store: ${error}`);
        return undefined;
    }
}

/**
 * Validates if the provided cookie is valid by making a request to Roblox's API.
 * @param {string} cookie The .ROBLOSECURITY cookie.
 * @returns {Promise<boolean>} True if the cookie is valid, otherwise false.
 */
export async function validateCookie(cookie: string): Promise<boolean> {
    if (cookie === "your-roblox-cookie") {
        return false;
    }

    try {
        const response = await got(ROBLOX_AUTH_URL, {
            method: "GET",
            responseType: "json",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
            timeout: {
                request: 10000,
            },
        });

        return response.statusCode === 200;
    } catch (error: any) {
        return false;
    }
}

/**
 * Retrieves a CSRF token from Roblox by intentionally triggering a 403 response
 * on the logout endpoint. Roblox returns a CSRF token in the response headers
 * when this request is made without a valid token.
 *
 * @param {string} cookie - The .ROBLOSECURITY token used for authentication.
 * @returns {Promise<string>} A promise that resolves with the CSRF token string.
 * @throws Will throw an error if the token is not found or the response is not 403.
 */
export async function getCsrfToken(cookie: string): Promise<string> {
    try {
        const response = await got(ROBLOX_LOGOUT_URL, {
            method: "POST",
            responseType: "json",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
            timeout: {
                request: 10000,
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
}

/**
 * Validates asset IDs by checking type, ownership, and Roblox ownership.
 * @param {number[]} assetIds - The asset IDs to validate.
 * @param {string} cookie - Roblox security cookie.
 * @param {string} expectedType - The expected asset type
 * @param {number} creatorId - Target creator ID to match.
 * @returns {Promise<number[]>} - A filtered list of valid asset IDs.
 */
export async function validateAssets(
    assetIds: number[],
    cookie: string,
    expectedType: string,
    creatorId: number
): Promise<number[]> {
    try {
        const validAssets: number[] = [];
        const assetChunks = chunk(assetIds, 50);

        for (const chunk of assetChunks) {
            const assetIdsString = chunk.join(",");
            const response = await got(`${ROBLOX_DEVELOP_URL}${assetIdsString}`, {
                method: "GET",
                responseType: "json",
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
                            log.warn(`Error while validating assets: ${error}; Retrying attempt #${retryCount! + 1}`);
                        },
                    ],
                },
            });

            const responseData = response.body as any;
            const assets = Array.isArray(responseData.data) ? responseData.data : [responseData.data];

            for (const asset of assets) {
                const isTypeMatch = asset.type === expectedType;
                const targetCreatorId = asset.creator?.targetId;

                if (!isTypeMatch) {
                    log.info(`[${asset.id}] Asset is not of type ${expectedType}; Skipping...`);
                    continue;
                }

                if (asset.isModerated) {
                    log.warn(`[${asset.id}] Asset is moderated; Skipping...`);
                    continue;
                }

                if (targetCreatorId === creatorId) {
                    log.info(`[${asset.id}] Asset is owned by Uploader; Skipping...`);
                    continue;
                }

                if (targetCreatorId === 1) {
                    log.info(`[${asset.id}] Asset is owned by Roblox; Skipping...`);
                    continue;
                }

                validAssets.push(asset.id);
            }
        }

        return validAssets;
    } catch (error: any) {
        log.error(`Error while validating assets: ${error}`);
        return [];
    }
}
