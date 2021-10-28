import { AccountData, makeCosmoshubPath, StdSignDoc } from "@cosmjs/amino";
import { toBase64 } from "@cosmjs/encoding";
import { Uint53 } from "@cosmjs/math";
import { assert } from "@cosmjs/utils";
import { Web3Provider } from "@ethersproject/providers";

import { EIP191Signer } from "../signer";

declare const window: any;
declare const document: any;

let accounts: readonly AccountData[] = [];

function createSignDoc(accountNumber: number, address: string): string {
  const signDoc: StdSignDoc = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    chain_id: "testing",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    account_number: `${accountNumber}`,
    sequence: "0",
    fee: {
      amount: [{ amount: "100", denom: "ucosm" }],
      gas: "250",
    },
    memo: "Some memo",
    msgs: [
      {
        type: "cosmos-sdk/MsgSend",
        value: {
          amount: [
            {
              amount: "1234567",
              denom: "ucosm",
            },
          ],
          // eslint-disable-next-line @typescript-eslint/naming-convention
          from_address: address,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          to_address: address,
        },
      },
    ],
  };
  return JSON.stringify(signDoc, null, 2);
}

window.createSigner = async function createSigner(): Promise<EIP191Signer> {
  await window.ethereum.enable();
  const provider = new Web3Provider(window.ethereum);
  return EIP191Signer.fromProvider(provider, "cosmos");
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
  const signDocTextArea = document.getElementById("sign-doc");
  accountsDiv.textContent = "Loading...";

  try {
    accounts = await signer.getAccounts();
    const prettyAccounts = accounts.map((account: AccountData) => ({
      ...account,
      pubkey: toBase64(account.pubkey),
    }));
    accountsDiv.textContent = JSON.stringify(prettyAccounts, null, "\n");
    const accountNumber = 0;
    const address = accounts[0].address;
    addressInput.value = address;
    signDocTextArea.textContent = createSignDoc(accountNumber, address);
  } catch (error) {
    accountsDiv.textContent = error;
  }
};

window.sign = async function sign(signer: EIP191Signer | undefined): Promise<void> {
  if (signer === undefined) {
    console.error("Please wait for transport to connect");
    return;
  }
  const signatureDiv = document.getElementById("signature");
  signatureDiv.textContent = "Loading...";

  try {
    const address = document.getElementById("address").value;
    const signDocJson = document.getElementById("sign-doc").textContent;
    const signDoc: StdSignDoc = JSON.parse(signDocJson);
    const signature = await signer.signAmino(address, signDoc);
    signatureDiv.textContent = JSON.stringify(signature, null, "\t");
  } catch (error) {
    signatureDiv.textContent = error;
  }
};

// window.onload = async function onLoad(): Promise<void> {
//   window.signer = await window.createSigner();
// };
