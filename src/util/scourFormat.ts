export type Mode = "basic" | "advanced";

export type SearchEngine = "Google" | "Bing" | "Duck Duck Go" | "random";

export interface SearchResult {
    title: string;
    description: string;
    searchQuery?: string | null | undefined;
    position?: number | null | undefined;
    url: string;
    isAd: boolean;
    retrievedAt: string;
    accessedAt?: string | null | undefined;
    searchEngine: SearchEngine;
}

export interface Column {
    title: string;
    key: string;
    description?: string;
    isRequired: boolean;
}

export interface ScourFile {
    mode: Mode;
    llmProvider: string;
    model: string;
    ollamaUrl: string | null | undefined;
    ollamaPort: number | null | undefined;
    createdAt: string; // ISO 8601 date string
    appVersion: string;
    searchEngine: SearchEngine;
    objective: string | null | undefined;
    numQueries: number;
    numResultsPerQuery: number;
    currentSearchQueryIndex: number | null;
    currentSearchResultIndex: number | null;
    searchQueries: string[];
    searchResults: SearchResult[];
    columns: Column[];
    rows: Record<string, any>[]; // Objects with keys matching column keys
}