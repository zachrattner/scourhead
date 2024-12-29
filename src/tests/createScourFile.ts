// npm run create-scour-file -- --file speak.scour

import fs from "fs";
import logger from "../util/logger";
import { parseCliArgs } from "../util/parseCliArgs";
import { createScourFile } from "../util/stages/createScourFile";

async function main() {
    const args = parseCliArgs();

    const outputFile = args.file || "output.scour";

    logger.info(`Output file: ${outputFile}`);
    if (fs.existsSync(outputFile)) {
        logger.error(`Scour file ${outputFile} already exists - aborting.`);
    }
    else {
        createScourFile(outputFile);
    }
}

main().catch((error) => {
    logger.error("An error occurred during execution:");
    logger.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
});