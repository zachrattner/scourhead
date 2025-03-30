import fs from 'fs';
import path from 'path';

export function determineBrowserPath(): string | null {
  const platform = process.platform;
  const candidatePaths: string[] = [];

  if (platform === 'darwin') {
    // On macOS, Chrome is typically installed in /Applications.
    candidatePaths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    // Also check for user-level installations:
    if (process.env.HOME) {
      candidatePaths.push(
        path.join(process.env.HOME, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome')
      );
    }
  } else if (platform === 'win32') {
    // On Windows, check both "Program Files" and "Program Files (x86)"
    if (process.env.PROGRAMFILES) {
      candidatePaths.push(path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (process.env['PROGRAMFILES(X86)']) {
      candidatePaths.push(
        path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
      );
    }
    // In some cases (especially on ARM Windows), Chrome may be installed in a different location.
    if (process.env.LOCALAPPDATA) {
      candidatePaths.push(
        path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
      );
    }
  } else if (platform === 'linux') {
    // On Linux, check several common locations.
    candidatePaths.push('/usr/bin/google-chrome');
    candidatePaths.push('/usr/bin/google-chrome-stable');
    candidatePaths.push('/opt/google/chrome/chrome');
  }

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      console.info(`Found Chrome at: ${candidate}`);
      return candidate;
    }
  }

  console.error('No installed Chrome found in candidate paths.');
  return null;
}