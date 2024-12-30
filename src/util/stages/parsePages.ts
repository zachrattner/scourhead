import { createMessages, runLlm, Format } from "../llmProviders/ollama";
import { Column, ScourFile } from "../scourFormat";
import fs from "fs";
import logger from "../logger";
import { extractPlainText } from "../extractPlainText";
import { readScourFile, writeScourFile } from "../scourFileUtils";

const systemPrompt =
    "You are a diligent research assistant skilled at extracting structured data from text files.";

const validatorFormat: Format = {
    type: "object",
    properties: {
        relevant: {
            type: "boolean"
        }
    },
    required: ["relevant"]
};

function cleanOllamaJsonObject(ollamaResponse: string): Record<string, any> {
    const cleanJson = JSON.parse(ollamaResponse);

    for (const key in cleanJson) {
        if (cleanJson[key] === "null") {
            cleanJson[key] = null;
        }
    }

    return cleanJson;
}

function buildFormatObject(columns: Column[]): Format {
    const format: Format = {
        type: "object",
        properties: {},
        required: []
    };

    for (const column of columns) {
        format.properties[column.key] = {
            type: "string"
        };

        format.required.push(column.key);
    }

    return format;
}

function buildPrompt(columns: Column[], text: string): string {
    let prompt = `Please parse the following text into a JSON object. Reply with the JSON object and nothing else.\n\n`;
    let i = 1;
    for (const column of columns) {
        prompt += `${i++}. ${column.key}: ${column.description}\n`;
    }

    prompt += `\nIf you are not sure about a field, put a null response.\n`;
    prompt += `Here is the text:\n`;
    prompt += text;

    return prompt;
}

export async function parsePages(outputFile: string) {
    if (!fs.existsSync(outputFile)) {
        logger.error(`Scour file "${outputFile}" does not exist.`);
        process.exit(1);
    }

    logger.info(`Loading Scour file: ${outputFile}`);
    const scourFile: ScourFile = readScourFile(outputFile);

    if (!scourFile.searchResults.length) {
        logger.error(`No search results found in scourfile`);
        process.exit(1);
    }

    const format: Format = buildFormatObject(scourFile.columns);

    // Find the last processed URL
    const lastProcessedUrl = scourFile.rows.length
        ? scourFile.rows[scourFile.rows.length - 1].url
        : null;

    scourFile.currentSearchResultIndex = 0;
    if (lastProcessedUrl) {
        scourFile.currentSearchResultIndex = scourFile.searchResults.findIndex(
            (result) => result.url === lastProcessedUrl
        );
        if (scourFile.currentSearchResultIndex !== -1) scourFile.currentSearchResultIndex += 1; // Start with the next URL
    }

    // Maintain a set of existing URLs for quick uniqueness checks
    const existingUrls = new Set(scourFile.rows.map((row) => row.url));

    for (; scourFile.currentSearchResultIndex < scourFile.searchResults.length; scourFile.currentSearchResultIndex++) {
        const searchResult = scourFile.searchResults[scourFile.currentSearchResultIndex];

        // Skip URLs already in rows
        if (existingUrls.has(searchResult.url)) {
            logger.info(`Skipping already processed URL: ${searchResult.url}`);
            continue;
        }

        logger.info(`Parsing page: ${searchResult.url}`);
        const pageText = await extractPlainText(searchResult.url);
        if (!pageText) {
            logger.warn(`Failed to load page: ${searchResult.url}`);
            writeScourFile(outputFile, scourFile);
            continue;
        }

        logger.info(`Building prompt to determine if data is relevant...`);
        const validatorPrompt =
            `Is the provided text relevant to the objective stated? The text came from a web search while researching the objective.
             
            Objective:
             ${scourFile.objective}
             
             Text: 
             ${pageText}`;

        const validatorMessages = createMessages(systemPrompt, validatorPrompt);
        logger.info(`Querying LLM to validate data...`);
        const validatorResponse = await runLlm(scourFile.model, validatorMessages, validatorFormat);

        const parsedValidatorResponse = JSON.parse(validatorResponse);
        if (!parsedValidatorResponse.relevant) {
            logger.info(`Skipping page because it is not relevant: ${searchResult.url}`);
            writeScourFile(outputFile, scourFile);
            continue;
        }

        logger.info(`Building prompt to parse data...`);
        const query = buildPrompt(scourFile.columns, pageText);
        const messages = createMessages(systemPrompt, query);

        logger.info(`Querying LLM to parse data...`);
        const response = await runLlm(scourFile.model, messages, format);

        if (!response) {
            logger.warn(`Failed to parse page: ${searchResult.url}`);
            writeScourFile(outputFile, scourFile);
            continue;
        }

        const parsedResponse = cleanOllamaJsonObject(response);
        if (!parsedResponse) {
            logger.warn(`Failed to parse page: ${searchResult.url}`);
            writeScourFile(outputFile, scourFile);
            continue;
        }

        logger.info(`Building result object...`);

        if (scourFile.columns
            .filter(column => column.isRequired)
            .some(column => {
                const value = parsedResponse[column.key];
                return ((value === null) || (value.trim() === ''));
            })) {
            logger.warn("Skipping page because all required values are null or empty.");
            writeScourFile(outputFile, scourFile);
        }
        else {
            parsedResponse.url = searchResult.url;
            logger.info(`Result: ${JSON.stringify(parsedResponse)}`);

            // Add the unique URL to rows
            scourFile.rows.push(parsedResponse);
            existingUrls.add(searchResult.url); // Update the set
            writeScourFile(outputFile, scourFile);
        }
    }

    writeScourFile(outputFile, scourFile);
    logger.info(`Scour file updated: ${outputFile}`);
}
