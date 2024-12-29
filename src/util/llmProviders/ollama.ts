import axios from "axios";

// Define the base URL of the Ollama API
const OLLAMA_API_BASE_URL = "http://localhost:11434";

type Role = "user" | "system" | "assistant";

interface Message {
    role: Role;
    content: string;
}

export type FormatType = "object" | "array" | "number" | "string" | "boolean";

export interface Format {
    type: "object";
    properties: Record<
        string,
        {
            type: FormatType;
        }
    >;
    required: string[];
}

export function createMessages(systemPrompt?: string, prompt?: string | null): Message[] {
    const messages: Message[] = [];

    if (systemPrompt) {
        messages.push({
            role: "system",
            content: systemPrompt,
        });
    }

    if (prompt) {
        messages.push({
            role: "user",
            content: prompt,
        });
    }

    return messages;
}

export async function runLlm(
    model: string,
    messages: Message[],
    format?: Format
): Promise<string> {
    try {
        const parameters = {
            model,
            messages,
            stream: false,
            options: {
                num_ctx: 10000
            },
            ...(format && { format }),
        };

        const response = await axios.post(
            `${OLLAMA_API_BASE_URL}/api/chat`,
            parameters,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const responseData = response.data;

        if (!responseData.message) {
            console.error("Invalid response from the Ollama API:", responseData);
            throw new Error("Failed to get a response from the LLM.");
        }

        return responseData.message.content;
    } catch (error) {
        console.error("Error calling the Ollama API:", error);

        if (error instanceof Error) {
            throw new Error(`Failed to get a response from the LLM: ${error.message}`);
        } else {
            throw new Error("Failed to get a response from the LLM: Unknown error occurred.");
        }
    }
}