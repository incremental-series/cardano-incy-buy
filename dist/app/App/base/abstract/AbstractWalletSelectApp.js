import { capitalizeFirstLetter, getCardanoWallets } from "../../../utils/index.js";
import { WalletSelector } from "../../../wallet/WalletSelector.js";
import { AppContent } from "../../AppContent.js";
import { AbstractApp } from "./AbstractApp.js";
export class AbstractWalletSelectApp extends AbstractApp {
    elementIds;
    constructor(walletSelectionId) {
        super();
        this.elementIds = {
            walletSelection: walletSelectionId,
        };
    }
    initialize() {
        this.initializeWalletSelector();
    }
    initializeWalletSelector() {
        const walletSelectionContainer = document.getElementById(this.elementIds.walletSelection);
        if (!walletSelectionContainer)
            throw `!walletSelectionContainer, ${this.elementIds.walletSelection}`;
        const wallets = getCardanoWallets();
        if (wallets?.length) {
            walletSelectionContainer.replaceChildren();
            const walletSelector = new WalletSelector((wallet, walletAPI) => {
                this.onWalletChange(walletAPI ? { info: wallet, handle: walletAPI } : null);
            });
            wallets.forEach(element => {
                const [walletId, wallet] = element;
                const input = AppContent.getWalletSelection(walletId, capitalizeFirstLetter(wallet.name), wallet.icon);
                input.addEventListener('click', walletSelector);
                walletSelectionContainer.appendChild(input);
            });
        }
        else {
            walletSelectionContainer.replaceChildren(new DOMParser().parseFromString(`<p>No Cardano wallets found</p>`, "text/html").body.firstChild);
        }
    }
}
//# sourceMappingURL=AbstractWalletSelectApp.js.map