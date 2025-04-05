import express from "express";
import { Router } from "express";
import { generateEnvFile } from "./utils/dotenv";
import { getCookieFromUserInput } from "./utils/cookie";
import { getApiKeyFromUserInput } from "./utils/apiKey";
const router = Router();

router.get("/", (req, res) => {
    res.send("Hello from the Roblox reuploader server!");
});

router.post("/", (req, res) => {
    res.status(501).send("POST handling not implemented yet.");
});

export const startServer = async () => {
    generateEnvFile();

    const app = express();
    const PORT = 5544;

    const cookie = await getCookieFromUserInput();
    const apiKey = await getApiKeyFromUserInput();

    app.use(express.json());
    app.use("/", router);

    app.listen(PORT, () => {
        console.log(`\x1b[32m[Server]\x1b[0m Listening on http://localhost:${PORT}`);
    });
};
