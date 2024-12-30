import { promises as fs } from 'fs';
import { json2csv } from 'json-2-csv';
import { readScourFile } from '../scourFileUtils';

export async function convertToCsv(scourFilePath: string, csvFilePath: string): Promise<void> {
    try {
        if (!scourFilePath.endsWith('.scour')) {
            throw new Error('Input file must have a .scour extension.');
        }

        const jsonData = readScourFile(scourFilePath);
        if (!Array.isArray(jsonData.rows) || !Array.isArray(jsonData.columns)) {
            throw new Error('The .scour file must contain "rows" and "columns" arrays.');
        }

        const columnMappings = jsonData.columns.map((col: any) => ({ key: col.key, name: col.name }));
        columnMappings.push({ key: 'url', name: 'URL' });

        const reorderedRows = jsonData.rows.map((row: any) => {
            const reorderedRow: Record<string, any> = {};
            columnMappings.forEach(({ key, name }) => {
                reorderedRow[name] = row[key] || '';
            });
            return reorderedRow;
        });

        const headers = columnMappings.map(({ name }) => name);
        const csvData = json2csv(reorderedRows, { keys: headers });
        await fs.writeFile(csvFilePath, csvData, 'utf-8');
        console.log(`CSV file has been saved to ${csvFilePath}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error('An unexpected error occurred');
        }
    }
}