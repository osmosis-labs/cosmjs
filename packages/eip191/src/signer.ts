import {
  AccountData,
  AminoSignResponse,
  encodeSecp256k1Pubkey,
  OfflineAminoSigner,
  pubkeyToAddress,
  Secp256k1Pubkey,
  serializeSignDoc,
  StdSignature,
  StdSignDoc,
} from "@cosmjs/amino";
import { ripemd160, Secp256k1, sha256 } from "@cosmjs/crypto";
import { fromBase64, fromUtf8, toBase64 } from "@cosmjs/encoding";
import { ethers } from "ethers";

const DEFAULT_SIGN_MSG = "I SOLEMNLY SWEAR I AM UP TO NO GOOD";

function recoverPubkeyFromSignature(signature: string, signMsg: string): Secp256k1Pubkey {
  const pubkey = ethers.utils.recoverPublicKey(ethers.utils.hashMessage(signMsg), signature);
  const compressedPubKey = Secp256k1.compressPubkey(ethers.utils.arrayify(pubkey));
  return encodeSecp256k1Pubkey(compressedPubKey);
}

export class EIP191Signer implements OfflineAminoSigner {
  private readonly signer: ethers.Signer;
  private pubkey?: Secp256k1Pubkey;
  private readonly prefix: string;
  private readonly signMsg: string;

  /**
   * Creates an EIP191 Signer from the given private key
   *
   * @param privkey The private key.
   * @param prefix The bech32 address prefix (human readable part). Defaults to "cosmos".
   */
  public static async fromProvider(
    provider: ethers.providers.JsonRpcProvider,
    prefix = "cosmos",
    signMsg = DEFAULT_SIGN_MSG,
  ): Promise<EIP191Signer> {
    const signer = provider.getSigner();
    return new EIP191Signer(signer, prefix, signMsg);
  }

  private constructor(signer: ethers.Signer, prefix = "cosmos", signMsg = DEFAULT_SIGN_MSG) {
    this.signer = signer;
    this.prefix = prefix;
    this.signMsg = signMsg;
  }

  private async getPubkeyViaSign(): Promise<Secp256k1Pubkey> {
    const signature = await this.signer.signMessage(this.signMsg);
    return recoverPubkeyFromSignature(signature, this.signMsg);
  }

  private async address(): Promise<string> {
    if (!this.pubkey) {
      this.pubkey = await this.getPubkeyViaSign();
    }
    return pubkeyToAddress(this.pubkey, this.prefix);
  }

  public async getAccounts(): Promise<readonly AccountData[]> {
    if (!this.pubkey) {
      this.pubkey = await this.getPubkeyViaSign();
      console.log(this.pubkey);
    }

    console.log(fromBase64(this.pubkey.value));

    console.log();

    console.log(ripemd160(sha256(fromBase64(this.pubkey.value))));

    const addr = await this.address();

    return [
      {
        algo: "secp256k1",
        address: addr,
        pubkey: fromBase64(this.pubkey.value),
      },
    ];
  }

  public async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    const acc = await this.getAccounts();

    if (acc[0].address !== signerAddress) {
      throw new Error("Unknown signer address");
    }

    const aminoJsonSignDoc = serializeSignDoc(signDoc);
    const indentedJsonSignDoc = JSON.stringify(JSON.parse(fromUtf8(aminoJsonSignDoc)), null, "  ");

    const signature = await this.signer.signMessage(indentedJsonSignDoc);

    if (!this.pubkey) {
      this.pubkey = recoverPubkeyFromSignature(signature, indentedJsonSignDoc);
    }

    const stdSig: StdSignature = {
      pub_key: this.pubkey,
      signature: toBase64(ethers.utils.arrayify(signature)),
    };

    return {
      signed: signDoc,
      signature: stdSig,
    };
  }
}
