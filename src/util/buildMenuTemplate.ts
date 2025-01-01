import { app, shell, BrowserWindow, dialog } from 'electron';
import logger from './logger';
import { openDebugLogWindow } from './openDebugLogWindow';

export const buildMenuTemplate = (
    mainWindow: BrowserWindow,
    openFileDialogFunc: (mainWindow: BrowserWindow) => void
): Electron.MenuItemConstructorOptions[] => {
    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        openFileDialogFunc(mainWindow);
                    },
                },
                { type: 'separator' },
                { role: 'quit', label: 'Exit' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo', label: 'Undo' },
                { role: 'redo', label: 'Redo' },
                { type: 'separator' },
                { role: 'cut', label: 'Cut', accelerator: 'CmdOrCtrl+X' },
                { role: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C' },
                { role: 'paste', label: 'Paste', accelerator: 'CmdOrCtrl+V' },
                { role: 'selectAll', label: 'Select All', accelerator: 'CmdOrCtrl+A' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload', label: 'Reload' },
                { role: 'forceReload', label: 'Force Reload' },
                { role: 'toggleDevTools', label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Reset Zoom' },
                { role: 'zoomIn', label: 'Zoom In' },
                { role: 'zoomOut', label: 'Zoom Out' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Toggle Full Screen' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Open Source Licenses',
                    click: async () => {
                        dialog.showMessageBox({
                            type: 'info',
                            buttons: ['OK'],
                            title: 'Open Source Licenses',
                            message: '❤️ Thank you to the open source community whose contributions made Scourhead possible:',
                            detail: `
                            axios: MIT License
                            chromium: BSD 3-Clause
                            electron: MIT License
                            json-2-csv: MIT License
                            playwright: Apache-2.0 License
                            `,
                        })
                    }
                },
                {
                    label: 'Show Debug Log',
                    click: async () => {
                        openDebugLogWindow();
                    }
                },
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://scourhead.com');
                    },
                },
                
            ],
        },
    ];

    if (process.platform === 'darwin') {
        menuTemplate.unshift({
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        });
    }

    return menuTemplate;
};