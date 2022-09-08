import { AccountData, makeCosmoshubPath, StdSignDoc } from "@cosmjs/amino";
import { toBase64 } from "@cosmjs/encoding";
import { ethers } from "ethers";

import { EIP191Signer } from "../signer";

// Unpkg imports
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;

declare const window: any;
declare const document: any;

let web3Modal: typeof Web3Modal;

let accounts: readonly AccountData[] = [];

function createSignDoc(accountNumber: number, address: string, to: string, amount: string): StdSignDoc {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    chain_id: "testing",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    account_number: `${accountNumber}`,
    sequence: "0",
    fee: {
      amount: [{ amount: "100", denom: "ucosm" }],
      gas: "200000",
    },
    memo: "",
    msgs: [
      {
        type: "cosmos-sdk/MsgSend",
        value: {
          amount: [
            {
              amount: amount,
              denom: "ucosm",
            },
          ],
          // eslint-disable-next-line @typescript-eslint/naming-convention
          from_address: address,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          to_address: to,
        },
      },
    ],
  };
  // return JSON.stringify(signDoc, null, 2);
}

window.createSigner = async function createSigner(): Promise<EIP191Signer> {
  const w3provider = await web3Modal.connect();

  // await window.ethereum.enable();
  const provider = new ethers.providers.Web3Provider(w3provider);
  return EIP191Signer.fromProvider(provider, "osmo");
};

window.getAccounts = async function getAccounts(): Promise<void> {
  window.signer = await window.createSigner();

  const signer = window.signer;
  if (signer === undefined) {
    console.error("Please connect web3 wallet");
    return;
  }
  const addressInput = document.getElementById("address");
  const accountsDiv = document.getElementById("accounts");

  try {
    accounts = await signer.getAccounts();
    const prettyAccounts = accounts.map((account: AccountData) => ({
      ...account,
      pubkey: toBase64(account.pubkey),
    }));
    // accountsDiv.textContent = JSON.stringify(prettyAccounts, null, "\n");
    const accountNumber = 0;
    const address = accounts[0].address;
    addressInput.value = address;
  } catch (error) {
    accountsDiv.textContent = error;
  }
};

window.sign = async function sign(signer: EIP191Signer | undefined): Promise<void> {
  if (signer === undefined) {
    console.error("Please wait for transport to connect");
    return;
  }
  const signedTxDiv = document.getElementById("signed-tx-div");
  const signedTx = document.getElementById("signed-tx");

  try {
    const address = document.getElementById("address").value;

    const to = document.getElementById("to").value;
    const amount = document.getElementById("amount").value;

    const signDoc: StdSignDoc = createSignDoc(0, address, to, amount);
    const signature = await signer.signAmino(address, signDoc);
    signedTx.textContent = JSON.stringify(signature.signature, null, " ");
    signedTxDiv.style.visibility = "visible";
  } catch (error) {
    signedTx.textContent = error;
  }
};

window.onload = async function onLoad(): Promise<void> {
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        // Sunny 's test key - don't copy as your mileage may vary
        infuraId: "8896ec9242ae472aae0e50b0e48ebfc1",
      },
    },
  };

  web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
    disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
  });
  // window.signer = await window.createSigner();
};
