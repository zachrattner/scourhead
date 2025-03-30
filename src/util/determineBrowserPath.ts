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

export function determineBrowserPath(): string | null {
    const browsersDir = getBrowsersPath();
  
    // Determine platform-specific executable name
    let executableName: string;
    if (process.platform === 'win32') {
      executableName = 'chromium.exe';
    } else if (process.platform === 'darwin') {
      executableName = 'Chromium';
    } else {
      // Linux and others
      executableName = 'chromium';
    }
  
    const stack: string[] = [browsersDir];
  
    while (stack.length > 0) {
      const currentDir = stack.pop()!;
  
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  
        for (const entry of entries) {
          const entryPath = path.join(currentDir, entry.name);
          const normalizedEntryPath = path.normalize(entryPath);
  
          if (entry.isDirectory()) {
            // On macOS, check for .app bundles
            if (process.platform === 'darwin' && entry.name.endsWith('.app')) {
              // Construct the path to the binary inside the .app bundle.
              const appBinaryPath = path.join(normalizedEntryPath, 'Contents', 'MacOS', executableName);
              if (fs.existsSync(appBinaryPath)) {
                logger.info(`Found browser at: ${appBinaryPath}`);
                return appBinaryPath;
              }
            }
  
            // Add the directory to the stack to search deeper.
            stack.push(normalizedEntryPath);
          } else if (entry.isFile() && entry.name.includes(executableName)) {
            logger.info(`Found browser at: ${normalizedEntryPath}`);
            return normalizedEntryPath;
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
  
    logger.error(`No '${executableName}' found in ${browsersDir}`);
    return null;
  }
  