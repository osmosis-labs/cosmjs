import {
  AccountData,
  AminoSignResponse,
  encodeSecp256k1Signature,
  makeCosmoshubPath,
  OfflineAminoSigner,
  rawSecp256k1PubkeyToRawAddress,
  serializeSignDoc,
  StdSignDoc,
} from "@cosmjs/amino";
import { Bech32 } from "@cosmjs/encoding";
import { Signer } from "@ethersproject/abstract-signer";
import { arrayify } from "@ethersproject/bytes";
// import { ethers, Signer } from "ethers";
import { JsonRpcProvider, JsonRpcSigner } from "@ethersproject/providers";

export class EIP191Signer implements OfflineAminoSigner {
  private readonly signer: Signer;
  private readonly prefix: string;

  /**
   * Creates an EIP191 Signer from the given private key
   *
   * @param privkey The private key.
   * @param prefix The bech32 address prefix (human readable part). Defaults to "cosmos".
   */
  public static async fromProvider(provider: JsonRpcProvider, prefix = "cosmos"): Promise<EIP191Signer> {
    const signer = provider.getSigner();
    return new EIP191Signer(signer, prefix);
  }

  private constructor(signer: Signer, prefix: string) {
    this.signer = signer;
    this.prefix = prefix;
  }

  public async getAccounts(): Promise<readonly AccountData[]> {
    const ethaddress = await this.signer.getAddress();

    arrayify();

    Bech32.encode(this.prefix, rawSecp256k1PubkeyToRawAddress(this.pubkey));

    // if (!this.accounts) {
    //   const pubkeys = await this.ledger.getPubkeys();
    //   this.accounts = await Promise.all(
    //     pubkeys.map(async (pubkey) => ({
    //       algo: "secp256k1" as const,
    //       address: await this.ledger.getCosmosAddress(pubkey),
    //       pubkey: pubkey,
    //     })),
    //   );
    // }

    // return this.accounts;
  }

  public async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    const accounts = this.accounts || (await this.getAccounts());
    const accountIndex = accounts.findIndex((account) => account.address === signerAddress);

    if (accountIndex === -1) {
      throw new Error(`Address ${signerAddress} not found in wallet`);
    }

    const message = serializeSignDoc(signDoc);
    const accountForAddress = accounts[accountIndex];
    const hdPath = this.hdPaths[accountIndex];
    const signature = await this.ledger.sign(message, hdPath);
    return {
      signed: signDoc,
      signature: encodeSecp256k1Signature(accountForAddress.pubkey, signature),
    };
  }
}

import { Secp256k1, Sha256 } from "@cosmjs/crypto";

// import { encodeSecp256k1Signature, rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";
// import { encodeSecp256k1Signature } from "./signature";
// import { serializeSignDoc, StdSignDoc } from "./signdoc";
// import { AccountData, AminoSignResponse, OfflineAminoSigner } from "./signer";

/**
 * A wallet that holds a single secp256k1 keypair.
 *
 * If you want to work with BIP39 mnemonics and multiple accounts, use Secp256k1HdWallet.
 */
export class Secp256k1Wallet implements OfflineAminoSigner {
  private readonly pubkey: Uint8Array;
  private readonly privkey: Uint8Array;
  private readonly prefix: string;

  private constructor(privkey: Uint8Array, pubkey: Uint8Array, prefix: string) {
    this.privkey = privkey;
    this.pubkey = pubkey;
    this.prefix = prefix;
  }

  private get address(): string {
    return Bech32.encode(this.prefix, rawSecp256k1PubkeyToRawAddress(this.pubkey));
  }

  public async getAccounts(): Promise<readonly AccountData[]> {
    return [
      {
        algo: "secp256k1",
        address: this.address,
        pubkey: this.pubkey,
      },
    ];
  }

  public async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    if (signerAddress !== this.address) {
      throw new Error(`Address ${signerAddress} not found in wallet`);
    }
    const message = new Sha256(serializeSignDoc(signDoc)).digest();
    const signature = await Secp256k1.createSignature(message, this.privkey);
    const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
    return {
      signed: signDoc,
      signature: encodeSecp256k1Signature(this.pubkey, signatureBytes),
    };
  }
}
