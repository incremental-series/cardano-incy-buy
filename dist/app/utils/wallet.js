/**
 * Retrieves all user wallets (sorted by name) that may be usable with DApps.
 */
export function getCardanoWallets() {
    if (!window.cardano) {
        return null;
    }
    return Object.entries(window.cardano)
        .filter((value) => { return value[0] && value[1]; })
        .sort((a, b) => a[0].localeCompare(b[0]));
}
/**
 * Retrieves non-zero wallet for given name or throws an error.
 * @param walletName cardano wallet window identifier.
 * @throws Error
 */
export function getWallet(walletName) {
    if (!window.cardano) {
        throw new Error("!window.cardano");
    }
    else if (!(walletName in window.cardano)) {
        throw new Error(`'${walletName}' not found from window.cardano`);
    }
    const wallet = window.cardano[walletName];
    if (!wallet) {
        throw new Error("!wallet");
    }
    return wallet;
}
//# sourceMappingURL=wallet.js.map