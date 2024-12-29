// npm run parse-pages -- --file moving.scour

import logger from "../util/logger";
import { parseCliArgs } from "../util/parseCliArgs";
import { parsePages } from "../util/stages/parsePages";

async function main() {
    const args = parseCliArgs();
    const outputFile = args.file || "output.scour";
    
    logger.info(`Output file: ${outputFile}`);
    await parsePages(outputFile);
}

main().catch((error) => {
    logger.error("An error occurred during execution:");
    logger.error(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
});