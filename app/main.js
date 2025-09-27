#!npx electron
// main.js
import { app, BrowserWindow } from "electron";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APP = dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 960,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            sandbox: false,
        },
        show: false,
    });
    win.loadFile("index.html");
    win.once("ready-to-show", () => {
        win.show();
        // devtools
        win.webContents.openDevTools();
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => app.quit());
