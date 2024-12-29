import { app } from "electron";
import { ScourFile } from "../scourFormat";
import logger from "../logger";
import { writeScourFile } from "../scourFileUtils";
import {
    DEFAULT_MODE,
    DEFAULT_LLM_PROVIDER,
    DEFAULT_MODEL_NAME,
    DEFAULT_NUM_QUERIES,
    DEFAULT_NUM_RESULTS_PER_QUERY,
    DEFAULT_SEARCH_ENGINE,
} from "../defaults";
import { loadPreference } from "../preferences";

export function createScourFile(outputFile: string): ScourFile | null {
    try {
        const appVersion = app.getVersion();

        const scourFile: ScourFile = {
            mode: DEFAULT_MODE,
            llmProvider: DEFAULT_LLM_PROVIDER,
            model: DEFAULT_MODEL_NAME,
            ollamaUrl: loadPreference('ollamaHost')  || "http://localhost",
            ollamaPort: loadPreference('ollamaPort') || 11434,
            currentSearchQueryIndex: null,
            currentSearchResultIndex: null,
            createdAt: new Date().toISOString(),
            numQueries: DEFAULT_NUM_QUERIES,
            numResultsPerQuery: DEFAULT_NUM_RESULTS_PER_QUERY,
            appVersion,
            searchEngine: DEFAULT_SEARCH_ENGINE,
            objective: null,
            searchQueries: [],
            searchResults: [],
            columns: [],
            rows: [],
        };

        writeScourFile(outputFile, scourFile);
        logger.info(`Initialized Scour file at ${outputFile}`);
        return scourFile;
    } catch (error) {
        let errorMessage = "Unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        logger.error(`Failed to create Scour file: ${errorMessage}`);
        return null;
    }
}