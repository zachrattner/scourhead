import fs from "fs";
import { ScourFile } from "./scourFormat";

export function readScourFile(outputFile: string) : ScourFile {
    return JSON.parse(fs.readFileSync(outputFile, "utf-8"));
}

export function writeScourFile(outputFile: string, scourFile: ScourFile) {
    fs.writeFileSync(outputFile, JSON.stringify(scourFile, null, 4), "utf-8");
}