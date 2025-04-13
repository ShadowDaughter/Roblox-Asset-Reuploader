import os from "os";
import path from "path";
import fs from "fs-extra";
import winreg from "winreg";
import got from "got";
import { log } from "./logger";

const PLUGIN_URL = "https://api.github.com/repos/ShadowDaughter/Roblox-Asset-Reuploader-Plugin/releases/latest";
const PLUGIN_FILE_NAME = "RobloxAssetReuploader.rbxmx";
type LatestRelease = {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
};

/**
 * Resolves the Roblox local plugin directory from the Windows registry.
 * @returns {string} Path to the plugins directory.
 * @throws Will throw if the path couldn't be found.
 */
async function getPluginPathFromRegistry(): Promise<string | null> {
    const regKey = new winreg({
        hive: winreg.HKCU,
        key: "\\Software\\Roblox\\RobloxStudio",
    });

    return new Promise((resolve) => {
        regKey.get("rbxm_local_plugin_last_directory", (error: any, entry: any) => {
            if (error || !entry?.value) {
                return resolve(null);
            }

            resolve(entry.value);
        });
    });
}

/**
 * Resolves the Roblox local plugin directory depending on the platform.
 * @returns {string} Path to the plugins directory.
 * @throws Will throw if the path couldn't be found.
 */
export async function getRobloxPluginsFolder(): Promise<string> {
    try {
        const platform = os.platform();

        if (platform !== "win32" && platform !== "darwin") {
            throw new Error("Unsupported platform: " + platform);
        }

        if (platform === "win32") {
            const localAppData = process.env.LOCALAPPDATA;
            if (!localAppData) throw new Error("LOCALAPPDATA not found");
            const pluginsDir = (await getPluginPathFromRegistry()) || path.join(localAppData, "Roblox", "Plugins");
            return pluginsDir;
        }

        return path.join(os.homedir(), "Library", "Application Support", "Roblox", "Plugins");
    } catch (error: any) {
        throw new Error(`Failed to get Roblox plugins folder: ${error}`);
    }
}

/**
 * Downloads and installs the Roblox plugin to the user's local plugin folder.
 * @returns {Promise<boolean>} True if the installation was successful, false otherwise.
 */
export async function installRobloxPlugin(): Promise<boolean> {
    try {
        const response = await got(PLUGIN_URL, {
            method: "GET",
            responseType: "json",
        });

        const latestRelease = response.body as LatestRelease;
        const downloadUrl = latestRelease.assets.find((asset) => asset.name === PLUGIN_FILE_NAME)?.browser_download_url;

        const pluginsDir = await getRobloxPluginsFolder();
        const pluginPath = path.join(pluginsDir, PLUGIN_FILE_NAME);
        log.debug(`Installing plugin to: ${pluginPath}`);

        const tempDir = path.join(os.tmpdir(), "roblox_plugins_temp");
        const tempPluginPath = path.join(tempDir, PLUGIN_FILE_NAME);

        await fs.ensureDir(tempDir);
        const downloadStream = got.stream(downloadUrl!);
        const fileWriter = fs.createWriteStream(tempPluginPath);

        await new Promise<void>((resolve, reject) => {
            downloadStream.pipe(fileWriter);
            fileWriter.on("finish", () => {
                resolve();
            });
            fileWriter.on("error", (err) => {
                reject(err);
            });
            downloadStream.on("error", (err) => {
                reject(err);
            });
        });

        await fs.remove(pluginPath);
        await fs.move(tempPluginPath, pluginPath);
        log.debug("Plugin installed successfully.");
        return true;
    } catch (error: any) {
        log.error(`Plugin installation failed: ${error}`);
        return false;
    }
}
