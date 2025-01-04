import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { buildMenuTemplate } from './util/buildMenuTemplate';
import logger from './util/logger';
import { createScourFile } from './util/stages/createScourFile';
import { readScourFile, writeScourFile } from './util/scourFileUtils';
import { ScourFile } from './util/scourFormat';
import { generateQueries } from "./util/stages/generateQueries";
import { runSearch } from './util/stages/runSearch';
import { parsePages } from './util/stages/parsePages';
import { convertToCsv } from './util/stages/convertToCsv';
import { loadPreference, savePreference } from './util/preferences';
import { write } from 'fs';

let mainWindow: BrowserWindow | null;
let scourFile: ScourFile | null;
let scourFilePath: string | null;

const iconPath = path.resolve(__dirname, './icons/source/Scourhead.png');

const createWindow = () => {
    app.setName('Scourhead');

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: iconPath,
        center: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'setup-intro.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

async function handleOpenedFile(filePath: string) {
    scourFilePath = filePath;

    scourFile = readScourFile(filePath);

    const requestedModel = loadPreference('model');
    if (requestedModel) {
        scourFile.model = requestedModel;
        await writeScourFile(scourFilePath, scourFile);
    }

    if (scourFile) {
        logger.info(`Loaded project at ${filePath}`);
        mainWindow?.loadFile(path.join(__dirname, 'setup-enter-goal.html'));
    }
    else {
        if (mainWindow) {
            dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['OK'],
                defaultId: 0,
                title: 'Failed to load project',
                message: 'Unable to load the project file. Please try again or check permissions.',
            });
        }
    }
}

ipcMain.on('navigate-to', (event, page) => {
    if (mainWindow) {
        mainWindow.loadFile(path.join(__dirname, page));
    }
});

app.on('open-file', async (event, filePath) => {
    event.preventDefault();

    if (app.isReady()) {
        await handleOpenedFile(filePath);
    }
    else {
        app.on('ready', async () => {
            await handleOpenedFile(filePath)
        });
    }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
}
else {
    app.on('second-instance', async (event, argv) => {
        const filePath = argv.find(arg => arg.endsWith('.scour'));
        if (filePath) {
            await handleOpenedFile(filePath);
        }
    });
}

app.on('ready', () => {
    createWindow();

    // Only set the icon on macOS
    if ((process.platform === 'darwin') && app.dock) {
        app.dock.setIcon(iconPath);
    }

    if (mainWindow) {
        const menu = Menu.buildFromTemplate(buildMenuTemplate(mainWindow, onNewFileRequested, onOpenFileRequested));
        Menu.setApplicationMenu(menu);
    }

    const filePath = process.argv.find(arg => arg.endsWith('.scour'));
    if (filePath) {
        handleOpenedFile(filePath);
    }
});

async function onNewFileRequested(mainWindow: BrowserWindow) {
    const desktopPath = app.getPath('desktop');

    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Create New Project',
        defaultPath: `${desktopPath}/project.scour`,
        filters: [{ name: 'Scour Files', extensions: ['scour'] }],
    });

    const { filePath } = result;
            
    try {
        scourFilePath = filePath;
        scourFile = createScourFile(filePath);
        if (scourFile) {
            logger.info(`Created project at ${filePath}`);
            mainWindow?.loadFile(path.join(__dirname, 'setup-enter-goal.html'));
        } else {
            throw new Error('Failed to create project file');
        }
    } catch (error) {
        logger.error(`Failed to create project: ${filePath}`);
        if (mainWindow) {
            await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['OK'],
                defaultId: 0,
                title: 'Project creation failed',
                message: 'Unable to create the project file. Please try again or check permissions.',
            });
        }
    }
}

async function onOpenFileRequested(mainWindow: BrowserWindow) {
    mainWindow?.loadFile(path.join(__dirname, 'setup-enter-goal.html'));

    const options: Electron.OpenDialogOptions = {
        title: 'Open Existing Project',
        filters: [{ name: 'Scour Files', extensions: ['scour'] }],
        properties: ['openFile'],
    };

    const result = await dialog.showOpenDialog(mainWindow, options);

    await handleOpenProject(result);
}

ipcMain.handle('show-save-dialog', async (event, options) => {
    if (!mainWindow) {
        logger.warn('Ignoring show-save-dialog request because mainWindow is not available');
        return;
    }

    const result = await dialog.showSaveDialog(mainWindow, options);
    return result.filePath;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    if (!mainWindow) {
        logger.warn('Ignoring show-open-dialog request because mainWindow is not available');
        return;
    }

    const result = await dialog.showOpenDialog(mainWindow, options);
    return { filePaths: result.filePaths };
});

