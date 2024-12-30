import fs from "fs";
import { searchGoogle } from "../searchProviders/searchGoogle";
import logger from "../logger";
import { ScourFile } from "../scourFormat";
import { readScourFile, writeScourFile} from "../scourFileUtils";
import { DEFAULT_SEARCH_ENGINE } from "../defaults";

export async function runSearch(outputFile: string) {
    if (!fs.existsSync(outputFile)) {
        logger.error(`Scour file "${outputFile}" does not exist.`);
        return;
    }

    logger.info(`Loading Scour file: ${outputFile}`);
    const scourFile: ScourFile = readScourFile(outputFile);

    if (scourFile.searchEngine !== DEFAULT_SEARCH_ENGINE) {
        logger.error(`Unsupported search engine: ${scourFile.searchEngine}`);
        return;
    }

    const { searchQueries, numResultsPerQuery } = scourFile;

    scourFile.currentSearchQueryIndex = 0;
    for (const query of searchQueries) {
        const pageEstimate = Math.ceil(numResultsPerQuery / 10) + 2;
        logger.info(`Searching for query: "${query}", page count: ${pageEstimate}`);
        try {
            const results = await searchGoogle(query, pageEstimate);
            logger.info(`Found ${results.length} results for query: "${query}"`);

            const filteredResults = results.slice(0, numResultsPerQuery);
            logger.info(`Saving ${filteredResults.length} results for query: "${query}"`);

            scourFile.searchResults.push(...filteredResults);
            writeScourFile(outputFile, scourFile); // Write each loop to save in case of an abort
            scourFile.currentSearchQueryIndex++;
        } catch (error) {
            logger.error(`Failed to search query "${query}": ${error}`);
        }
    }

    logger.info(`Saving updated Scour file: ${outputFile}`);
    writeScourFile(outputFile, scourFile);
    logger.info(`Scour file updated: ${outputFile}`);
}