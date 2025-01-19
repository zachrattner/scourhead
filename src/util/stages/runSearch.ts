import fs from "fs";
import { searchBing } from "../searchProviders/searchBing";
import { searchDuckDuckGo } from "../searchProviders/searchDuckDuckGo";
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

    scourFile.currentSearchQueryIndex = 0;
    for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        const pageEstimate = Math.ceil(numResultsPerQuery / 10) + 2;
        logger.info(`Searching for query: "${query}", page count: ${pageEstimate}`);
        try {
            let results = [];

            switch (searchEngine) {
                case 'Bing':
                    results = await searchBing(query, pageEstimate, outputFile);
                    break;

                case 'DuckDuckGo':
                    results = await searchDuckDuckGo(query, numResultsPerQuery, outputFile);
                    break;                    
        
                case 'Google':
                    results = await searchGoogle(query, pageEstimate, outputFile);
                    break;
        
                default:
                    logger.error(`Unsupported search engine: ${scourFile.searchEngine}`);
                    return;
            }

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