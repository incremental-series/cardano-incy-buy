export class AppContent {
    static getWelcomeContent() {
        return new DOMParser().parseFromString(`
<div class="content">
  <div class="inner-content">
    <p>Select your wallet from top to get started.</p>
  </div>
</div>`.replaceAll(/>\s+</mg, '>\n<').trim(), "text/html").body.firstChild;
    }
    static getBuyContent() {
        return new DOMParser().parseFromString(`
<div class="content">
  <h1>Buy Incy</h1>
  <p id="js-wallet-selection-result" style="text-align: center;"></p>
  <div class="inner-content" style="display: flex; flex-direction: column;">
    <h2>Contract</h2>
    <div title="Contract address calculated from the on-chain contract source code." style="display: contents">
      <span>Contract Address (read-only)</span>
      <div style="display: flex; justify-content: space-between;">
        <input type="text" id="js-contract-address" style="min-width: 56ch; width: 100%;" readonly>
        <input type="button" id="js-show-contract-source" title="Click to display on-chain contract source code"
          value="?">
      </div>
      <textarea id="js-contract-source-display" class="js-hide"
        style="position: absolute; margin: auto; inset: 1rem; width: min(50em, 99vw); height: 99vh; z-index: 2;"
        readonly></textarea>
    </div>
    <div title="On-chain unspent transaction information" style="display: contents">
      <span>On-chain UTXO</span>
      <div style="display: flex; justify-content: space-between; gap: 0.1rem;">
        <input type="text" id="js-on-chain-utxo" style="min-width: 65ch; width: 100%;"
          placeholder="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef#0">
        <input type="button" id="js-on-chain-utxo-search" title="Click to get latest on-chain utxo information"
          value="📡">
        <input type="button" id="js-utxo-details-visibility-toggle" value="🔽"
          title="Click to show on-chain utxo details. You can ignore these when using automated (📡) UTXO data fetching."
          onmouseenter="document.getElementById('js-utxo-details').classList.add('highlight')"
          onmouseleave="document.getElementById('js-utxo-details').classList.remove('highlight')">
      </div>
      <p title="" id="js-utxo-search-result" style="overflow-y: auto; max-height: 1.5em;"
        onmouseenter="this.classList.add('show-all')" onmouseleave="this.classList.remove('show-all')"></p>
    </div>
    <div id="js-utxo-details" style="background-color: var(--color-base02); border: var(--color-base01) dashed thin;">
      <div title="On-chain unspent transaction inline datum"
        style="display: flex; flex-direction: column; width: 100%;">
        <span>On-chain Datum Cbor</span>
        <div style="display: flex; justify-content: space-between;">
          <input type="text" id="js-datum" style="width: 100%;" placeholder="9f581c...ff">
          <input type="button" id="js-datum-display-toggle" value="🔽" title="Click to show parsed (read-only) datum elements"
            onmouseenter="document.getElementById('js-datum-parsed').classList.add('highlight')"
            onmouseleave="document.getElementById('js-datum-parsed').classList.remove('highlight')">
        </div>
        <p id="js-datum-parse-result"></p>
      </div>
      <div id="js-datum-parsed" 
        style="display: flex;flex-direction: column;align-items: stretch;flex-wrap: nowrap;background-color: var(--color-base02);border: var(--color-base01) dashed thin;">
        <div style="display: flex;flex-direction: row;">
          <label title="On-chain datum seller hash extracted from datum cbor (read-only)"
            style="display: flex; flex-direction: column; width: 100%;">
            <span>Seller Hash</span>
            <input type="text" id="js-datum-seller-pkh" style="width: 100%;" readonly>
          </label>
          <label title="On-chain datum counter extracted from datum cbor (read-only)"
            style="display: flex; flex-direction: column; width: min-content;">
            <span>Counter</span>
            <input type="number" id="js-datum-counter" min="0" step="1" value="0" style="min-width: 10ch; width: 100%"
              readonly>
          </label>
        </div>
        <label title="On-chain datum staking hex extracted from datum cbor (read-only)"
          style="display: flex; flex-direction: column;">
          <span>Staking Hex (optional)</span>
          <input type="text" id="js-datum-stake-hex" maxlength="58" readonly>
        </label>
      </div>
      <div title="On-chain UTXO balance" style="display: flex; flex-direction: column; width: 100%;">
        <span>On-chain UTXO balance</span>
        <textarea id="js-utxo-balance" style="resize: vertical; width: 100%; height: 5em;"></textarea>
        <p id="js-utxo-balance-parse-result"></p>
      </div>
    </div>
    <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
      <label title="" style="display: flex; flex-direction: column; align-items: center;">
        <span>Buy Amount</span>
        <input type="number" id="js-buy-amount" min="1" step="1" value="1" style="min-width: 24ch; text-align: center;">
      </label>
      <div style="display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(1, 1fr);">
        <label title="" style="grid-area: 1/1/2/5; display: inline-flex; flex-direction: column;">
          <span style="text-align: center;">Tokens</span>
          <input type="text" id="js-buy-tokens-out" style="text-align: center;" readonly>
        </label>
        <p style="grid-area: 1 / 4 / 2 / 6; text-align: center;">for</p>
        <label title="" style="grid-area: 1/5/2/9; display: inline-flex; flex-direction: column;">
          <span style="text-align: center;">Ada/Lovelace</span>
          <input type="text" id="js-buy-lovelace-out" style="text-align: center;" readonly>
        </label>
        <p id="js-token-avg-price" style="grid-column: 1/9; grid-row: 2; text-align: center; height: 0; z-index: 1;"
          title="Average unit price for current selection"></p>
      </div>
    </div>
    <div
      title="Address where you want to send the bought tokens.&#10;Typically this is the receive address of your wallet and default input is the change address reported by your wallet api."
      style="display: contents">
      <span>Token Delivery Address</span>
      <input type="text" id="js-buy-token-delivery-address"
        placeholder="Optional delivery address, if empty then wallet changeAddress is used."
        style="min-width: 56ch; width: 100%;">
    </div>
    <div style="display: flex; flex-direction: row; margin-top: 0.5rem; gap: 0.25rem;">
      <input type="button" id="js-buy-tokens" value="Buy tokens"
        title="Click to buy current selection of tokens.&#10;You will be asked to sign and submit the transaction with your wallet after you click this button."
        style="padding: 0.5rem; width: 100%;">
      <input type="button" id="js-buy-advanced-toggle" value="🔽"
        title="Click to show advanced transaction building options"
        onmouseenter="document.getElementById('js-advanced-buy-details').classList.add('highlight')"
        onmouseleave="document.getElementById('js-advanced-buy-details').classList.remove('highlight')">
    </div>
    <textarea id="js-buy-tokens-result"
      placeholder="Buy tokens result appears here after you have made the sign + submit selection with your wallet"
      style="max-height: 3.375em; overflow: hidden; resize: none;" readonly></textarea>
    <div id="js-advanced-buy-details"
      style="background-color: var(--color-base02); border: var(--color-base01) dashed thin; display: flex; flex-direction: column;">
      <div style="display: flex; flex-direction: column; width: 100%;">
        <input type="button" id="js-advanced-build-tx" value="Build Transaction" title="Click to build transaction"
          style="padding: 0.5rem;">
        <p id="js-advanced-build-tx-result"></p>
        <textarea id="js-advanced-unsigned-tx-cbor" style="resize: vertical;" placeholder="Transaction cbor"
          readonly></textarea>
      </div>
      <div style="display: flex; flex-direction: column; width: 100%;">
        <input type="button" id="js-advanced-sign-tx" value="Sign Transaction"
          title="Click to sign transaction with your wallet" style="padding: 0.5rem;">
        <p id="js-advanced-sign-tx-result"></p>
        <textarea id="js-advanced-signed-tx-cbor" style="resize: vertical;" placeholder="Signed transaction cbor"
          readonly></textarea>
      </div>
      <input type="button" id="js-advanced-submit-tx" value="Submit Transaction"
        title="Click to submit transaction with your wallet" style="padding: 0.5rem;">
      <textarea id="js-advanced-submit-tx-result" placeholder="Submit transaction result appears here"
        style="max-height: 3.375em; overflow: hidden; resize: none;" readonly></textarea>
    </div>
  </div>
</div>`.replaceAll(/>\s+</mg, '>\n<').trim(), "text/html").body.firstChild;
    }
    static getWalletSelection(walletId, walletName, walletImage) {
        const imageData = (() => {
            try {
                const cmpString = "data:image/svg+xml";
                if (walletImage.startsWith(cmpString, 0)) {
                    // picture data starts after first ','
                    const index = walletImage.indexOf(',', cmpString.length);
                    const [dataPrefix, imageData] = [walletImage.substring(0, index + 1), walletImage.substring(index + 1)];
                    if (!/;base64/.test(dataPrefix)) {
                        const doc = new DOMParser().parseFromString(decodeURIComponent(imageData), "image/svg+xml");
                        const errorNode = doc.querySelector('parseerror');
                        if (errorNode)
                            throw errorNode;
                        return dataPrefix + encodeURIComponent(doc.querySelector('svg').outerHTML);
                    }
                }
            }
            catch (error) {
                console.warn(error);
            }
            return walletImage;
        })();
        return new DOMParser().parseFromString(`
<label class="input-wallet-selection">
  <input type="radio" id="js-input-wallet-selection-${walletId}" name="input-wallet-selection" value="${walletId}" />
  <img src="${imageData}" alt="${walletName}" />
  <span>${walletName}</span>
  <span class="loader"></span>
</label>`.replaceAll(/>\s+</mg, '>\n<').trim(), "text/html").body.firstChild;
    }
}
//# sourceMappingURL=AppContent.js.map