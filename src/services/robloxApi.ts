import got from "got";
import { log } from "../utils/logger";

const ROBLOX_AUTH_URL = "https://users.roblox.com/v1/users/authenticated";
const ROBLOX_PERMISSIONS_URL = "https://assetdelivery.roblox.com/v1/asset/?id=118338324636142";

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
                Cookie: `.ROBLOSECURITY=${cookie}`,
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
        const response = await got("https://auth.roblox.com/v2/logout", {
            method: "POST",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
                "User-Agent": "Roblox/Linux",
            },
        });

        if (response.statusCode === 403) {
            const token = Array.isArray(response.headers["x-csrf-token"])
                ? response.headers["x-csrf-token"][0]
                : response.headers["x-csrf-token"];

            if (token) {
                return token;
            } else {
                throw new Error("CSRF token not found in 403 response headers.");
            }
        }

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

        throw new Error(`Failed to get CSRF token: ${error.message}`);
    }
};

/**
 * Returns an Authorization header with the API key.
 * @returns {object} The header to be used in requests.
 */
export const validateApiKey = async (apiKey: string, cookie: string): Promise<boolean> => {
    if (apiKey === "your-roblox-api-key") {
        return false;
    }

    // Uncomment the below code if you wish to validate the API key with Roblox
    /*
    try {
        const response = await got(ROBLOX_PERMISSIONS_URL, {
            method: "GET",
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
                Authorization: apiKey,
                "Content-Type": "application/xml",
                "User-Agent": "Roblox/Linux",
            },
        });

        return response.statusCode === 200;
    } catch (error: any) {
        return false;
    }
    */

    return true; // Temporary until you decide to implement API key validation.
};
