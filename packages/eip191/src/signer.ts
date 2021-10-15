import {
  AccountData,
  AminoSignResponse,
  encodeSecp256k1Signature,
  EthSecp256k1Pubkey,
  makeCosmoshubPath,
  OfflineAminoSigner,
  pubkeyType,
  rawSecp256k1PubkeyToRawAddress,
  serializeSignDoc,
  StdSignature,
  StdSignDoc,
} from "@cosmjs/amino";
import { Bech32, fromUtf8, toBase64, toUtf8 } from "@cosmjs/encoding";
import { Signer } from "@ethersproject/abstract-signer";
import { arrayify } from "@ethersproject/bytes";
// import { ethers, Signer } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { recoverPublicKey } from "@ethersproject/signing-key";

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
    const bechaddr = Bech32.encode(this.prefix, arrayify(ethaddress));

    return new AccountData({
      algo: "ethsecp25k1",
      address: bechaddr,
    });
  }

  public async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    const acc = await this.getAccounts();

    if (acc[0].address !== signerAddress) {
      throw new Error("Unknown signer address");
    }

    // export interface StdSignDoc {
    //   readonly chain_id: string;
    //   readonly account_number: string;
    //   readonly sequence: string;
    //   readonly fee: StdFee;
    //   readonly msgs: readonly AminoMsg[];
    //   readonly memo: string;
    // }

    //   return await this.keplr.signAmino(this.chainId, signerAddress, signDoc);
    // }]

    const aminoJsonSignDoc = serializeSignDoc(signDoc);

    const indentedJsonSignDoc = JSON.stringify(JSON.parse(fromUtf8(aminoJsonSignDoc)), null, "  ");

    const signature = await this.signer.signMessage(indentedJsonSignDoc);

    const stdSig = new StdSignature({
      // readonly pub_key: Pubkey;
      signature: toBase64(arrayify(signature)),
    });

    return {
      signed: signDoc,
      signature: stdSig,
    };
  }
}

export function encodeEthSecp256k1Pubkey(pubkey: Uint8Array): EthSecp256k1Pubkey {
  if (pubkey.length !== 33 || (pubkey[0] !== 0x02 && pubkey[0] !== 0x03)) {
    throw new Error("Public key must be compressed ethsecp256k1, i.e. 33 bytes starting with 0x02 or 0x03");
  }
  return {
    type: pubkeyType.ethsecp256k1,
    value: toBase64(pubkey),
  };
}

export function encodeEthSecp256k1Signature(signature: string): StdSignature {
  if (sig.length !== 64) {
    throw new Error(
      "Signature must be 64 bytes long. Cosmos SDK uses a 2x32 byte fixed length encoding for the ethsecp256k1 signature integers r and s.",
    );
  }

  const pubkey = recoverPublicKey();

  return {
    pub_key: encodeSecp256k1Pubkey(pubkey),
    signature: toBase64(sig),
  };
}

// import { Secp256k1, Sha256 } from "@cosmjs/crypto";

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
