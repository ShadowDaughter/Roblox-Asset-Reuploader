import axios from "axios";
const ROBLOX_AUTH_URL = "https://users.roblox.com/v1/users/authenticated";

/**
 * Validates if the provided cookie is valid by making a request to Roblox's API.
 * @param {string} cookie The .ROBLOSECURITY cookie.
 * @returns {Promise<boolean>} True if the cookie is valid, otherwise false.
 */
export const validateCookie = async (cookie: string): Promise<boolean> => {
    try {
        const response = await axios.get(ROBLOX_AUTH_URL, {
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
        });

        return response.status === 200;
    } catch (error) {
        console.error("Error validating cookie:", error);
        return false;
    }
};

/**
 * Returns an Authorization header with the API key.
 * @returns {object} The header to be used in requests.
 */
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
     try {
         const response = await axios.get(ROBLOX_AUTH_URL, {
             headers: {
                 Authorization: `${apiKey}`,
             },
         });

         //console.log(response);

         return response.status === 200;
     } catch (error) {
         console.error("Error validating cookie:", error);
         return false;
     }
};

/**
 * Fetches the authenticated user data from Roblox.
 * @param {string} cookie The .ROBLOSECURITY cookie.
 * @returns {Promise<any>} The authenticated user data, or null if invalid.
 */
export const getAuthenticatedUser = async (cookie: string): Promise<any | null> => {
    try {
        const response = await axios.get(ROBLOX_AUTH_URL, {
            headers: {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            },
        });

        return response.data;
    } catch (error) {
        console.error("Error fetching authenticated user:", error);
        return null;
    }
};
