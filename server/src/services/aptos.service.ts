import {
  Aptos,
  Ed25519PrivateKey,
  Network,
  PrivateKey,
  PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { LocalSigner } from "move-agent-kit";
// import { VerifySignatureArgs } from "@aptos-labs/ts-sdk";
import { AgentRuntime, createAptosTools } from "move-agent-kit";
import { aptosConfig } from "../config/aptos.config.js";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
// import { MemorySaver } from "@langchain/langgraph";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import dotenv from "dotenv";
// Convert ESM module URL to filesystem path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({
  path: resolve(__dirname, "../../../.env"),
});

export class AptosService {
  private aptos: Aptos;
  private agent!: AgentRuntime;
  private llmAgent!: ReturnType<typeof createReactAgent>; // Dynamically inferred type

  constructor() {
    this.aptos = new Aptos(aptosConfig);
    this.initialize();
  }

  private async initialize() {
    try {
      console.log("Initializing Aptos service...");

      const account = await this.aptos.deriveAccountFromPrivateKey({
        privateKey: new Ed25519PrivateKey(
          PrivateKey.formatPrivateKey(
            process.env.APTOS_PRIVATE_KEY!,
            PrivateKeyVariants.Ed25519
          )
        ),
      });
      console.log("Account derived successfully");

      const signer = new LocalSigner(account, Network.TESTNET);
      this.agent = new AgentRuntime(signer, this.aptos, {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      });
      console.log("Agent runtime initialized");

      const tools = createAptosTools(this.agent);
      console.log("Aptos tools created:", tools.map((t) => t.name).join(", "));

      const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
      });

      this.llmAgent = createReactAgent({
        llm,
        tools,
        messageModifier: `
                    You are a helpful agent that can interact with the Aptos blockchain using Move Agent Kit.
                    You have access to various tools for interacting with the Aptos blockchain.
                    When responding to requests:
                    1. For balance inquiries: Use AptosBalanceTool and respond with "Your balance is X APT"
                    2. For transfers: Use AptosTransferTokenTool and respond with "Successfully transferred X APT to <address>"
                    3. For errors: Provide clear error messages starting with "Sorry, "
                    4. For token details: Use AptosGetTokenDetailTool and provide token information
                    5. For transactions: Use AptosTransactionTool to get transaction details
                    
                    Always be precise and include relevant details in your responses.
                    If you encounter any errors, explain what went wrong clearly.
                    Log all tool usage and their results.
                `,
      });
      console.log("LLM agent created and ready to process requests");
    } catch (error) {
      console.error("Failed to initialize Aptos service:", error);
      throw error;
    }
  }

  async processRequest(prompt: string): Promise<string> {
    try {
      console.log("Processing request:", prompt);
      const stream = await this.llmAgent.stream({
        messages: [new HumanMessage(prompt)],
      });

      let response = "";
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log("Agent response:", chunk.agent.messages[0].content);
          response = chunk.agent.messages[0].content;
        } else if ("tools" in chunk) {
          console.log("Tool execution:", chunk.tools.messages[0].content);
        }
      }

      console.log("Final response:", response);
      return response;
    } catch (error: unknown) {
      console.error("Failed to process request:", error);
      throw new Error(`Sorry, couldn't process your request: ${error}`);
    }
  }
}
