import { chromium, Browser, Page } from 'playwright';
import { determineHeadlessShellPath } from './determineHeadlessShellPath';

export async function extractPlainText(url: string): Promise<string> {
    let browser: Browser | null = null;

    try {
        const executablePath = determineHeadlessShellPath();
        
        if (!executablePath) {
            return '';
        }

        browser = await chromium.launch({ executablePath });

        const context = await browser.newContext();
        const page: Page = await context.newPage();

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        console.log(`Extracting text content from ${url}...`);
        const plainText = await page.evaluate(() => document.body.innerText || '');

        return plainText;
    } catch (error) {
        console.error(`Failed to extract plain text from ${url}:`, error);
        return "";
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
