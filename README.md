# Scourhead

Scourhead is an open-source agentic AI application designed to streamline online research by automating tedious workflows. It leverages the Llama 3.2 LLM and Playwright for browser automation to deliver structured search results into a spreadsheet, mimicking how a skilled human would perform the research task.

[![AI Labels - Made by Humans with AI](https://ailabels.org/badges/AI%20Labels%20-%20Human%20and%20AI.svg "Made By Humans with AI")](https://ailabels.org)

## Features

- **Agentic AI Automation**: Define your research objective, and Scourhead handles the rest, from query generation to data extraction. Two agents review the search results, one for checking if the page is relevant, and a second to extract the requested fields in structured form.
- **Customizable Outputs**: Specify the data fields and format that meet your needs. The LLM parses the page and converts into the format you request.
- **Browser Automation**: Uses Playwright to navigate search results and extract data from relevant pages.
- **Local Execution**: Runs entirely on your machine with no backend server, ensuring your data stays private.
- **Lightweight**: Optimized to run efficiently on consumer-grade devices using Meta's Llama 3.2 (3B) model.

## File Structure

```
scourhead/
├── icons/            # Icons for the app
├── src/              # Source code
├── package.json      # Project metadata and dependencies
├── package-lock.json # Dependency tree lockfile
├── README.md         # Project documentation (this file)
├── tsconfig.json     # TypeScript configuration file
```

## Getting Started

### Prerequisites
- **Node.js**: Ensure you have Node.js installed on your machine.
- **Playwright**: The project uses Playwright for browser automation.
- **Ollama**: Required for running large language models locally.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/zachrattner/scourhead.git
   cd scourhead
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install headless Chromium browser from Playwright:
   ```bash
   ./download-chromium.sh
   ```
4. Ensure Ollama is installed and running.

## Usage
1. Define your objective. Tell Scourhead the context and goals just like you would a human assistant.
2. Review Scourhead's search query suggestions, and make edits if needed
3. Perform the search and review results in realtime as they come back
4. Process each page via LLM and review results in realtime
5. Export the results as CSV 

If you would like to review a completed project, open [sample.scour](examples/sample.scour) in Scourhead or review [sample.csv](examples/sample.csv) to see what an example export looks like.

## License
This project is licensed under the MIT License - see the `LICENSE` file for details.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request to propose improvements or report bugs.

## Disclaimers
1. I have never written an Electron app before. I might not have done things in an idiomatic way. 
2. I limited myself to develop only during the week of Christmas between family obligations. There is a lot that could be improved and I just haven't had time yet.
3. The output format might not 100% match what you requested. LLMs are not perfect. Just think of all the time you are not spending manually searching when you are making corrections 😎
4. I've been told some search engines don't like being used this way. You're responsible for what you do with this app. 

## Contact
Feel free to [join Scourhead on Discord](https://discord.gg/N9NKfSDWme) or [hit me up on LinkedIn](https://linkedin.com/in/zachrattner).

## Copyright
(c) 2024-present Worthwhile Adventures LLC
