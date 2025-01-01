import { chromium, Browser, Page } from 'playwright';
import { determineHeadlessShellPath } from './determineHeadlessShellPath';
import { stealthifyPlaywright } from './stealthifyPlaywright';

export async function extractHtml(url: string): Promise<string> {
    let browser: Browser | null = null;

    try {
        const executablePath = determineHeadlessShellPath();
        
        if (!executablePath) {
            return '';
        }

        browser = await chromium.launch({ executablePath });

        const context = await stealthifyPlaywright(browser);
        const page: Page = await context.newPage();

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        console.log(`Extracting HTML content from ${url}...`);
        const plainText = await page.evaluate(() => document.body.innerHTML || '');

        return plainText;
    } catch (error) {
        console.error(`Failed to extract HTML from ${url}:`, error);
        return "";
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
