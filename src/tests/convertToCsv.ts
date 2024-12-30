import { parseCliArgs } from '../util/parseCliArgs';
import { convertToCsv } from '../util/stages/convertToCsv';
import path from 'path';

const args = parseCliArgs();
if (!args.file) {
    console.error('Usage: npm run convert-to-csv -- --file=path/to/file.scour');
    process.exit(1);
}

const csvFilePath = path.join(
            path.dirname(args.file),
            `${path.basename(args.file, '.scour')}.csv`
        );

convertToCsv(args.file, csvFilePath);
