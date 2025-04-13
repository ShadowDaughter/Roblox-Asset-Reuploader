import got from "got";
import path from "path";
import { log } from "./logger";
import os from "os";
import fs from "fs";
import AdmZip from "adm-zip";
import semver from "semver";
import { prompt } from "./inputManager";
import { spawn } from "child_process";

export const CURRENT_VERSION = "1.2.0";
const GITHUB_API_URL = "https://api.github.com/repos/ShadowDaughter/Roblox-Asset-Reuploader/releases/latest";
const ZIP_NAME = "Roblox.Asset.Reuploader.zip";
type LatestRelease = {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
};

/**
 * Downloads the latest zip file from GitHub, extracts it, replaces the current executable, and deletes the zip file.
 * @param {string} downloadUrl - The URL of the latest zip file.
 */
async function downloadAndReplaceExecutable(downloadUrl: string): Promise<void> {
    try {
        log.info("Downloading the latest version...");
        const response = await got(downloadUrl, { responseType: "buffer" });
        const zipBuffer = response.body;

        const tempDir = path.join(os.tmpdir(), "RobloxAssetReuploaderUpdate");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        log.info("Extracting the zip file...");
        const zip = new AdmZip(zipBuffer);
        zip.extractAllTo(tempDir, true);

        const extractedExecutablePath = path.join(tempDir, "Roblox Asset Reuploader.exe");
        if (!fs.existsSync(extractedExecutablePath)) {
            throw new Error(`Extracted executable not found: ${extractedExecutablePath}`);
        }

        log.info("Creating updater script...");
        const updaterScriptPath = path.join(tempDir, "updater.bat");
        const updaterScriptContent = `
            @echo off
            echo Waiting for the application to close...
            timeout /t 1 >nul

            echo Killing any running instances of the application...
            taskkill /im "Roblox Asset Reuploader.exe" /f >nul 2>&1

            echo Deleting old executable...
            del "${path.join(process.cwd(), "Roblox Asset Reuploader.exe")}" >nul 2>&1
            if exist "${path.join(process.cwd(), "Roblox Asset Reuploader.exe")}" (
                echo Failed to delete the old executable.
                pause
                exit /b 1
            )

            echo Moving new executable into place...
            move "${extractedExecutablePath}" "${path.join(process.cwd(), "Roblox Asset Reuploader.exe")}" >nul 2>&1
            if not exist "${path.join(process.cwd(), "Roblox Asset Reuploader.exe")}" (
                echo Failed to move the new executable.
                pause
                exit /b 1
            )

            echo Cleaning up temporary files...
            rmdir /s /q "${tempDir}" >nul 2>&1

            echo Restarting the application...
            start "" "${path.join(process.cwd(), "Roblox Asset Reuploader.exe")}"

            echo Deleting updater script...
            del "%~f0" >nul 2>&1
        `;
        fs.writeFileSync(updaterScriptPath, updaterScriptContent, "utf-8");
        log.info(`Updater script created at: ${updaterScriptPath}`);
        log.info("Launching updater script...");

        const updaterProcess = spawn("cmd.exe", ["/c", updaterScriptPath], {
            detached: true,
            stdio: "ignore",
        });

        updaterProcess.unref();
        log.info("Exiting the application to complete the update...");
        process.exit(0);
    } catch (error: any) {
        log.error(`Failed to update the application: ${error}`);
    }
}

/**
 * Checks if the current version is outdated by comparing it with the latest release on GitHub.
 * Prompts the user to update if a new version is available.
 * @returns {Promise<boolean>} - Returns true if an update is available, otherwise false.
 */
export async function checkForUpdates(): Promise<boolean> {
    try {
        const response = await got(GITHUB_API_URL, {
            method: "GET",
            responseType: "json",
        });

        const latestRelease = response.body as LatestRelease;
        const latestVersion = latestRelease.tag_name.replace(/^v/, "");
        const downloadUrl = latestRelease.assets.find((asset) => asset.name === ZIP_NAME)?.browser_download_url;

        if (semver.lt(CURRENT_VERSION, latestVersion)) {
            log.warn(`A new version is available: v${latestVersion} (Current: v${CURRENT_VERSION}).`);

            if (!downloadUrl) {
                log.error("Failed to find the download URL for the latest version.");
                return false;
            }

            const userInput = await prompt("Do you want to update to the latest version? (yes/no): ");
            if (userInput.toLowerCase() === "yes" || userInput.toLowerCase() === "y") {
                await downloadAndReplaceExecutable(downloadUrl);
            } else {
                log.warn("Skipping update...");
            }

            return true;
        }

        if (semver.gt(CURRENT_VERSION, latestVersion)) {
            log.debug(
                `You are using a development build (v${CURRENT_VERSION}), which is newer than the latest release (v${latestVersion}).`
            );
            return false;
        }

        return false;
    } catch (error: any) {
        log.error(`Failed to check for updates: ${error}`);
        return false;
    }
}
