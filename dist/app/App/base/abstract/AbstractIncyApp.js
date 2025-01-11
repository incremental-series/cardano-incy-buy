import { NetworkMagics } from "../../../cardano/index.js";
import { Incy } from "../../../Contract/Incy/Incy.js";
import { AbstractWalletSelectApp } from "./AbstractWalletSelectApp.js";
export class AbstractIncyApp extends AbstractWalletSelectApp {
    /** Helper ui token info; does not affect contract functionality. */
    token = {
        name: 'INCY',
        decimals: 6
    };
    isTestnet = false;
    contract;
    configureContract() {
        try {
            this.contract = new Incy(this.getContractConfiguration());
        }
        catch (error) {
            throw `Contract configuration failed: ${error}`;
        }
    }
    getContractConfiguration() {
        // Default to mainnet configuration, only preview supported for testnet.
        const networkSelection = this.isTestnet ? NetworkMagics.Preview : NetworkMagics.Mainnet;
        if (networkSelection === NetworkMagics.Mainnet || networkSelection === NetworkMagics.Preview) {
            return {
                // The underlying token has 6 decimals; hence, 1e6 on network means 1 token. 1_000_000n therefore means 1 token per step and 100 tokens for the price group increment.
                priceStepSize: 1000000n,
                priceGroupSize: 100n,
                token: {
                    mintingPolicyHash: "0000001c1f5134859ee40556e75834b9929d1b393ab94858a3d27ae0",
                    nameBytes: "494e4359",
                    nameBytesBeacon: "424541434f4e"
                },
                sellerPublicKeyHash: 'bcaba29392abceed84807ecfd3587a3b07bd7bcf41f5a835069d538e',
                eStopPublicKeyHash: 'deedfeb7222863dabdfe9978508b088b470a6291d0d0b4e897ec3f1f',
                stakeHex: networkSelection === NetworkMagics.Mainnet ? 'e1b562810203ba87cf9e3220421f49b55be072e2044528685f05b3900d'
                    : null // 'e0e300a091da3b9682ea8c7090fce9761568b5ff722f420db3927ad490'
            };
        }
        throw Error(`Unexpected networkSelection: ${networkSelection}`);
    }
    getContractAddress() {
        if (!this.contract)
            throw "Contract not configured";
        return this.contract.getContractAddress(this.isTestnet).toBech32();
    }
}
//# sourceMappingURL=AbstractIncyApp.js.map