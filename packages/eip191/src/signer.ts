import {
  AccountData,
  AminoSignResponse,
  EthSecp256k1Pubkey,
  OfflineAminoSigner,
  pubkeyType,
  serializeSignDoc,
  StdSignature,
  StdSignDoc,
} from "@cosmjs/amino";
import { Bech32, fromUtf8, toBase64 } from "@cosmjs/encoding";
import { Signer } from "@ethersproject/abstract-signer";
import { arrayify } from "@ethersproject/bytes";
import { hashMessage } from "@ethersproject/hash";
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

    const aminoJsonSignDoc = serializeSignDoc(signDoc);

    const indentedJsonSignDoc = JSON.stringify(JSON.parse(fromUtf8(aminoJsonSignDoc)), null, "  ");

    const signature = await this.signer.signMessage(indentedJsonSignDoc);

    const pubkey = recoverPublicKey(hashMessage(indentedJsonSignDoc), signature);

    const stdSig = new StdSignature({
      pub_key: new EthSecp256k1Pubkey({
        type: pubkeyType.ethsecp256k1,
        value: toBase64(arrayify(pubkey)),
      }),
      signature: toBase64(arrayify(signature)),
    });

    return {
      signed: signDoc,
      signature: stdSig,
    };
  }
}
