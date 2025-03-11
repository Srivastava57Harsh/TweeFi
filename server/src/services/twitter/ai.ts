import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({
  path: resolve(__dirname, "../../../.env"),
});

export const getAIRecommendation = async (text: string): Promise<string> => {
  try {
    // Add request validation and retry logic
    if (!text || typeof text !== "string") {
      throw new Error("Invalid input: text must be a non-empty string");
    }

    const AI_API_URL = process.env.AI_API_URL || "http://localhost:8081/api";

    // Add context about token claims to the prompt
    const enhancedPrompt = `
User tweet: ${text}

Context: You are a helpful AI assistant for a crypto project. When users mention you, 
you should respond to their questions and also encourage them to claim their tokens.
Keep responses concise and friendly. Don't include URLs in your response as they will be 
added automatically.
`;

    const { data } = await axios.post(
      `${AI_API_URL}/invoke`,
      {
        prompt: enhancedPrompt,
      },
      {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!data || !data.message) {
      throw new Error("Invalid response from AI service");
    }

    return data.message;
  } catch (err) {
    console.error("❌ Failed to get AI recommendation:", err);
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNREFUSED") {
        console.error("AI service is not running");
      } else if (err.response) {
        console.error(
          "AI service error:",
          err.response.status,
          err.response.data
        );
      }
    }
    return "Thanks for reaching out! I'd be happy to help you claim your tokens.";
  }
};
