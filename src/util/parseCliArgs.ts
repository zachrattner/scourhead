export function parseCliArgs() {
    const args = process.argv.slice(2);
    const parsedArgs: Record<string, string | undefined> = {};
    args.forEach((arg, index) => {
        if (arg.startsWith("--")) {
            const key = arg.replace("--", "");
            parsedArgs[key] = args[index + 1];
        }
    });
    return parsedArgs;
}