import logger from "../util/logger";
import fs from "fs";
import { runSearch } from "../util/stages/runSearch";
import { parseCliArgs } from "../util/parseCliArgs";

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
        await runSearch(outputFile);
    }
}

main().catch((error) => {
    logger.error("An error occurred during execution:");
    logger.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
});