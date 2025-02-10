import { createMessages, runLlm, Format } from "../llmProviders/ollama";
import { ScourFile } from "../scourFormat";
import logger from "../logger";
import { readScourFile, writeScourFile } from "../scourFileUtils";

const systemPrompt =
    "You are a research assistant skilled at generating Google search queries. Brainstorm 10 to 20 variations that will provide useful results when I give you an objective. Provide only the search queries without any other information.";

const format: Format = {
    type: "object",
    properties: {
        queries: {
            type: "array",
        },
    },
    required: ["queries"],
};

export async function generateQueries(outputFile: string) {
    try {
        const scourFile: ScourFile = readScourFile(outputFile);

        const { numQueries, searchQueries } = scourFile;
        const targetNumQueries = numQueries || 10;

        while (searchQueries.length < targetNumQueries) {
            logger.info(
                `Generating queries... Current count: ${searchQueries.length}, Target: ${targetNumQueries}`
            );

            const messages = createMessages(systemPrompt, scourFile.objective);
            const response = await runLlm(
                scourFile.model, messages, format,
                scourFile.ollamaUrl || undefined,
                scourFile.ollamaPort?.toString() || undefined);

            if (!response) {
                logger.error("No response from the LLM.");
                throw new Error("Failed to get a response from the LLM.");
            }

            const parsedResponse = JSON.parse(response);
            if (!parsedResponse.queries) {
                logger.error("Failed to parse LLM response.");
                throw new Error("LLM response did not include queries.");
            }

            const uniqueQueries = parsedResponse.queries.filter(
                (newQuery: string) => !searchQueries.includes(newQuery)
            );

            searchQueries.push(...uniqueQueries);

            if (searchQueries.length > targetNumQueries) {
                searchQueries.splice(targetNumQueries);
            }

            logger.info(`Updated query count: ${searchQueries.length}`);
        }

        // Remove duplicates from searchResults
        scourFile.searchQueries = Array.from(new Set(searchQueries));
        writeScourFile(outputFile, scourFile);
        logger.info(`Scour file updated with ${searchQueries.length} queries at ${outputFile}`);
    } catch (error) {
        logger.error("Error occurred while generating queries:");
        if (error instanceof Error) {
            logger.error(`Error Message: ${error.message}`);
            logger.error(`Error Stack: ${error.stack}`);
        } else {
            logger.error(`Unknown Error: ${error}`);
        }
    }
}
