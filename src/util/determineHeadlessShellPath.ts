import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import logger from './logger';

export function getBrowsersPath(): string {
    const isDev = !app.isPackaged;

    // In development, resolve the path to `./browsers` in the project root
    if (isDev) {
        const basePath = app.getAppPath();
        const resolvedPath = path.resolve(basePath, 'browsers');
        logger.info(`Development mode: Browsers directory resolved to: ${resolvedPath}`);
        return resolvedPath;
    }

    // In production, resolve the path to `browsers` in the app's resources folder
    const resolvedPath = path.join(process.resourcesPath, 'browsers'); // Use path.join for consistency
    logger.info(`Production mode: Browsers directory resolved to: ${resolvedPath}`);
    return resolvedPath;
}

export function determineHeadlessShellPath(): string | null {
    const browsersDir = getBrowsersPath();

    const stack: string[] = [browsersDir];
    const shellName = 'headless_shell';

    while (stack.length > 0) {
        const currentDir = stack.pop()!;

        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(currentDir, entry.name);

                const normalizedEntryPath = path.normalize(entryPath);

                if (entry.isFile() && entry.name.includes(shellName)) {
                    logger.info(`Found shell at: ${normalizedEntryPath}`);
                    return normalizedEntryPath;
                }

                if (entry.isDirectory()) {
                    stack.push(normalizedEntryPath);
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                logger.error(`Error while accessing directory '${currentDir}': ${err.message}`);
            } else {
                logger.error(`Unknown error while accessing directory '${currentDir}'`);
            }
        }
    }

    logger.error(`No 'headless_shell' found in ${browsersDir}`);
    return null;
}