import * as fs from 'fs';
import * as path from 'path';

const { app } = require('electron');
const preferenceFilePath = path.join(app.getPath('userData'), 'scourfile'); 

export function loadPreference(key: string): any | null {
  try {
    if (!fs.existsSync(preferenceFilePath)) {
      fs.writeFileSync(preferenceFilePath, '{}'); 
    }

    const data = fs.readFileSync(preferenceFilePath, 'utf8');
    const preferences = JSON.parse(data);
    return preferences[key] || null; 
  } catch (error) {
    console.error('Error loading preference:', error);
    return null;
  }
}

export function savePreference(key: string, value: any): void {
    try {
      let preferences: Record<string, any> = {};
      try {
        const data = fs.readFileSync(preferenceFilePath, 'utf8');
        preferences = JSON.parse(data);
      } catch (readError) {
        // Ignore read error if the file doesn't exist
        if ((readError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw readError; 
        }
      }
  
      preferences[key] = value;
      fs.writeFileSync(preferenceFilePath, JSON.stringify(preferences, null, 2));
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  }