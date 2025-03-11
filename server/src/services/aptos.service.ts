import {
  Account,
  Aptos,
  AptosConfig,
  // Ed25519PrivateKey,
  Network,
  // PrivateKey,
  // PrivateKeyVariants,
  AccountAddress,
  AnyRawTransaction,
  AccountAuthenticator,
  Deserializer,
  RawTransaction,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import {
  // LocalSigner,
  BaseSigner,
} from "move-agent-kit";
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
import axios, { AxiosInstance } from "axios";
import { getCollablandApiUrl } from "../utils.js";

export type SignedTransactionResponse = {
  senderAuthenticator: AccountAuthenticator;
  signature?: Uint8Array<ArrayBufferLike>;
};

export class LitAptosSigner extends BaseSigner {
  private readonly _aptosClient: Aptos;
  private readonly _aptosAddress: string;
  private readonly _aptosPublicKey: string;
  private readonly _litCiphertext: string;
  private readonly _litDataToEncryptHash: string;
  private readonly _litIpfsHash: string;
  private readonly _axiosClient: AxiosInstance;
  /**
   * Initializes a new instance of the LitAptosSigner class. Uses Lit protocol to sign transactions on Aptos.
   * @param accountAddress - The account address of the signer
   * @param accountPublicKey - The public key of the signer
   * @param network - The Aptos network to connect to
   * @param ipfsHash - The IPFS hash of the Lit action
   * @param ciphertext - The encrypted data of the private key (for Lit protocol)
   * @param dataToEncryptHash - The hash of the data to encrypted data of the private key (for Lit protocol)
   */
  constructor(
    accountAddress: string,
    accountPublicKey: string,
    network: Network,
    ipfsHash: string,
    ciphertext: string,
    dataToEncryptHash: string
  ) {
    const config = new AptosConfig({ network });
    const client = new Aptos(config);
    const account = Account.generate(); // passing a random account, but won't be used
    super(account, client);
    this._aptosClient = client;
    this._aptosAddress = accountAddress;
    this._aptosPublicKey = accountPublicKey;
    this._litCiphertext = ciphertext;
    this._litDataToEncryptHash = dataToEncryptHash;
    this._litIpfsHash = ipfsHash;
    this._axiosClient = axios.create({
      baseURL: getCollablandApiUrl(),
      headers: {
        "X-API-KEY": process.env.COLLABLAND_API_KEY || "",
        "X-TG-BOT-TOKEN": process.env.TELEGRAM_BOT_TOKEN || "",
        "Content-Type": "application/json",
      },
      timeout: 5 * 60 * 1000,
    });
    console.log("[LitAptosSigner] initialized:");
    console.dir({
      _aptosAddress: this._aptosAddress,
      _litCiphertext: this._litCiphertext,
      _litDataToEncryptHash: this._litDataToEncryptHash,
      _litIpfsHash: this._litIpfsHash,
    });
  }
  getAddress(): AccountAddress {
    console.log("[LitAptosSigner] getAddress: %O", this._aptosAddress);
    return new AccountAddress(
      new Uint8Array(Buffer.from(this._aptosAddress.slice(2), "hex"))
    );
  }
  async signTransaction(
    transaction: AnyRawTransaction
  ): Promise<SignedTransactionResponse> {
    console.log("[LitAptosSigner] signTransaction: %O", transaction);
    const tx = transaction.rawTransaction.bcsToBytes();
    console.log("[LitAptosSigner] tx: %O", tx);
    const jsParams = {
      method: "signTransaction",
      ipfsCID: this._litIpfsHash,
      ciphertext: this._litCiphertext,
      dataToEncryptHash: this._litDataToEncryptHash,
      accountAddress: this._aptosAddress,
      publicKey: this._aptosPublicKey,
      toSign: Array.from(tx),
    };
    console.log("[LitAptosSigner] jsParams: %O", jsParams);
    try {
      const chainId = 8453; // does not matter here, but is an API constraint
      const { data } = await this._axiosClient.post(
        `/telegrambot/executeLitActionUsingPKP?chainId=${chainId}`,
        {
          actionIpfs: this._litIpfsHash,
          actionJsParams: jsParams,
        }
      );
      const response = JSON.parse(data?.response?.response);
      console.log("[LitAptosSigner] response: %O", response);
      const sig = new Deserializer(
        new Uint8Array(Buffer.from(response.signature.slice(2), "hex"))
      );
      console.log("[LitAptosSigner] sig: %O", sig);
      const senderAuthenticator = AccountAuthenticator.deserialize(sig);
      console.log(
        "[LitAptosSigner] senderAuthenticator: %O",
        senderAuthenticator
      );
      return {
        senderAuthenticator,
      };
    } catch (error) {
      console.error("[LitAptosSigner] Failed to sign transaction:", error);
      throw error;
    }
  }

  async sendTransaction(transaction: AnyRawTransaction) {
    console.log("[LitAptosSigner] sendTransaction: %O", transaction);
    const rawTx = transaction.rawTransaction;
    const newTx = new SimpleTransaction(
      new RawTransaction(
        rawTx.sender,
        rawTx.sequence_number,
        rawTx.payload,
        rawTx.max_gas_amount,
        rawTx.gas_unit_price,
        BigInt(Math.floor(Date.now() / 1000) + 5 * 60), // 5 minutes from now
        rawTx.chain_id
      )
    );
    const signedTx = await this.signTransaction(newTx);

    const submittedTx = await this._aptosClient.transaction.submit.simple({
      transaction: newTx,
      senderAuthenticator: signedTx.senderAuthenticator,
    });
    console.log("[LitAptosSigner] submittedTx: %O", submittedTx);
    const result = await this._aptosClient.waitForTransaction({
      transactionHash: submittedTx.hash,
    });
    console.log("[LitAptosSigner] result: %O", result);
    return result.hash;
  }

  async signMessage(message: string): Promise<string> {
    console.log("[LitAptosSigner] signMessage: %O", message);
    const jsParams = {
      method: "signMessage",
      ipfsCID: this._litIpfsHash,
      ciphertext: this._litCiphertext,
      dataToEncryptHash: this._litDataToEncryptHash,
      accountAddress: this._aptosAddress,
      publicKey: this._aptosPublicKey,
      toSign: Array.from(new TextEncoder().encode(message)),
    };
    console.log("[LitAptosSigner] jsParams: %O", jsParams);
    try {
      const chainId = 8453; // does not matter here, but is an API constraint
      const { data } = await this._axiosClient.post(
        `/telegrambot/executeLitActionUsingPKP?chainId=${chainId}`,
        {
          actionIpfs: this._litIpfsHash,
          actionJsParams: jsParams,
        }
      );
      const response = JSON.parse(data?.response?.response);
      console.log("[LitAptosSigner] response: %O", response);
      return response.signature;
    } catch (error) {
      console.error("[LitAptosSigner] Failed to sign message:", error);
      throw error;
    }
  }
}

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
      const ipfsCID = "QmSKuJA2zgjzE3MX5Eft5uKBwZMUpATrDdZXjjkSdqJSbS";
      const ciphertext =
        "oTXmYzNr0Wu6VSOT10DKtDjGcUYMmedO47WZ8Y7Ff2+cQqw4y01oYP6VIWtan1QtY5ZWRaOap055BNnFH42ZY+nBj3Nascy3yoraYYHxfRdDedoWzTEgsVuw6+9CiVuFHWsWgMjnG5NAsoX69bwfqwqXlpa/Rn5AQp8Eeq6aM7rGVGfAagDgfpk6Wwhy8l4QF9I8oAI=";
      const dataToEncryptHash =
        "42d8402d7fe88fdcdb5a8ce47d5f98fb74f9affeb20daa16d0c1bc45218e5910";
      const accountAddress =
        "0x0eee7b6daea7801baa6c144bb99ab79c2fcd75ce4014f822372c9d0c925673a0";
      const publicKey =
        "0x8803f0e2bf400ffe2a253f701a7d39eae95a02e3b5ec316f0aa73bb1efb2f66b";
      const signer = new LitAptosSigner(
        accountAddress,
        publicKey,
        Network.TESTNET,
        ipfsCID,
        ciphertext,
        dataToEncryptHash
      );

      // const account = await this.aptos.deriveAccountFromPrivateKey({
      //   privateKey: new Ed25519PrivateKey(
      //     PrivateKey.formatPrivateKey(
      //       process.env.APTOS_PRIVATE_KEY!,
      //       PrivateKeyVariants.Ed25519
      //     )
      //   ),
      // });
      // console.log("Account derived successfully");

      // const signer = new LocalSigner(account, Network.TESTNET);
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
