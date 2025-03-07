import { chromium, Browser, Page, LaunchOptions } from 'playwright';
import logger from '../logger';
import { SearchResult } from "../scourFormat";
import { determineHeadlessShellPath } from '../determineHeadlessShellPath';
import { stealthifyPlaywright } from '../stealthifyPlaywright';
import { readScourFile, writeScourFile } from '../scourFileUtils';

const SHOW_BROWSER = true;

function extractBareUrl(duckDuckGoUrl: string): string {
    if (duckDuckGoUrl.substring(0, 2) === '//') {
        duckDuckGoUrl = 'https:' + duckDuckGoUrl;
    }

    const url = new URL(duckDuckGoUrl);
    const params = new URLSearchParams(url.search);

    let targetUrl = params.get('uddg');
    if (!targetUrl) {
        return duckDuckGoUrl;
    }

    const extractedUrl = decodeURIComponent(targetUrl);
    return extractedUrl;
}

export async function searchDuckDuckGo(query: string, numResultsPerQuery: number = 1, outputFilePath: string): Promise<SearchResult[]> {
    logger.info("Launching browser...");
    let executablePath = null;

    // If the browser is to be shown, the headless shell path cannot be used.
    if (!SHOW_BROWSER) {
        executablePath = determineHeadlessShellPath();
    }

    const scourFile = readScourFile(outputFilePath);

    if (!SHOW_BROWSER && !executablePath) {
        logger.error('Failed to find headless shell path.');
        scourFile.statusMessage = 'Failed to find path to Chromium. Please make sure Chromium is installed correctly via Playwright.';
        writeScourFile(outputFilePath, scourFile);
        return [];
    }

    try {
        const options: LaunchOptions = {
            headless: !SHOW_BROWSER,
        };

        if (!SHOW_BROWSER && executablePath) {
            options.executablePath = executablePath;
        }

        const delay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
        logger.info(`Waiting ${delay} ms before launching Chromium...`);
        scourFile.statusMessage = `Waiting ${delay} ms before launching Chromium...`;
        writeScourFile(outputFilePath, scourFile);
        await new Promise(resolve => setTimeout(resolve, delay));        

        const browser: Browser = await chromium.launch(options);

        logger.info("Creating browser context...");
        scourFile.statusMessage = 'Starting browser...';
        writeScourFile(outputFilePath, scourFile);
        const context = await stealthifyPlaywright(browser);

        logger.info("Opening a new page...");
        scourFile.statusMessage = 'Opening a new page...';
        writeScourFile(outputFilePath, scourFile);
        const page: Page = await context.newPage();

        // ALGORITHM:
        // 1. Navigate to https://html.duckduckgo.com/html/
        // 2. Locate the search input and type the query
        // 3. Locate the search button and click it
        logger.info("Navigating to DuckDuckGo...");
        scourFile.statusMessage = 'Navigating to DuckDuckGo...';
        writeScourFile(outputFilePath, scourFile);
        await page.goto(`https://html.duckduckgo.com/html/`, { waitUntil: 'domcontentloaded' });

        // Locate the search input field and type the query
        const searchInputSelector = 'input[name="q"]#search_form_input_homepage.search__input';
        await page.waitForSelector(searchInputSelector, { timeout: 5000 });
        await page.fill(searchInputSelector, query);

        // Locate the search button and click it
        const searchButtonSelector = 'input[name="b"]#search_button_homepage.search__button.search__button--html';
        await page.waitForSelector(searchButtonSelector, { timeout: 5000 });
        await Promise.all([
            page.click(searchButtonSelector),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);

        try {
            await page.waitForSelector('.results', { timeout: 5000 });
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
            logger.info("Extracting results...");
            const searchResults = await page.$$('.result');

            let newResults = 0;
            logger.info(`Found ${searchResults.length} results on this page.`);
            for (let i = 0; i < searchResults.length; i++) {
                const result = searchResults[i];

                const linkElement = await result.$('.result__title a');
                const titleElement = await result.$('.result__title');
                const descriptionElement = await result.$('.result__snippet');

                const title = titleElement ? await titleElement.innerText() : 'No title';
                const description = descriptionElement ? await descriptionElement.innerText() : 'No description';
                let rawUrl = linkElement ? await linkElement.getAttribute('href') : '';
                if (!rawUrl) {
                    rawUrl = '';
                }

                const url = rawUrl ? extractBareUrl(rawUrl) : '';
                newResults++;
                results.push({
                    title: title.trim(),
                    description: description.trim(),
                    url: url,
                    isAd: false,
                    retrievedAt: new Date().toISOString(),
                    searchEngine: 'DuckDuckGo',
                });
            }
            
            logger.info(`Extracted ${newResults} results, total now ${results.length}.`);
            scourFile.statusMessage = `Extracted ${newResults} results, total now ${results.length}.`;
            writeScourFile(outputFilePath, scourFile);
        };

        for (let i = 0; i < 100; i++) {
            logger.info(`Reading page ${i + 1}...`);
            scourFile.statusMessage = `Reading page ${i + 1}...`;
            writeScourFile(outputFilePath, scourFile);
            await extractResults();

            if (results.length >= numResultsPerQuery) {
                logger.info(`Collected enough results for query "${query}".`);
                scourFile.statusMessage = `Collected enough results for query "${query}".`;
                writeScourFile(outputFilePath, scourFile);
                break;
            }

            logger.info("Checking for next page...");
            const nextPageButton = await page.$('input[type=submit].btn');
            if (!nextPageButton) {
                logger.info('No more pages available.');
                break;
            }

            const nextPage = i + 2;

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
                await page.waitForSelector('.results', { timeout: 5000 });
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

        logger.info("Closing browser...");
        scourFile.statusMessage = `Closing browser...`;
        writeScourFile(outputFilePath, scourFile);
        await browser.close();

        logger.info(`Search completed: ${query}. Total results: ${results.length}`);
        scourFile.statusMessage = `Search completed: ${query}. Total results: ${results.length}`;
        writeScourFile(outputFilePath, scourFile);
        return results;
    }
    catch (e) {
        scourFile.statusMessage = `Failed to launch Chromium. Please make sure Chromium is installed correctly via Playwright.`;
        writeScourFile(outputFilePath, scourFile);
        return [];
    }
}