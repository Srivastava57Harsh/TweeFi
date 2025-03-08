import { Aptos, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import { LocalSigner } from "move-agent-kit";
import { AgentRuntime, createAptosTools } from "move-agent-kit";
import { aptosConfig } from "../config/aptos.config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { PrivateKey } from "@aptos-labs/ts-sdk";
import { PrivateKeyVariants } from "@aptos-labs/ts-sdk";

export class AptosService {
    private aptos: Aptos;
    private agent!: AgentRuntime;
    private llmAgent: any;

    constructor() {
        this.aptos = new Aptos(aptosConfig);
        this.initialize();
    }

    private async initialize() {
        try {
            // const privateKeyBytes = new TextEncoder().encode(process.env.APTOS_PRIVATE_KEY!);
            // const privateKey = new Ed25519PrivateKey(privateKeyBytes);
            // const account = await this.aptos.deriveAccountFromPrivateKey({ privateKey });

            const account = await this.aptos.deriveAccountFromPrivateKey({
                privateKey: new Ed25519PrivateKey(
                    PrivateKey.formatPrivateKey(
                        process.env.APTOS_PRIVATE_KEY!,
                        PrivateKeyVariants.Ed25519,
                    ),
                ),
            });
            const signer = new LocalSigner(account, Network.TESTNET);
            this.agent = new AgentRuntime(signer, this.aptos, {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY
            });

            const tools = createAptosTools(this.agent);

            const llm = new ChatOpenAI({
                modelName: "gpt-4",
                temperature: 0.7,
            });

            const memory = new MemorySaver();

            this.llmAgent = createReactAgent({
                llm,
                tools,
                checkpointSaver: memory,
                messageModifier: `
                    You are a helpful agent that can interact with the Aptos blockchain using Move Agent Kit.
                    Your primary task is to process user requests for token transfers. You should:
                    1. Validate the receiver address format
                    2. Confirm the transfer amount is valid
                    3. Execute the transfer using the appropriate tool
                    4. Return clear success/failure messages
                    Be concise and precise in your responses.
                `,
            });
        } catch (error) {
            console.error("Failed to initialize Aptos service:", error);
            throw error;
        }
    }

    async processTransferRequest(prompt: string): Promise<string> {
        try {
            const stream = await this.llmAgent.stream(
                {
                    messages: [
                        new HumanMessage(
                            `Context: ${prompt}`
                        ),
                    ],
                }
            );

            let response = "";
            for await (const chunk of stream) {
                if ("agent" in chunk) {
                    response += chunk.agent.messages[0].content;
                } else if ("tools" in chunk) {
                    response += chunk.tools.messages[0].content;
                }
            }

            return response;
        } catch (error) {
            console.error("Failed to process request:", error);
            throw error;
        }
    }
}
