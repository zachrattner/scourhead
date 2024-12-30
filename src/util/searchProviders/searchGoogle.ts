import { chromium, Browser, Page } from 'playwright';
import logger from '../logger';
import { SearchResult } from "../scourFormat";
import { determineHeadlessShellPath } from '../determineHeadlessShellPath';

const SHOW_BROWSER = false;

export async function searchGoogle(query: string, maxPages: number = 1): Promise<SearchResult[]> {
    logger.info("Launching browser...");
    const executablePath = determineHeadlessShellPath();
    if (!executablePath) {
        logger.error('Failed to find headless shell path.');
        return [];
    }

    const browser: Browser = await chromium.launch({
        headless: !SHOW_BROWSER,
        executablePath,
    });

    logger.info("Creating browser context...");
    const context = await browser.newContext();

    logger.info("Opening a new page...");
    const page: Page = await context.newPage();

    logger.info("Navigating to Google...");
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

    logger.info("Checking for cookie consent prompt...");
    try {
        await page.click('button[aria-label="Accept all"]', { timeout: 3000 });
        logger.info("Cookie consent accepted.");
    } catch (e) {
        logger.info("No cookies prompt found.");
    }

    logger.info(`Performing search for query: "${query}"`);
    await page.fill('textarea.gLFyf', query);
    logger.info("Search query filled.");

    const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
    logger.info(`Waiting for ${delay}ms before submitting search...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    await page.press('textarea.gLFyf', 'Enter');
    logger.info("Search submitted, waiting for results...");

    try {
        await page.waitForSelector('#search', { timeout: 5000 });
        logger.info("Search results loaded.");
    } catch (e) {
        logger.error("Search results did not load within the timeout.");
        await browser.close();
        throw new Error("Search results did not load.");
    }

    const results: SearchResult[] = [];

    const extractResults = async (): Promise<void> => {
        logger.info("Extracting ads...");
        const ads: SearchResult[] = await page.$$eval('div[data-text-ad], .uEierd', (ads) =>
            ads.map((ad) => {
                const link = ad.querySelector('a') as HTMLAnchorElement | null;
                const descriptionElement = ad.querySelector('.MUxGbd') as HTMLElement | null;
                return {
                    title: link?.innerText || 'No title',
                    description: descriptionElement?.innerText || 'No description',
                    url: link?.href || '',
                    isAd: true,
                    retrievedAt: new Date().toISOString(),
                    searchEngine: "Google",
                };
            })
        );
        logger.info(`Extracted ${ads.length} ads.`);

        logger.info("Extracting organic results...");
        const organic: SearchResult[] = await page.$$eval('#search .tF2Cxc', (results) =>
            results.map((result) => {
                const link = result.querySelector('a') as HTMLAnchorElement | null;
                const titleElement = result.querySelector('h3') as HTMLElement | null;
                const descriptionElement = result.querySelector('.VwiC3b') as HTMLElement | null;
                return {
                    title: titleElement?.innerText || 'No title',
                    description: descriptionElement?.innerText || 'No description',
                    url: link?.href || '',
                    isAd: false,
                    retrievedAt: new Date().toISOString(),
                    searchEngine: "Google",
                };
            })
        );
        logger.info(`Extracted ${organic.length} organic results.`);

        results.push(...ads, ...organic);
    };

    for (let i = 0; i < maxPages; i++) {
        logger.info(`Scraping page ${i + 1}...`);
        await extractResults();

        logger.info("Checking for next page...");
        const nextPageButton = await page.$('a#pnnext');
        if (!nextPageButton) {
            logger.info('No more pages available.');
            break;
        }

        const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
        logger.info(`Waiting for ${delay}ms before navigating to the next page...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        logger.info("Navigating to next page...");
        await nextPageButton.click();
        logger.info("Waiting for next page to load...");
        try {
            await page.waitForSelector('#search', { timeout: 5000 });
            logger.info("Next page loaded.");
        } catch (e) {
            logger.error("Next page did not load within the timeout.");
            break;
        }
    }

    logger.info("Removing duplicate URLs...");
    const uniqueResults = Array.from(
        new Map(results.map((result) => [result.url, result])).values()
    );

    for (let i = 0; i < uniqueResults.length; i++) {
        uniqueResults[i].searchQuery = query;
        uniqueResults[i].position    = i + 1;
    }

    logger.info(`Filtered duplicates. Unique results count: ${uniqueResults.length}`);

    logger.info("Closing browser...");
    await browser.close();

    logger.info(`Scraping completed. Total results: ${uniqueResults.length}`);
    return uniqueResults;
}