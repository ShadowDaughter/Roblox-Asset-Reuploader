import axios from "axios";
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
        const response = await axios.get(ROBLOX_AUTH_URL, {
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
        });

        return response.status === 200;
    } catch (error: any) {
        log.error(`Cookie validation failed [${error.response?.status}]: ${error.message}`);
        return false;
    }
};

export const getCsrfToken = async (cookie: string): Promise<string> => {
    try {
        await axios.post(
            "https://auth.roblox.com/v2/logout",
            {},
            {
                headers: {
                    Cookie: `.ROBLOSECURITY=${cookie}`,
                    "User-Agent": "Roblox/Linux",
                },
            }
        );

        throw new Error("Expected 403 response to retrieve CSRF token, but got 200.");
    } catch (error: any) {
        const token = error?.response?.headers["x-csrf-token"];
        if (error?.response?.status === 403 && token) {
            return token;
        } else {
            throw new Error("Failed to get CSRF token.");
        }
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

    return true;

    /*try {
        const response = await axios.get(ROBLOX_PERMISSIONS_URL, {
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
                Authorization: apiKey,
                "Content-Type": "application/xml",
                "User-Agent": "Roblox/Linux",
            },
        });

        return response.status === 200;
    } catch (error: any) {
        log.error(`API Key validation failed [${error.response?.status}]: ${error.message}`);
        return false;
    }*/
};
