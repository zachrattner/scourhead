import { chromium, Browser, Page } from 'playwright';
import logger from '../logger';
import { SearchResult } from "../scourFormat";
import { determineHeadlessShellPath } from '../determineHeadlessShellPath';
import { stealthifyPlaywright } from '../stealthifyPlaywright';
import { readScourFile, writeScourFile } from '../scourFileUtils';

const SHOW_BROWSER = false;

export async function searchGoogle(query: string, maxPages: number = 1, outputFilePath: string): Promise<SearchResult[]> {
    logger.info("Launching browser...");
    const executablePath = determineHeadlessShellPath();

    const scourFile = readScourFile(outputFilePath);

    if (!executablePath) {
        logger.error('Failed to find headless shell path.');
        scourFile.statusMessage = 'Failed to find path to Chromium. Please make sure Chromium is installed correctly via Playwright.';
        writeScourFile(outputFilePath, scourFile);
        return [];
    }

    try {
        const browser: Browser = await chromium.launch({
            headless: !SHOW_BROWSER,
            executablePath,
        });

        logger.info("Creating browser context...");
        scourFile.statusMessage = 'Starting browser...';
        writeScourFile(outputFilePath, scourFile);
        const context = await stealthifyPlaywright(browser);

        logger.info("Opening a new page...");
        scourFile.statusMessage = 'Opening a new page...';
        writeScourFile(outputFilePath, scourFile);
        const page: Page = await context.newPage();

        logger.info("Navigating to Google...");
        scourFile.statusMessage = 'Navigating to Google...';
        writeScourFile(outputFilePath, scourFile);
        await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

        logger.info("Checking for cookie consent prompt...");
        scourFile.statusMessage = 'Checking for cookie consent prompt...';
        writeScourFile(outputFilePath, scourFile);
        try {
            await page.click('button[aria-label="Accept all"]', { timeout: 3000 });
            logger.info("Cookie consent accepted.");
            scourFile.statusMessage = 'Cookie consent accepted...';
            writeScourFile(outputFilePath, scourFile);
        } catch (e) {
            logger.info("No cookie prompt found.");
            scourFile.statusMessage = 'No cookie prompt found...';
            writeScourFile(outputFilePath, scourFile);
        }

        logger.info(`Performing search for query: "${query}"`);
        scourFile.statusMessage = `Performing search for query: "${query}"`;
        writeScourFile(outputFilePath, scourFile);

        await page.fill('textarea.gLFyf', query);
        logger.info("Search query filled.");

        const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
        logger.info(`Waiting ${delay} ms before submitting search...`);
        scourFile.statusMessage = `Waiting ${delay} ms before submitting search...`;
        writeScourFile(outputFilePath, scourFile);
        await new Promise(resolve => setTimeout(resolve, delay));

        await page.press('textarea.gLFyf', 'Enter');
        logger.info("Search submitted, waiting for results...");
        scourFile.statusMessage = `Search submitted, waiting for results...`;
        writeScourFile(outputFilePath, scourFile);

        try {
            await page.waitForSelector('#search', { timeout: 5000 });
            logger.info("Search results loaded.");
            scourFile.statusMessage = `Search results loaded.`;
            writeScourFile(outputFilePath, scourFile);
        } catch (e) {
            logger.error("Search results did not load within the timeout.");
            scourFile.statusMessage = `Search results did not load within the timeout period.`;
            writeScourFile(outputFilePath, scourFile);
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
            scourFile.statusMessage = `Extracted ${ads.length} ads.`;
            writeScourFile(outputFilePath, scourFile);
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
            scourFile.statusMessage = `Extracted ${organic.length} organic results.`;
            writeScourFile(outputFilePath, scourFile);

            results.push(...ads, ...organic);
        };

        for (let i = 0; i < maxPages; i++) {
            logger.info(`Scraping page ${i + 1}...`);
            scourFile.statusMessage = `Scraping page ${i + 1}...`;
            writeScourFile(outputFilePath, scourFile);
            await extractResults();

            logger.info("Checking for next page...");
            const nextPageButton = await page.$('a#pnnext');
            if (!nextPageButton) {
                logger.info('No more pages available.');
                break;
            }

            const nextPage = Math.min(i + 2, maxPages);

            const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
            logger.info(`Waiting ${delay} ms before navigating to page ${nextPage}...`);
            scourFile.statusMessage = `Waiting ${delay} ms before navigating to page ${nextPage}...`;
            writeScourFile(outputFilePath, scourFile);
            await new Promise(resolve => setTimeout(resolve, delay));

            logger.info("Navigating to next page...");
            scourFile.statusMessage = `Navigating to page ${nextPage}...`;
            writeScourFile(outputFilePath, scourFile);
            await nextPageButton.click();
            logger.info("Waiting for next page to load...");
            scourFile.statusMessage = `Waiting for page ${nextPage} to load...`;
            writeScourFile(outputFilePath, scourFile);
            try {
                await page.waitForSelector('#search', { timeout: 5000 });
                logger.info("Next page loaded.");
                scourFile.statusMessage = `Page ${nextPage} loaded.`;
                writeScourFile(outputFilePath, scourFile);
            } catch (e) {
                logger.error("Next page did not load within the timeout.");
                scourFile.statusMessage = `Page ${nextPage} did not load within the timeout period.`;
                writeScourFile(outputFilePath, scourFile);
                break;
            }
        }

        logger.info("Removing duplicate URLs...");
        scourFile.statusMessage = `Removing duplicate URLs...`;
        writeScourFile(outputFilePath, scourFile);
        const uniqueResults = Array.from(
            new Map(results.map((result) => [result.url, result])).values()
        );

        for (let i = 0; i < uniqueResults.length; i++) {
            uniqueResults[i].searchQuery = query;
            uniqueResults[i].position    = i + 1;
        }

        logger.info(`Filtered duplicates. Unique results count: ${uniqueResults.length}`);
        scourFile.statusMessage = `Filtered duplicates. Unique results count: ${uniqueResults.length}`;
        writeScourFile(outputFilePath, scourFile);

        logger.info("Closing browser...");
        scourFile.statusMessage = `Closing browser...`;
        writeScourFile(outputFilePath, scourFile);
        await browser.close();

        logger.info(`Search completed: ${query}. Total results: ${uniqueResults.length}`);
        scourFile.statusMessage = `Search completed: ${query}. Total results: ${uniqueResults.length}`;
        writeScourFile(outputFilePath, scourFile);
        return uniqueResults;
    }
    catch (e) {
        scourFile.statusMessage = `Failed to launch Chromium. Please make sure Chromium is installed correctly via Playwright.`;
        writeScourFile(outputFilePath, scourFile);
        return [];
    }
}