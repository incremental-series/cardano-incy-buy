import { NetworkId } from "../../cardano/index.js";
import { AbstractIncyApp } from "./abstract/AbstractIncyApp.js";
import { UIResultType } from "./types.js";
export class IncyApp extends AbstractIncyApp {
    feeAllocation = 1000000n;
    useLocalConnector = false;
    blockfrost = {
        projectId: "",
        network: ""
    };
    wallet;
    isLocalTestnet = false;
    isWalletLocalTestnet(wallet) { return wallet.info.name === 'CLIWallet'; }
    getNetworkParams() { return this.isLocalTestnet ? "./config/localTestnet.json" : this.isTestnet ? "./config/preview.json" : "./config/mainnet.json"; }
    // protected getNetworkParams(): string {
    //   if (this.isLocalTestnet) return "./config/localTestnet.json";
    //   if (this.isTestnet) return "https://d1t0d7c2nekuk0.cloudfront.net/preview.json";
    //   return "https://d1t0d7c2nekuk0.cloudfront.net/mainnet.json";
    // }
    networkParams = this.getNetworkParams();
    elementCSS = {
        hide: 'js-hide',
        shimmer: 'js-shimmer',
        results: {
            hide: 'js-hide',
            error: 'js-error',
            warning: 'js-warning',
            invalid: 'js-invalid'
        }
    };
    initialize() {
        super.initialize();
    }
    onWalletChange(wallet) {
        if (wallet) {
            console.log("Wallet change:", wallet.info.name);
            this.wallet = wallet;
            this.isLocalTestnet = this.isWalletLocalTestnet(this.wallet);
            this.wallet.handle.getNetworkId().then(networkId => {
                this.isTestnet = this.wallet ? networkId === NetworkId.Testnet : false;
                this.onAfterWalletChange();
            });
        }
        else {
            console.debug("Wallet unselected");
            this.wallet = undefined;
            this.onAfterWalletChange();
        }
    }
    onAfterWalletChange() {
        this.networkParams = this.getNetworkParams();
        this.configureContract();
        // ... and app specific update logic.
    }
    setUIResult(element, textContent, type = UIResultType.Generic) {
        const classListToken = type === UIResultType.Error ? this.elementCSS.results.error : type === UIResultType.Warning ? this.elementCSS.results.warning : undefined;
        if (classListToken)
            element.classList.add(classListToken);
        else if (type === UIResultType.Generic) {
            element.classList.remove(...Object.values(this.elementCSS.results));
        }
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.value = textContent ?? '';
        }
        else {
            element.textContent = textContent;
        }
    }
    clearUIResult(element) {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.value = '';
        }
        else {
            element.textContent = null;
        }
        element.classList.remove(...Object.values(this.elementCSS.results));
    }
    setUIErrorResult(element, textContent) {
        this.setUIResult(element, textContent, UIResultType.Error);
    }
}
//# sourceMappingURL=IncyApp.js.map