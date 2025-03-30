import { chromium, Browser, Page, LaunchOptions } from 'playwright';
import logger from '../logger';
import { SearchResult } from "../scourFormat";
import { determineBrowserPath } from '../determineBrowserPath';
import { stealthifyPlaywright } from '../stealthifyPlaywright';
import { readScourFile, writeScourFile } from '../scourFileUtils';

export async function searchBing(query: string, maxPages: number = 1, outputFilePath: string): Promise<SearchResult[]> {
    logger.info("Launching browser...");
    let executablePath = null;

    executablePath = determineBrowserPath();

    const scourFile = readScourFile(outputFilePath);

    if (!executablePath) {
        logger.error('Failed to find Chromium path.');
        scourFile.statusMessage = 'Failed to find path to Chromium. Please make sure Chromium is installed correctly via Playwright.';
        writeScourFile(outputFilePath, scourFile);
        return [];
    }

    try {
        const options : LaunchOptions = {
            headless: false,
        };

        if (executablePath) {
            options.executablePath = executablePath;
        }

        const browser: Browser = await chromium.launch(options);

        logger.info("Creating browser context...");
        scourFile.statusMessage = 'Starting browser...';
        writeScourFile(outputFilePath, scourFile);
        const context = await stealthifyPlaywright(browser);

        logger.info("Opening a new page...");
        scourFile.statusMessage = 'Opening a new page...';
        writeScourFile(outputFilePath, scourFile);
        const page: Page = await context.newPage();

        logger.info("Navigating to Bing...");
        scourFile.statusMessage = 'Navigating to Bing...';
        writeScourFile(outputFilePath, scourFile);
        await page.goto(`https://www.bing.com/search?q=${query}`, { waitUntil: 'domcontentloaded' });

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

        try {
            await page.waitForSelector('#b_results', { timeout: 5000 });
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
            logger.info("Extracting organic results...");
            const organic: SearchResult[] = await page.$$eval('.b_algo', (results) =>
                results.map((result) => {
                    const link = result.querySelector('a') as HTMLAnchorElement | null;
                    const titleElement = result.querySelector('h2') as HTMLElement | null;
                    const descriptionElement = result.querySelector('.b_caption') as HTMLElement | null;
                    return {
                        title: titleElement?.innerText || 'No title',
                        description: descriptionElement?.innerText || 'No description',
                        url: link?.href || '',
                        isAd: false,
                        retrievedAt: new Date().toISOString(),
                        searchEngine: "Bing",
                    };
                })
            );

            logger.info(`Extracted ${organic.length} organic results.`);
            scourFile.statusMessage = `Extracted ${organic.length} organic results.`;
            writeScourFile(outputFilePath, scourFile);

            results.push(...organic);
        };

        for (let i = 0; i < maxPages; i++) {
            logger.info(`Reading page ${i + 1}...`);
            scourFile.statusMessage = `Reading page ${i + 1}...`;
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