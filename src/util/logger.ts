import path from "path";

const colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    white: "\x1b[37m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    bold: "\x1b[1m",
};

const levelColors: Record<string, string> = {
    debug: colors.blue,
    info: colors.white,
    warn: `${colors.yellow}${colors.bold}`,
    error: `${colors.red}${colors.bold}`,
};

function getContext(): string {
    const err = new Error();
    const stack = err.stack?.split("\n") || [];
    const relevantStack = stack.find(
        (line) => !line.includes("logger.ts") && line.includes(".ts")
    );

    if (!relevantStack) return "(unknown context)";

    const match = relevantStack.match(/at\s+(.*):(\d+):\d+/);
    if (!match) return "(unknown context)";

    const filePath = match[1];
    const lineNumber = match[2];
    const fileName = path.basename(filePath);

    return `${fileName}:${lineNumber}`;
}

function log(level: string, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const paddedLevel = level.toUpperCase().padStart(7, " ");
    const colorize = levelColors[level.toLowerCase()] || colors.reset;

    context = context || getContext();
    const fileName = context.split(":")[0].padStart(24, " ");
    const lineNumber = context.split(":")[1]?.padStart(5, "0") || "00000";

    console.log(
        `${colorize}[${timestamp}] [${paddedLevel}] ${fileName}:${lineNumber} ${message}${colors.reset}`
    );
}

const logger = {
    info: (message: string, context?: string) => log("info", message, context),
    warn: (message: string, context?: string) => log("warn", message, context),
    error: (message: string, context?: string) => log("error", message, context),
    debug: (message: string, context?: string) => log("debug", message, context),
    getContext,
};

export default logger;