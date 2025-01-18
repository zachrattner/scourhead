import fs from "fs";
import { searchBing } from "../searchProviders/searchBing";
import { searchGoogle } from "../searchProviders/searchGoogle";
import logger from "../logger";
import { ScourFile } from "../scourFormat";
import { readScourFile, writeScourFile} from "../scourFileUtils";
import { SUPPORTED_SEARCH_ENGINES } from "../defaults";

export async function runSearch(outputFile: string) {
    if (!fs.existsSync(outputFile)) {
        logger.error(`Scour file "${outputFile}" does not exist.`);
        return;
    }

    logger.info(`Loading Scour file: ${outputFile}`);
    let scourFile: ScourFile = readScourFile(outputFile);

    if (!SUPPORTED_SEARCH_ENGINES.includes(scourFile.searchEngine)) {
        logger.error(`Unsupported search engine: ${scourFile.searchEngine}`);
        return;
    }

    const { searchQueries, numResultsPerQuery, searchEngine } = scourFile;

    let searchFunction = null;
    switch (searchEngine) {
        case 'Bing':
            searchFunction = searchBing;
            break;

        case 'Google':
            searchFunction = searchGoogle;
            break;

        default:
            logger.error(`Unsupported search engine: ${scourFile.searchEngine}`);
            return;
    }

    scourFile.currentSearchQueryIndex = 0;
    for (const query of searchQueries) {
        const pageEstimate = Math.ceil(numResultsPerQuery / 10) + 2;
        logger.info(`Searching for query: "${query}", page count: ${pageEstimate}`);
        try {
            const results = await searchFunction(query, pageEstimate, outputFile);
            logger.info(`Found ${results.length} results for query: "${query}"`);
            scourFile = readScourFile(outputFile);

            const filteredResults = results.slice(0, numResultsPerQuery);
            logger.info(`Saving ${filteredResults.length} results for query: "${query}"`);

            scourFile.searchResults.push(...filteredResults);
            if ((scourFile.currentSearchQueryIndex !== undefined) && (scourFile.currentSearchQueryIndex !== null)) {
                scourFile.currentSearchQueryIndex++;
            }
            
            writeScourFile(outputFile, scourFile);
        } catch (error) {
            logger.error(`Failed to search query "${query}": ${error}`);
        }
    }

    logger.info(`Saving updated Scour file: ${outputFile}`);
    writeScourFile(outputFile, scourFile);
    logger.info(`Scour file updated: ${outputFile}`);
}