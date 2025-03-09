import {
  Aptos,
  Network,
  AptosConfig,
  Account,
  PrivateKey,
  PrivateKeyVariants,
  Ed25519PrivateKey,
  Deserializer,
  RawTransaction,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";

globalThis.Aptos = Aptos;
globalThis.Network = Network;
globalThis.AptosConfig = AptosConfig;
globalThis.Account = Account;
globalThis.PrivateKey = PrivateKey;
globalThis.PrivateKeyVariants = PrivateKeyVariants;
globalThis.Ed25519PrivateKey = Ed25519PrivateKey;
globalThis.Deserializer = Deserializer;
globalThis.RawTransaction = RawTransaction;
globalThis.SimpleTransaction = SimpleTransaction;
