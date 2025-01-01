import { BrowserWindow } from 'electron';
import * as path from 'path';

export function openDebugLogWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.loadFile(path.join(__dirname, '../debug-log.html'));
}