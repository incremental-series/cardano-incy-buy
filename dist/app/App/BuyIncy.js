import { NETWORK as BLOCKFROST_NETWORK, PROJECT_ID as BLOCKFROST_PROJECT_ID } from "../blockfrost-api-keys.js";
import { Blockfrost } from "../Connection/Blockfrost.js";
import { CardanoCLI } from "../Connection/CardanoCLI.js";
import { Incy } from "../Contract/Incy/Incy.js";
import * as helios from "../helios/index.js";
import { capitalizeFirstLetter, clearValueNotifyChange, formatNumber, getElementById, notifyChangeFor, onBeforeInputHexOnly, setValueNotifyChange } from "../utils/index.js";
import { CLIWallet } from "../wallet/CLIWallet.js";
import { AppContent } from "./AppContent.js";
import { IncyApp } from "./base/IncyApp.js";
import { UIResultType } from "./types.js";
export class BuyIncy extends IncyApp {
    urlSearchParamKeys = {
        useLocalConnector: 'cli_connector',
        blockfrost: {
            projectId: 'blockfrost_project_id',
            network: 'blockfrost_network'
        }
    };
    urlSearchParams;
    constructor(mainColumnId, walletSelectionId) {
        super(walletSelectionId);
        this.elementIds = {
            walletSelection: walletSelectionId,
            mainColumn: mainColumnId
        };
        const searchParams = new URLSearchParams(window.location.search);
        this.urlSearchParams = {
            cliWallet: searchParams.has('cli_wallet'),
            useLocalConnector: searchParams.has(this.urlSearchParamKeys.useLocalConnector),
            blockfrost: {
                projectId: searchParams.get(this.urlSearchParamKeys.blockfrost.projectId)?.trim(),
                network: searchParams.get(this.urlSearchParamKeys.blockfrost.network)?.trim(),
            },
        };
        if (this.urlSearchParams.cliWallet && 'cardano' in window) {
            const windowWithCardano = window;
            const cliWalletId = 'CLIWallet';
            if (!windowWithCardano.cardano[cliWalletId]) {
                windowWithCardano.cardano[cliWalletId] = new CLIWallet();
            }
            else {
                console.warn(`${cliWalletId} already in window.cardano; this is unexpected and most likely an error.`);
                // No guarantees that this is an error, and even if so, then it's a developmental error/bug.
            }
        }
        if (this.urlSearchParams.useLocalConnector) {
            console.warn(`Local connector enabled with ${this.urlSearchParamKeys.useLocalConnector} url parameter.`);
            console.info("Using local connector for contract utxo data fetching instead of blockfrost.");
            this.useLocalConnector = true;
        }
        else {
            this.blockfrost.projectId = this.urlSearchParams.blockfrost.projectId ?? BLOCKFROST_PROJECT_ID;
            this.blockfrost.network = this.urlSearchParams.blockfrost.network ?? BLOCKFROST_NETWORK;
            if (!this.blockfrost.projectId || !this.blockfrost.network) {
                const missing = [
                    !this.blockfrost.projectId ? 'projectId' : null,
                    !this.blockfrost.network ? 'network' : null
                ].filter(value => value).join(', ');
                console.log(`Blockfrost ${missing} not defined or empty.`);
                console.info(`You can define blockfrost connection information in url address bar OR by modifying the blockfrost-api-keys.js file.`);
                const urlParamIds = this.urlSearchParamKeys.blockfrost;
                console.info(`URL address bar example: ?${urlParamIds.projectId}=your_project_id&${urlParamIds.network}=your_network_selection`);
            }
            if (this.blockfrost.projectId && this.blockfrost.projectId.length <= 32) {
                console.warn("Blockfrost project id likely invalid, length:", this.blockfrost.projectId.length);
            }
        }
    }
    initialize() {
        super.initialize();
        this.initializeUi();
    }
    onAfterWalletChange() {
        const headerNotify = document.getElementById('js-header-notify');
        try {
            if (headerNotify) {
                this.clearUIResult(headerNotify);
            }
            super.onAfterWalletChange();
        }
        catch (error) {
            if (headerNotify) {
                this.setUIErrorResult(headerNotify, `Something went horribly wrong in initialization!\nCheck browser console log for more information.`);
            }
            console.error(error);
            this.contract = undefined; // Most likely contract configuration failed somehow.
        }
        helios.config.set({ IS_TESTNET: this.isTestnet });
        this.onWalletChangeUpdateApp();
    }
    onWalletChangeUpdateApp() {
        this.updateMainColumn();
        if (Object.keys(this.ui).length) {
            this.updateWalletSelectionResult();
            const updateInfo = (walletAddress) => {
                setValueNotifyChange(this.ui.contractAddressOut, this.contract?.getContractAddress(this.isTestnet).toBech32());
                setValueNotifyChange(this.ui.datumSellerHashOut, this.contract?.getDatumSeller().hex);
                setValueNotifyChange(this.ui.datumStakeHexOut, this.contract?.getDatumStaking());
                setValueNotifyChange(this.ui.deliveryAddress, walletAddress);
                if (walletAddress) {
                    // Try fetching current On-chain UTXO information for user.
                    this.ui.onChainUTXOSearch.click();
                }
            };
            this.wallet ? this.wallet.handle.getChangeAddress().then(value => updateInfo(helios.Address.fromProps(value).toBech32())) : updateInfo("");
        }
    }
    updateWalletSelectionResult() {
        const walletResultElement = this.ui.walletSelectionResult;
        if (this.wallet) {
            const walletSelectionResult = `${capitalizeFirstLetter(this.wallet.info.name)} on ${this.isLocalTestnet ? 'localTestnet' : this.isTestnet ? 'testnet' : 'mainnet'}`;
            const notMainnet = this.isLocalTestnet || this.isTestnet;
            if (notMainnet) {
                console.warn(walletSelectionResult);
                if (this.isTestnet) {
                    console.info("Change connected network from your wallet to mainnet and then reselect the wallet from top bar (or simply refresh the page).");
                    console.info("Alternatively you can use this app on preview testnet for testing purposes.");
                }
            }
            this.setUIResult(walletResultElement, walletSelectionResult, notMainnet ? UIResultType.Warning : UIResultType.Generic);
        }
        else {
            this.clearUIResult(walletResultElement);
        }
    }
    initializeUi() {
        this.updateMainColumn();
    }
    updateMainColumn() {
        if (this.wallet && this.contract) {
            getElementById(this.elementIds.mainColumn).replaceChildren(AppContent.getBuyContent());
            this._initializeUi();
        }
        else {
            getElementById(this.elementIds.mainColumn).replaceChildren(AppContent.getWelcomeContent());
        }
    }
    ui = {};
    _initializeUi() {
        this.ui = {
            walletSelectionResult: getElementById('js-wallet-selection-result'),
            contractAddressOut: getElementById('js-contract-address'),
            showScriptSource: getElementById('js-show-contract-source'),
            contractSourceDisplay: getElementById('js-contract-source-display'),
            onChainUTXO: getElementById('js-on-chain-utxo'),
            onChainUTXOSearch: getElementById('js-on-chain-utxo-search'),
            onChainUTXOSearchResult: getElementById('js-utxo-search-result'),
            utxoDetailsVisibilityToggle: getElementById('js-utxo-details-visibility-toggle'),
            utxoDetails: getElementById('js-utxo-details'),
            datumCbor: getElementById('js-datum'),
            datumDisplayToggle: getElementById('js-datum-display-toggle'),
            datumParseResult: getElementById('js-datum-parse-result'),
            datumParsed: getElementById('js-datum-parsed'),
            datumSellerHashOut: getElementById('js-datum-seller-pkh'),
            datumCounterOut: getElementById('js-datum-counter'),
            datumStakeHexOut: getElementById('js-datum-stake-hex'),
            utxoBalance: getElementById('js-utxo-balance'),
            utxoBalanceParseResult: getElementById('js-utxo-balance-parse-result'),
            buyAmount: getElementById('js-buy-amount'),
            buyTokensOut: getElementById('js-buy-tokens-out'),
            buyLovelaceOut: getElementById('js-buy-lovelace-out'),
            tokenAVGPrice: getElementById('js-token-avg-price'),
            deliveryAddress: getElementById('js-buy-token-delivery-address'),
            buyTokens: getElementById('js-buy-tokens'),
            buyTokensResult: getElementById('js-buy-tokens-result'),
            buyAdvanced: getElementById('js-buy-advanced-toggle'),
            advancedBuyDetails: getElementById('js-advanced-buy-details'),
            advancedBuildTx: getElementById('js-advanced-build-tx'),
            advancedBuildTxResult: getElementById('js-advanced-build-tx-result'),
            advancedBuildTxCbor: getElementById('js-advanced-unsigned-tx-cbor'),
            advancedSignTx: getElementById('js-advanced-sign-tx'),
            advancedSignTxResult: getElementById('js-advanced-sign-tx-result'),
            advancedSignTxCbor: getElementById('js-advanced-signed-tx-cbor'),
            advancedSubmitTx: getElementById('js-advanced-submit-tx'),
            advancedSubmitTxResult: getElementById('js-advanced-submit-tx-result'),
        };
        this.ui.showScriptSource.onclick = () => {
            this.ui.contractSourceDisplay.textContent = Incy.getContractSource();
            this.ui.contractSourceDisplay.classList.remove(this.elementCSS.hide);
            this.ui.contractSourceDisplay.focus();
        };
        this.ui.contractSourceDisplay.onblur = () => this.ui.contractSourceDisplay.classList.add(this.elementCSS.hide);
        this.ui.contractSourceDisplay.onkeydown = (event) => {
            if (event.key === 'Escape') {
                this.ui.contractSourceDisplay.classList.add(this.elementCSS.hide);
            }
        };
        this.ui.onChainUTXO.onbeforeinput = (event) => {
            const eventTarget = event.target;
            if (event.data) {
                const hasPound = eventTarget.value.trim().includes('#') &&
                    !(eventTarget.selectionStart !== null && eventTarget.selectionEnd !== null && eventTarget.selectionStart !== eventTarget.selectionEnd && eventTarget.value.substring(eventTarget.selectionStart, eventTarget.selectionEnd).includes('#'));
                if (!RegExp(`^[a-f\\d]*${hasPound ? '' : '#{0,1}'}[\\d]*$`, 'i').test(event.data.replace(/\s+/g, ''))) {
                    event.preventDefault();
                }
            }
        };
        const reportUTXOError = (display, log) => {
            console.error(log ? log : display);
            this.setUIErrorResult(this.ui.onChainUTXOSearchResult, `${display}`);
        };
        this.ui.onChainUTXO.onchange = (event) => {
            const eventTarget = event.target;
            this.clearUIResult(this.ui.onChainUTXOSearchResult);
            try {
                const cleanedValueStr = eventTarget.value.replace(/\s+/g, '');
                if (!cleanedValueStr || helios.TxOutputId.fromProps(cleanedValueStr)) {
                    this.setUIResult(eventTarget, cleanedValueStr);
                }
            }
            catch (error) {
                eventTarget.classList.add(this.elementCSS.results.invalid);
                reportUTXOError(`UTXO parsing fail (${error}) expected format is: 0123456789abcdef0123456789ABCDEF0123456789abcdef0123456789ABCDEF#123`, error);
            }
        };
        this.ui.onChainUTXOSearch.onclick = () => {
            this.ui.onChainUTXOSearch.classList.remove(this.elementCSS.shimmer);
            this.clearUIResult(this.ui.onChainUTXOSearchResult);
            [this.ui.onChainUTXO, this.ui.datumCbor, this.ui.utxoBalance].forEach(element => setValueNotifyChange(element, ''));
            try {
                if (!this.useLocalConnector && (!this.blockfrost.network || !this.blockfrost.projectId)) {
                    this.ui.onChainUTXOSearch.disabled = true;
                    throw "Error: Blockfrost configuration missing, check browser console for more information.";
                }
                const connector = this.useLocalConnector ? new CardanoCLI() : new Blockfrost(this.blockfrost.projectId, this.blockfrost.network);
                const utxoNotFoundErrorMsg = "Contract UTXO not found, make sure you are on right network, check for updates or try again later.";
                connector.getInlineDatumUTXOs(this.getContractAddress()).then(utxos => {
                    const config = this.getContractConfiguration();
                    const beacon = `${config.token.mintingPolicyHash}.${config.token.nameBytesBeacon}`;
                    // const contractUTXOs = utxos.filter(inlineDatumUTXO => Object.entries(inlineDatumUTXO.values).some(value => value[0] === beacon && value[1] === 1n));
                    const configuredSeller = helios.PubKeyHash.fromProps(config.sellerPublicKeyHash);
                    const contractUTXOs = utxos.filter(inlineDatumUTXO => {
                        return configuredSeller.eq(Incy.MakeDatum(inlineDatumUTXO.inlineDatumCBOR).seller) &&
                            Object.entries(inlineDatumUTXO.values).some(value => value[0] === beacon && value[1] === 1n);
                    });
                    if (contractUTXOs.length < 1)
                        throw utxoNotFoundErrorMsg;
                    if (contractUTXOs.length > 1) {
                        // Lowest counter first
                        contractUTXOs.sort((a, b) => Number(Incy.MakeDatum(a.inlineDatumCBOR).counter) - Number(Incy.MakeDatum(b.inlineDatumCBOR).counter));
                    }
                    return contractUTXOs[0];
                }).then(contractUTXO => {
                    setValueNotifyChange(this.ui.onChainUTXO, contractUTXO.txId);
                    setValueNotifyChange(this.ui.datumCbor, contractUTXO.inlineDatumCBOR);
                    setValueNotifyChange(this.ui.utxoBalance, Object.entries(contractUTXO.values).reduce((combinedStr, valuePair) => {
                        const [token, quantity] = valuePair;
                        if (combinedStr.length)
                            combinedStr += '\n';
                        combinedStr += `${quantity} ${token}`;
                        return combinedStr;
                    }, ''));
                }).catch(reason => {
                    if (typeof reason === 'object' && Object.hasOwn(reason, "message") && /404 Not Found/i.test(reason.message)) {
                        reportUTXOError(utxoNotFoundErrorMsg);
                    }
                    else
                        reportUTXOError(reason);
                });
            }
            catch (error) {
                reportUTXOError(error);
            }
        };
        const setVisibilityFor = (setVisible, button, element) => {
            setVisible ? element.classList.remove(this.elementCSS.hide) : element.classList.add(this.elementCSS.hide);
            button.value = setVisible ? '⬆️' : '🔽';
            const [strDisplay, strHide] = ['show', 'hide'];
            button.title = button.title.replace(setVisible ? strDisplay : strHide, !setVisible ? strDisplay : strHide);
        };
        const setUtxoDetailsDisplayVisibility = (setVisible) => setVisibilityFor(setVisible, this.ui.utxoDetailsVisibilityToggle, this.ui.utxoDetails);
        this.ui.utxoDetailsVisibilityToggle.onclick = () => setUtxoDetailsDisplayVisibility(this.ui.utxoDetails.classList.contains(this.elementCSS.hide));
        this.ui.datumCbor.onbeforeinput = onBeforeInputHexOnly;
        this.ui.datumCbor.onchange = (event) => {
            const eventTarget = event.target;
            const HideCSS_InvalidCbor = this.elementCSS.hide + '-invalid-cbor';
            try {
                this.clearUIResult(this.ui.datumParseResult);
                const cleanedValueStr = event.target.value.replace(/\s+/g, '');
                if (cleanedValueStr) {
                    const datum = Incy.MakeDatum(cleanedValueStr);
                    this.contract?.setDatum(datum);
                    setValueNotifyChange(this.ui.datumSellerHashOut, datum.seller.hex);
                    setValueNotifyChange(this.ui.datumCounterOut, datum.counter.toString());
                    setValueNotifyChange(this.ui.datumStakeHexOut, datum.staking);
                    this.ui.buyAmount.dispatchEvent(new Event('change'));
                }
                else {
                    [this.ui.datumSellerHashOut, this.ui.datumCounterOut, this.ui.datumStakeHexOut].forEach(element => {
                        clearValueNotifyChange(element);
                    });
                }
                this.setUIResult(eventTarget, cleanedValueStr);
                this.ui.datumParsed.classList.remove(HideCSS_InvalidCbor);
                this.ui.datumDisplayToggle.disabled = false;
            }
            catch (error) {
                console.error(error);
                this.setUIErrorResult(this.ui.datumParseResult, `Datum Cbor not valid: (${error})`);
                this.ui.datumCbor.classList.add(this.elementCSS.results.invalid);
                this.ui.datumParsed.classList.add(HideCSS_InvalidCbor);
                this.ui.datumDisplayToggle.disabled = true;
            }
        };
        const setDatumDisplayVisibility = (setVisible) => setVisibilityFor(setVisible, this.ui.datumDisplayToggle, this.ui.datumParsed);
        this.ui.datumDisplayToggle.onclick = () => setDatumDisplayVisibility(this.ui.datumParsed.classList.contains(this.elementCSS.hide));
        this.ui.utxoBalance.placeholder = `Current contract UTXO balance in the following format:` +
            `\n1 ${this.getContractConfiguration().token.mintingPolicyHash}.${this.getContractConfiguration().token.nameBytesBeacon}` +
            `\n45,000,000,000,000,000 ${this.getContractConfiguration().token.mintingPolicyHash}.${this.getContractConfiguration().token.nameBytes}` +
            `\n123,456,789 lovelace`;
        this.ui.utxoBalance.onchange = (event) => {
            this.clearUIResult(this.ui.utxoBalanceParseResult);
            const eventTarget = event.target;
            const inputStr = eventTarget.value.trim();
            try {
                if (inputStr) {
                    const heliosValue = helios.createHeliosValue(inputStr);
                    const config = this.getContractConfiguration();
                    const tokensOnScript = heliosValue.assets.get(config.token.mintingPolicyHash, config.token.nameBytes);
                    this.ui.buyAmount.max = tokensOnScript ? (BigInt(tokensOnScript) / config.priceStepSize).toString() : '';
                    this.setUIResult(eventTarget, inputStr);
                }
            }
            catch (error) {
                console.error(error);
                this.setUIErrorResult(this.ui.utxoBalanceParseResult, `UTXO balance not valid: (${error})`);
                eventTarget.classList.add(this.elementCSS.results.invalid);
            }
        };
        const onKeyInputModifier = (event) => {
            if (event.type === 'keydown') {
                const [isArrowDown, isArrowUp] = [event.key === 'ArrowDown', event.key === 'ArrowUp'];
                const dir = isArrowUp ? 1n : isArrowDown ? -1n : 0n;
                if (dir !== 0n) {
                    event.preventDefault();
                    const multiplier = event.ctrlKey && event.shiftKey && event.altKey ? 100000n :
                        event.ctrlKey && event.shiftKey ? 10000n : event.shiftKey ? 1000n :
                            event.ctrlKey ? 100n : event.altKey ? 10n : 1n;
                    const eventTarget = event.target;
                    const stepSize = (() => {
                        try {
                            const step = BigInt(eventTarget.step);
                            return (step > 0n ? step : 1n);
                        }
                        catch (error) { }
                        return 1n;
                    })();
                    const step = stepSize * dir;
                    let valueAsBigInt = BigInt(eventTarget.value) + (step * multiplier);
                    if (event.altKey) {
                        const roundTo = stepSize * 10n;
                        if (valueAsBigInt % roundTo) {
                            valueAsBigInt = (valueAsBigInt / roundTo * roundTo);
                        }
                    }
                    if (eventTarget.min) {
                        try {
                            const min = BigInt(eventTarget.min);
                            if (valueAsBigInt < min) {
                                valueAsBigInt = min;
                            }
                        }
                        catch (error) { }
                    }
                    if (eventTarget.max) {
                        try {
                            const max = BigInt(eventTarget.max);
                            if (valueAsBigInt > max) {
                                valueAsBigInt = max;
                            }
                        }
                        catch (error) { }
                    }
                    setValueNotifyChange(eventTarget, valueAsBigInt.toString());
                }
            }
        };
        this.ui.buyAmount.onkeydown = onKeyInputModifier;
        this.ui.buyAmount.onkeyup = onKeyInputModifier;
        this.ui.buyAmount.onchange = (event) => {
            const eventTarget = event.target;
            let valueAsBigInt = 1n;
            try {
                // Standard conversion
                valueAsBigInt = BigInt(eventTarget.value);
            }
            catch (error) {
                try {
                    // Typical scientific notion conversions.
                    valueAsBigInt = BigInt(Number(eventTarget.value));
                }
                catch (error) {
                    try {
                        // Insane scientific notions to max range.
                        if (eventTarget.max && Number(eventTarget.value) > Number(eventTarget.max)) {
                            valueAsBigInt = BigInt(eventTarget.max);
                        }
                    }
                    catch (error) { }
                }
            }
            try {
                if (eventTarget.min) {
                    const rangeMin = BigInt(eventTarget.min);
                    if (valueAsBigInt < rangeMin) {
                        valueAsBigInt = rangeMin;
                    }
                }
            }
            catch (error) { }
            try {
                if (eventTarget.max) {
                    const rangeMax = BigInt(eventTarget.max);
                    if (valueAsBigInt > rangeMax) {
                        valueAsBigInt = rangeMax;
                    }
                }
            }
            catch (error) { }
            eventTarget.value = valueAsBigInt.toString();
            const priceStepSize = this.getContractConfiguration().priceStepSize;
            const networkBuyAmount = valueAsBigInt * priceStepSize;
            this.ui.buyTokensOut.value = `${formatNumber(this.token.decimals ? networkBuyAmount / BigInt(Math.pow(10, this.token.decimals)) : networkBuyAmount)} ${this.token.name}`;
            const price = this.contract?.calculatePrice(networkBuyAmount, this.contract.getDatumCounter());
            const formatPrice = (price) => {
                return price >= 1000000n ? `${formatNumber(Number(price) / (1_000_000))} ADA` : `${formatNumber(price)} lovelace`;
            };
            this.ui.buyLovelaceOut.value = price ? formatPrice(price) : '? lovelace';
            this.ui.tokenAVGPrice.textContent = price ? `avg: ${formatPrice(price / valueAsBigInt)}` : '';
        };
        this.ui.deliveryAddress.onchange = (event) => {
            const eventTarget = event.target;
            const isValidAddress = helios.isValidAddress(eventTarget.value);
            if (eventTarget.value && !isValidAddress) {
                eventTarget.classList.add(this.elementCSS.results.invalid);
            }
            else {
                eventTarget.classList.remove(this.elementCSS.results.invalid);
            }
        };
        this.ui.buyTokens.onclick = () => {
            const [functionTag, uiResultInfo] = ["buyTx():", this.ui.buyTokensResult];
            const reportError = (error, isSubmitError) => {
                let errorMsg = (typeof error === 'string' ? error : error.info !== undefined && typeof error.info === 'string' ? error.info : `${error}`).trim();
                const displayUTXOBalanceError = () => {
                    errorMsg = `On-chain UTXO balance invalid or missing.` + '\n' + errorMsg;
                    setUtxoDetailsDisplayVisibility(true);
                    this.ui.utxoBalance.classList.add(this.elementCSS.results.invalid);
                };
                if (isSubmitError) {
                    if (/ExtraneousScriptWitnessesUTXOW/i.test(errorMsg)) {
                        errorMsg = `Check on-chain UTXO; it has most likely changed.` + '\n' + errorMsg;
                    }
                    else if (/PPViewHashesDontMatch/i.test(errorMsg) && (errorMsg.match(/PredFailure/gi) || []).length == 1) {
                        errorMsg = `Check your network parameter (${this.networkParams}) cost-model.` + '\n' + errorMsg;
                    }
                    else if (/ValueNotConservedUTxO/i.test(errorMsg)) {
                        displayUTXOBalanceError();
                    }
                }
                else {
                    if (!helios.isValidOutputId(this.ui.onChainUTXO.value)) {
                        errorMsg = `On-chain UTXO invalid or missing.` + '\n' + errorMsg;
                        this.ui.onChainUTXO.classList.add(this.elementCSS.results.invalid);
                    }
                    else if (errorMsg.includes('non-positive token amounts detected')) {
                        displayUTXOBalanceError();
                    }
                }
                console.error(functionTag, error);
                this.setUIErrorResult(uiResultInfo, errorMsg);
            };
            this.clearUIResult(uiResultInfo);
            try {
                this.buildTx(this.ui.onChainUTXO.value, helios.createHeliosValue(this.ui.utxoBalance.value), BigInt(this.ui.buyAmount.value) * this.getContractConfiguration().priceStepSize, this.ui.deliveryAddress.value ? helios.Address.fromProps(this.ui.deliveryAddress.value) : undefined).then(unsignedTx => {
                    if (!this.wallet)
                        throw "!this.wallet";
                    return Promise.all([unsignedTx, this.wallet.handle.signTx(unsignedTx.toCborHex(), true)]);
                }).then(([unsignedTx, signCbor]) => {
                    return unsignedTx.addSignatures(helios.TxWitnesses.fromCbor(helios.hexToBytes(signCbor)).signatures).toCborHex();
                }).then(signedCbor => {
                    if (!this.wallet)
                        throw "!this.wallet";
                    this.wallet.handle.submitTx(signedCbor).then((result) => {
                        const submitResult = (/^[a-f\d]+$/i.test(result.trim()) ? `Transaction successfully submitted, transaction id: ${result}` : result).trim();
                        console.log(functionTag, submitResult);
                        this.setUIResult(uiResultInfo, submitResult);
                        this.ui.onChainUTXOSearch.classList.add(this.elementCSS.shimmer);
                    }).catch(reason => reportError(reason, true));
                }).catch(reason => reportError(reason));
            }
            catch (error) {
                reportError(error);
            }
        };
        const setAdvancedBuyDetailsVisibility = (setVisible) => {
            setVisibilityFor(setVisible, this.ui.buyAdvanced, this.ui.advancedBuyDetails);
            this.ui.buyTokens.disabled = setVisible;
            if (setVisible) {
                this.ui.buyTokensResult.classList.add(this.elementCSS.hide);
            }
            else if (this.ui.buyTokensResult.textLength) {
                this.ui.buyTokensResult.classList.remove(this.elementCSS.hide);
            }
        };
        this.ui.buyAdvanced.onclick = () => setAdvancedBuyDetailsVisibility(this.ui.advancedBuyDetails.classList.contains(this.elementCSS.hide));
        this.ui.advancedBuildTx.onclick = () => this.uiBuildTx();
        this.ui.advancedBuildTxCbor.onchange = (event) => {
            const eventTarget = event.target;
            const cleanedValueStr = eventTarget.value.replace(/\s+/g, '');
            const assumedValid = cleanedValueStr.length > 0;
            this.ui.advancedSignTx.disabled = !assumedValid;
            clearValueNotifyChange(this.ui.advancedSignTxCbor);
        };
        this.ui.advancedSignTx.onclick = () => this.uiSignTx();
        this.ui.advancedSignTxCbor.onchange = (event) => {
            const eventTarget = event.target;
            const cleanedValueStr = eventTarget.value.replace(/\s+/g, '');
            const assumedValid = cleanedValueStr.length > 0;
            this.ui.advancedSubmitTx.disabled = !assumedValid;
            if (assumedValid) {
                this.clearUIResult(this.ui.advancedSubmitTxResult);
            }
            else {
                this.ui.advancedSubmitTxResult.classList.add(this.elementCSS.hide);
            }
        };
        this.ui.advancedSubmitTx.onclick = () => this.uiSubmitTx();
        let Focus;
        (function (Focus) {
            Focus[Focus["None"] = 0] = "None";
            Focus[Focus["Input"] = 2] = "Input";
            Focus[Focus["MouseOver"] = 4] = "MouseOver";
            Focus[Focus["HasFocus"] = 6] = "HasFocus";
        })(Focus || (Focus = {}));
        const resultsFocus = {};
        [this.ui.buyTokensResult, this.ui.advancedSubmitTxResult].forEach(element => {
            resultsFocus[element.id] = Focus.None;
            let elementFocus = resultsFocus[element.id];
            const onSubmitResultFocus = (newFocus) => {
                const hasFocus = newFocus & Focus.HasFocus;
                if (hasFocus) {
                    if (element.clientHeight < element.scrollHeight) {
                        element.style.height = `${element.scrollHeight}px`;
                    }
                }
                else if (element.style.height) {
                    element.style.height = '';
                }
                const classListToken = 'show-all';
                hasFocus ? element.classList.add(classListToken) : element.classList.remove(classListToken);
                elementFocus = newFocus;
            };
            element.onfocus = () => onSubmitResultFocus(elementFocus | Focus.Input);
            element.onblur = () => onSubmitResultFocus(elementFocus & ~Focus.Input);
            element.onmouseover = () => onSubmitResultFocus(elementFocus | Focus.MouseOver);
            element.onmouseleave = () => onSubmitResultFocus(elementFocus & ~Focus.MouseOver);
        });
        // Initialize as hidden
        setUtxoDetailsDisplayVisibility(false);
        setDatumDisplayVisibility(false);
        setAdvancedBuyDetailsVisibility(false);
        this.ui.buyTokensResult.classList.add(this.elementCSS.hide);
        this.ui.onChainUTXOSearch.classList.add(this.elementCSS.shimmer);
        notifyChangeFor(Object.values(this.ui).filter((value) => ![this.ui.contractAddressOut.id].includes(value.id)), [HTMLInputElement, HTMLTextAreaElement]);
    }
    uiBuildTx() {
        const [functionTag, uiResultInfo, uiResultData] = ["advancedBuildTx():", this.ui.advancedBuildTxResult, this.ui.advancedBuildTxCbor];
        this.clearUIResult(uiResultInfo);
        clearValueNotifyChange(uiResultData);
        const reportError = (error) => {
            console.error(functionTag, error);
            this.setUIErrorResult(uiResultInfo, typeof error === 'string' ? error : error.info !== undefined && typeof error.info === 'string' ? error.info : `${error}`);
        };
        try {
            this.buildTx(this.ui.onChainUTXO.value, helios.createHeliosValue(this.ui.utxoBalance.value), BigInt(this.ui.buyAmount.value) * this.getContractConfiguration().priceStepSize, this.ui.deliveryAddress.value ? helios.Address.fromProps(this.ui.deliveryAddress.value) : undefined).then(tx => {
                setValueNotifyChange(uiResultData, tx.toCborHex());
            }).catch(reason => reportError(reason));
        }
        catch (error) {
            reportError(error);
        }
    }
    uiSignTx() {
        const [functionTag, uiResultInfo, uiResultData] = ["advancedSignTx():", this.ui.advancedSignTxResult, this.ui.advancedSignTxCbor];
        this.clearUIResult(uiResultInfo);
        clearValueNotifyChange(uiResultData);
        const reportError = (error) => {
            console.error(functionTag, error);
            this.setUIErrorResult(uiResultInfo, typeof error === 'string' ? error : error.info !== undefined && typeof error.info === 'string' ? error.info : `${error}`);
        };
        try {
            if (!this.wallet)
                throw "!this.wallet";
            const tx = helios.Tx.fromCbor(this.ui.advancedBuildTxCbor.value);
            this.wallet.handle.signTx(tx.toCborHex(), true).then(signedCbor => {
                tx.addSignatures(helios.TxWitnesses.fromCbor(helios.hexToBytes(signedCbor)).signatures);
                setValueNotifyChange(uiResultData, tx.toCborHex());
            }).catch(reason => reportError(reason));
        }
        catch (error) {
            reportError(error);
        }
    }
    uiSubmitTx() {
        const [functionTag, uiResultInfo] = ["advancedSubmitTx():", this.ui.advancedSubmitTxResult];
        this.clearUIResult(uiResultInfo);
        const reportError = (error) => {
            let errorMsg = (typeof error === 'string' ? error : error.info !== undefined && typeof error.info === 'string' ? error.info : `${error}`).trim();
            if (/ExtraneousScriptWitnessesUTXOW/i.test(errorMsg)) {
                errorMsg = `Check on-chain UTXO; it has most likely changed.` + '\n' + errorMsg;
            }
            else if (/PPViewHashesDontMatch/i.test(errorMsg) && (errorMsg.match(/PredFailure/gi) || []).length == 1) {
                errorMsg = `Check your network parameter (${this.networkParams}) cost-model.` + '\n' + errorMsg;
            }
            console.error(functionTag, error);
            this.setUIErrorResult(uiResultInfo, errorMsg);
        };
        try {
            if (!this.wallet)
                throw "!this.wallet";
            const cbor = this.ui.advancedSignTxCbor.value;
            this.wallet.handle.submitTx(cbor).then((result) => {
                const submitResult = (/^[a-f\d]+$/i.test(result.trim()) ? `Transaction successfully submitted, transaction id: ${result}` : result).trim();
                console.log(functionTag, submitResult);
                this.setUIResult(uiResultInfo, submitResult);
                this.ui.onChainUTXOSearch.classList.add(this.elementCSS.shimmer);
            }).catch(reason => reportError(reason));
        }
        catch (error) {
            reportError(error);
        }
    }
    async buildTx(contractUtxo, contractBalance, buyAmount, deliveryAddress) {
        if (!this.contract)
            throw "!this.contract";
        if (!this.wallet)
            throw "!this.wallet";
        const [changeAddressCbor, utxosCbor] = await Promise.all([
            this.wallet.handle.getChangeAddress(),
            this.wallet.handle.getUtxos(helios.Value.fromProps(this.contract.calculatePrice(buyAmount, this.contract.getDatumCounter()) + this.feeAllocation).toCborHex())
        ]);
        if (!utxosCbor || utxosCbor.length < 1)
            throw "!wallet utxos, balance below total purchase price?";
        const changeAddress = helios.Address.fromProps(changeAddressCbor);
        const tx = this.contract.buyTx(buyAmount, {
            datum: { seller: this.contract.getDatumSeller(), counter: this.contract.getDatumCounter(), staking: this.contract.getDatumStaking() },
            balance: contractBalance,
            contractUTXO: helios.TxOutputId.fromProps(contractUtxo),
            tokenReceiver: deliveryAddress ?? changeAddress
        }, utxosCbor.map(cbor => helios.TxInput.fromFullCbor(helios.hexToBytes(cbor))), this.isTestnet).addSigner(changeAddress.pubKeyHash);
        return fetch(this.networkParams)
            .then(response => response.json())
            .then(json => tx.finalize(new helios.NetworkParams(json), changeAddress));
    }
}
//# sourceMappingURL=BuyIncy.js.map