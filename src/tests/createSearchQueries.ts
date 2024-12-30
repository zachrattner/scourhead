// npm run create-search-queries -- --file speak-london.scour

import fs from "fs";
import logger from "../util/logger";
import { parseCliArgs } from "../util/parseCliArgs";
import { generateQueries } from "../util/stages/generateQueries";

async function main() {
    const args = parseCliArgs();

    const query = args.query;
    const outputFile = args.file || "output.scour";

    logger.info(`Query: ${query}`);
    logger.info(`Output file: ${outputFile}`);

    if (!fs.existsSync(outputFile)) {
        logger.error(`Scour file not found: ${outputFile}`);
    }
    else {
        await generateQueries(outputFile);
    }
}

main().catch((error) => {
    logger.error("An error occurred during execution:");
    logger.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
});