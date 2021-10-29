// import {
//   AccountData,
//   AminoSignResponse,
//   encodeSecp256k1Signature,
//   EthSecp256k1Pubkey,
//   OfflineAminoSigner,
//   pubkeyType,
//   rawSecp256k1PubkeyToRawAddress,
//   serializeSignDoc,
//   StdSignature,
//   StdSignDoc,
// } from "@cosmjs/amino";
// import { Secp256k1, Sha256 } from "@cosmjs/crypto";
// import { Bech32, fromUtf8, toBase64 } from "@cosmjs/encoding";
// import { arrayify } from "@ethersproject/bytes";
// import { Wallet } from "@ethersproject/wallet";

// /**
//  * A wallet that holds a single secp256k1 keypair.
//  *
//  * If you want to work with BIP39 mnemonics and multiple accounts, use Secp256k1HdWallet.
//  */
// export class EthSecp256k1Wallet implements OfflineAminoSigner {
//   /**
//    * Creates an Ethsecp256k1Wallet from the given private key
//    *
//    * @param privkey The private key.
//    * @param prefix The bech32 address prefix (human readable part). Defaults to "cosmos".
//    */
//   public static async fromKey(privkey: Uint8Array, prefix = "cosmos"): Promise<EthSecp256k1Wallet> {
//     return new EthSecp256k1Wallet(new Wallet(privkey), prefix);
//   }

//   private readonly wallet: Wallet;
//   private readonly prefix: string;

//   private constructor(wallet: Wallet, prefix: string) {
//     this.wallet = wallet;
//     this.prefix = prefix;
//   }

//   private get address(): string {
//     return Bech32.encode(this.prefix, arrayify(this.wallet.address));
//   }

//   public async getAccounts(): Promise<readonly AccountData[]> {
//     return [
//       {
//         algo: "ethsecp256k1",
//         address: this.address,
//         pubkey: arrayify(this.wallet.publicKey),
//       },
//     ];
//   }

//   public async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
//     if (signerAddress !== this.address) {
//       throw new Error(`Address ${signerAddress} not found in wallet`);
//     }

//     const message = JSON.stringify(JSON.parse(fromUtf8(serializeSignDoc(signDoc))), null, "  ");
//     const signature = await this.wallet.signMessage(message);

//     const stdPub: EthSecp256k1Pubkey = {
//       type: pubkeyType.ethsecp256k1,
//       value: toBase64(arrayify(this.wallet.publicKey)),
//     };

//     const stdSig: StdSignature = {
//       pub_key: stdPub,
//       signature: toBase64(arrayify(signature)),
//     };

//     return {
//       signed: signDoc,
//       signature: stdSig,
//     };
//   }
// }
