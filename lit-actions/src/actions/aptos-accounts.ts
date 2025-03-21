/// <reference path="../global.d.ts" />

interface TwitterGetMeResponse {
  data: {
    id: string;
    name: string;
    username: string;
  };
}
const authenticate = async (
  _accessToken: string
): Promise<TwitterGetMeResponse | undefined> => {
  try {
    const response = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${_accessToken}`,
      },
    });
    if (response.ok) {
      const res = await response.json();
      console.log("Response from Twitter API:", res);
      return res;
    }
    console.error("Error authenticating user", response);
    return undefined;
  } catch (error) {
    console.error("Error authenticating user", error);
    return undefined;
  }
};

const encryptData = async (
  _data: Uint8Array,
  _ipfsCid: string,
  _twitterUserId: string,
  _accessToken: string
) => {
  const accessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "",
      parameters: [":currentActionIpfsId"],
      returnValueTest: {
        comparator: "=",
        value: _ipfsCid,
      },
    },
    { operator: "and" },
    {
      contractAddress: "ipfs://QmaLWKM4JSfFoegfa7LfDLkch9EYtTwY8zi2Ca8qeyzb2S",
      standardContractType: "LitAction",
      chain: "ethereum",
      method: "verifyXToken",
      parameters: [_accessToken],
      returnValueTest: {
        comparator: "=",
        value: _twitterUserId,
      },
    },
  ];
  console.log("accessControlConditions:", accessControlConditions);
  console.log("data:", _data);
  const { ciphertext, dataToEncryptHash } = await Lit.Actions.encrypt({
    accessControlConditions: accessControlConditions,
    to_encrypt: _data,
  });
  console.log("ciphertext: ", ciphertext);
  console.log("dataToEncryptHash: ", dataToEncryptHash);

  return { ciphertext, dataToEncryptHash };
};

const decryptData = async (
  _ciphertext: string,
  _dataToEncryptHash: string,
  _ipfsCid: string,
  _twitterUserId: string,
  _accessToken: string
) => {
  const accessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "",
      parameters: [":currentActionIpfsId"],
      returnValueTest: {
        comparator: "=",
        value: _ipfsCid,
      },
    },
    { operator: "and" },
    {
      contractAddress: "ipfs://QmaLWKM4JSfFoegfa7LfDLkch9EYtTwY8zi2Ca8qeyzb2S",
      standardContractType: "LitAction",
      chain: "ethereum",
      method: "verifyXToken",
      parameters: [_accessToken],
      returnValueTest: {
        comparator: "=",
        value: _twitterUserId,
      },
    },
  ];

  const decryptedData = await Lit.Actions.decryptToSingleNode({
    accessControlConditions: accessControlConditions,
    ciphertext: _ciphertext,
    dataToEncryptHash: _dataToEncryptHash,
    authSig: null,
    chain: "ethereum",
  });
  console.log("decryptedData: ", decryptedData);
  return decryptedData;
};

const go = async () => {
  if (!accessToken) {
    console.log("accessToken not found");
    Lit.Actions.setResponse({
      response: "accessToken not found",
    });
    return;
  }
  const userInfo = await authenticate(accessToken);
  if (!userInfo) {
    console.log("unable to authenticate user");
    Lit.Actions.setResponse({
      response: "unable to authenticate user",
    });
    return;
  }
  if (method === "createAccount") {
    const result = await Lit.Actions.runOnce(
      { waitForResponse: true, name: "encryptedPrivateKey" },
      async () => {
        const account = Account.generate();
        const accountAddress = account.accountAddress.toString();
        console.log("newAptosAccount: ", accountAddress);
        const privateKey = account.privateKey.toHexString();
        const publicKey = account.publicKey.toString();
        console.log("privateKey: ", privateKey);
        console.log("publicKey: ", publicKey);
        const encryptedData = await encryptData(
          new TextEncoder().encode(privateKey),
          ipfsCID,
          userInfo.data.id,
          accessToken
        );
        return JSON.stringify({ ...encryptedData, accountAddress, publicKey });
      }
    );
    Lit.Actions.setResponse({
      response: result,
    });
  } else if (method === "signMessage") {
    const decryptedData = await decryptData(
      ciphertext,
      dataToEncryptHash,
      ipfsCID,
      userInfo.data.id,
      accessToken
    );
    if (!decryptedData) {
      // silently return for nodes which do not have the decrypted key
      return;
    }
    const formattedPrivateKey = PrivateKey.formatPrivateKey(
      decryptedData,
      PrivateKeyVariants.Ed25519
    );
    console.log("formattedPrivateKey: ", formattedPrivateKey);
    const privateKey = new Ed25519PrivateKey(formattedPrivateKey);
    const account = await Account.fromPrivateKey({
      privateKey: privateKey,
    });
    console.log("decrypted account: ", account.accountAddress);
    const message = new Uint8Array(toSign);
    const signature = await account.sign(message);
    console.log("signature: ", signature);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        toSign,
        signature: signature.toString(),
        accountAddress: account.accountAddress.toString(),
      }),
    });
    return signature;
  } else if (method === "signTransaction") {
    const decryptedData = await decryptData(
      ciphertext,
      dataToEncryptHash,
      ipfsCID,
      userInfo.data.id,
      accessToken
    );
    if (!decryptedData) {
      // silently return for nodes which do not have the decrypted key
      return;
    }
    const formattedPrivateKey = PrivateKey.formatPrivateKey(
      decryptedData,
      PrivateKeyVariants.Ed25519
    );
    console.log("formattedPrivateKey: ", formattedPrivateKey);
    const privateKey = new Ed25519PrivateKey(formattedPrivateKey);
    const account = await Account.fromPrivateKey({
      privateKey: privateKey,
    });
    console.log("decrypted account: ", account.accountAddress);
    const deserializer = new Deserializer(toSign);
    const rawTransaction = RawTransaction.deserialize(deserializer);
    console.log("rawTransaction: %O", rawTransaction);
    const tx = new SimpleTransaction(rawTransaction);
    const config = new AptosConfig({
      network: Network.TESTNET,
    });
    const aptos = new Aptos(config);
    const senderAuthenticator = aptos.transaction.sign({
      signer: account,
      transaction: tx,
    });
    console.log("senderAuthenticator: %O", senderAuthenticator);
    const signature = senderAuthenticator.toString();
    console.log("signature: ", signature);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        toSign,
        signature,
        accountAddress: account.accountAddress.toString(),
      }),
    });
    return signature;
  } else {
    console.log("method not found");
    Lit.Actions.setResponse({
      response: "method not found",
    });
    return;
  }
};
go();
