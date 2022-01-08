import {
  AccountData,
  AminoSignResponse,
  encodeSecp256k1Signature,
  OfflineAminoSigner,
  pubkeyType,
  rawSecp256k1PubkeyToRawAddress,
  Secp256k1Pubkey,
  serializeSignDoc,
  StdSignature,
  StdSignDoc,
} from "@cosmjs/amino";
import { Bech32, fromUtf8, toBase64 } from "@cosmjs/encoding";
// import { arrayify } from "@ethersproject/bytes";
// import { Wallet } from "@ethersproject/wallet";
import { ethers } from "ethers";

/**
 * A wallet that holds a single secp256k1 keypair.
 *
 * If you want to work with BIP39 mnemonics and multiple accounts, use Secp256k1HdWallet.
 */
export class EthSecp256k1Wallet implements OfflineAminoSigner {
  /**
   * Creates an Ethsecp256k1Wallet from the given private key
   *
   * @param privkey The private key.
   * @param prefix The bech32 address prefix (human readable part). Defaults to "cosmos".
   */
  public static async fromKey(privkey: Uint8Array, prefix = "cosmos"): Promise<EthSecp256k1Wallet> {
    return new EthSecp256k1Wallet(new ethers.Wallet(privkey), prefix);
  }

  private readonly wallet: ethers.Wallet;
  private readonly prefix: string;

  private constructor(wallet: ethers.Wallet, prefix: string) {
    this.wallet = wallet;
    this.prefix = prefix;
  }

  private get address(): string {
    return Bech32.encode(this.prefix, rawSecp256k1PubkeyToRawAddress(this.pubkey));
  }

  private get pubkey(): Uint8Array {
    return ethers.utils.arrayify(this.wallet.publicKey);
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
    if (this.address !== signerAddress) {
      throw new Error("Unknown signer address");
    }

    const aminoJsonSignDoc = serializeSignDoc(signDoc);
    const indentedJsonSignDoc = JSON.stringify(JSON.parse(fromUtf8(aminoJsonSignDoc)), null, "  ");

    const signature = await this.wallet.signMessage(indentedJsonSignDoc);

    const stdPub: Secp256k1Pubkey = {
      type: pubkeyType.secp256k1,
      value: toBase64(this.pubkey),
    };

    const stdSig: StdSignature = {
      pub_key: stdPub,
      signature: toBase64(ethers.utils.arrayify(signature)),
    };

    return {
      signed: signDoc,
      signature: stdSig,
    };
  }
}