ipcMain.on('create-project', async (event, filePath) => {
    try {
        scourFilePath = filePath;
        scourFile = createScourFile(filePath);
        if (scourFile) {
            logger.info(`Created project at ${filePath}`);
            mainWindow?.loadFile(path.join(__dirname, 'setup-enter-goal.html'));
        } else {
            throw new Error('Failed to create project file');
        }
    } catch (error) {
        logger.error(`Failed to create project: ${filePath}`);
        if (mainWindow) {
            await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['OK'],
                defaultId: 0,
                title: 'Project creation failed',
                message: 'Unable to create the project file. Please try again or check permissions.',
            });
        }
    }
});

async function handleOpenProject(fileSelection: any) {
    const filePath = fileSelection.filePaths[0];
    scourFilePath = filePath;

    scourFile = readScourFile(filePath);
    if (scourFile) {
        logger.info(`Loaded project at ${filePath}`);

        const requestedModel = loadPreference('model');
        if (requestedModel) {
            scourFile.model = requestedModel;
            await writeScourFile(filePath, scourFile);
        }

        mainWindow?.loadFile(path.join(__dirname, 'setup-enter-goal.html'));
    }
    else {
        if (mainWindow) {
            await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['OK'],
                defaultId: 0,
                title: 'Failed to load project',
                message: 'Unable to load the project file. Please try again or check permissions.',
            });
        }
    }
}

ipcMain.on('open-project', async (event, fileSelection) => {
    await handleOpenProject(fileSelection);
});

ipcMain.handle('show-info', async (event, { title, message }) => {
    await dialog.showMessageBox({
        type: 'info',
        buttons: ['OK'],
        title: title,
        message: message,
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('get-desktop-path', () => {
    return app.getPath('desktop');
});

ipcMain.handle('get-scour-file', () => {
    if (!scourFilePath) {
        logger.warn(`Cannot set scour file because there is no scour file path`);
        return;
    }

    scourFile = readScourFile(scourFilePath);
    return scourFile;
});

ipcMain.handle('set-scour-file', (event, incomingScourFile: ScourFile) => {
    if (!scourFilePath) {
        logger.warn(`Cannot set scour file because there is no scour file path`);
        return;
    }

    scourFile = incomingScourFile;

    logger.info(`Writing scour file to disk: ${scourFilePath}`);
    writeScourFile(scourFilePath, scourFile);
});

ipcMain.handle('create-search-queries', async (event) => {
    if (!scourFilePath) {
        logger.warn(`Cannot create search queries because there is no scour file path`);
        return;
    }

    await generateQueries(scourFilePath);
    scourFile = readScourFile(scourFilePath);
});

ipcMain.handle('run-search', async (event) => {
    if (!scourFilePath) {
        logger.warn(`Cannot run search because there is no scour file path`);
        return;
    }

    await runSearch(scourFilePath);
    scourFile = readScourFile(scourFilePath);
});

ipcMain.handle('parse-pages', async (event) => {
    if (!scourFilePath) {
        logger.warn(`Cannot parse pages because there is no scour file path`);
        return;
    }

    await parsePages(scourFilePath);
    scourFile = readScourFile(scourFilePath);
});

ipcMain.handle('show-export-dialog', async (event, options) => {
    if (!mainWindow) {
        logger.warn('Ignoring show-save-dialog request because mainWindow is not available');
        return;
    }

    const result = await dialog.showSaveDialog(mainWindow, options);
    const { filePath } = result;

    return filePath;
});

ipcMain.handle('export-csv', async (event, csvPath: string) => {
    if (!scourFilePath) {
        logger.warn(`Cannot create search queries because there is no scour file path`);
        return;
    }

    await convertToCsv(scourFilePath, csvPath);
});

ipcMain.handle('load-preference', async (event, key: string) => {
    return await loadPreference(key);
});

ipcMain.handle('save-preference', async (event, key: string, value: any) => {
    await savePreference(key, value);
});

ipcMain.handle('get-formatted-debug-log', async (event) => {
    const rawDebugLog = logger.getDebugLog();
    if (!rawDebugLog || !rawDebugLog.length) {
        return 'There are no debug log lines present yet. Start using Scourhead to make some logs!';
    }

    return rawDebugLog?.join('\n');
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
