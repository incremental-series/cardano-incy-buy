import { APIErrorCode } from "../cardano/index.js";
import { getElementById, getWallet } from "../utils/index.js";
var WalletSelectAction;
(function (WalletSelectAction) {
    WalletSelectAction[WalletSelectAction["StopLoading"] = 0] = "StopLoading";
    WalletSelectAction[WalletSelectAction["SetActive"] = 1] = "SetActive";
    WalletSelectAction[WalletSelectAction["DisablePermanently"] = 2] = "DisablePermanently";
})(WalletSelectAction || (WalletSelectAction = {}));
export class WalletSelector {
    classTokenJSLoading = 'js-loading';
    enableOptions = { extensions: [{ cip: 30 }] };
    onWalletChange;
    inputChecked;
    isLoading = {};
    constructor(onWalletChangeCallback) {
        this.onWalletChange = onWalletChangeCallback;
    }
    async queryWalletInputAction(walletId) {
        const wallet = getWallet(walletId);
        let WalletConnection;
        (function (WalletConnection) {
            WalletConnection[WalletConnection["Timeout"] = 0] = "Timeout";
            WalletConnection[WalletConnection["ConnectionOk"] = 1] = "ConnectionOk";
        })(WalletConnection || (WalletConnection = {}));
        ;
        return new Promise(async (resolve, reject) => {
            setTimeout(reject, 5000, WalletConnection.Timeout);
            await wallet.isEnabled();
            resolve(WalletConnection.ConnectionOk);
        }).then((successValue) => {
            if (successValue === WalletConnection.ConnectionOk) {
                return wallet.enable(this.enableOptions);
            }
            console.error("Unexpected successValue:", successValue);
            throw successValue;
        }).then((walletApi) => {
            this.onWalletChange(wallet, walletApi);
            return WalletSelectAction.SetActive;
        }).catch((reason) => {
            if (reason === WalletConnection.Timeout) {
                console.warn(`Wallet ${walletId} timed out.`);
                return WalletSelectAction.DisablePermanently;
            }
            else if (reason && reason.hasOwnProperty('code') && reason.code === APIErrorCode.Refused) {
                console.warn(`User refused ${walletId} DApp connection.`);
                return WalletSelectAction.StopLoading;
            }
            console.error(walletId, reason);
            return WalletSelectAction.StopLoading;
        });
    }
    async handleInputEvent(inputElement, event) {
        const inputElementId = inputElement.id;
        const walletId = inputElement.value;
        if (this.inputChecked === inputElementId) {
            this.inputChecked = undefined;
            inputElement.checked = false;
            this.onWalletChange(getWallet(walletId), undefined);
        }
        else {
            event.preventDefault();
            if (!this.isLoading[walletId]) {
                this.isLoading[walletId] = true;
                inputElement.classList.add(this.classTokenJSLoading);
                this.queryWalletInputAction(walletId).then((value) => {
                    const inputElement = getElementById(inputElementId);
                    if (value === WalletSelectAction.SetActive) {
                        this.inputChecked = inputElementId;
                        inputElement.checked = true;
                    }
                    else if (value === WalletSelectAction.DisablePermanently) {
                        inputElement.disabled = true;
                    }
                }).finally(() => {
                    this.isLoading[walletId] = false;
                    inputElement.classList.remove(this.classTokenJSLoading);
                });
            }
        }
    }
    async handleEvent(event) {
        if (event.type === 'click' && event.target instanceof HTMLInputElement) {
            this.handleInputEvent(event.target, event);
        }
    }
}
//# sourceMappingURL=WalletSelector.js.map