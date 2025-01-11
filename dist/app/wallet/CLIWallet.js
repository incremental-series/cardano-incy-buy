import { APIErrorCode, NetworkId } from "../cardano/index.js";
import * as helios from "../helios/index.js";
export class CLIWallet {
    apiVersion = '0.1.0';
    name = 'CLIWallet';
    icon = `data:image/svg+xml;utf8,<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle r="22" cx="24" cy="24" stroke="silver" stroke-width="3" fill="grey" opacity="0.5"/></svg>`;
    supportedExtensions = [{ cip: 30 }];
    isEnabled() { return new Promise(resolve => resolve(true)); }
    ;
    constructor() {
        const searchParams = new URLSearchParams(window.location.search);
        const addressParam = "address";
        if (!searchParams.has(addressParam)) {
            console.warn(`url param '${addressParam}' missing.`);
        }
        else {
            this.address = searchParams.get(addressParam) || "";
        }
        const signKeyParams = "sign_key";
        if (!searchParams.has(signKeyParams)) {
            console.warn(`url param '${signKeyParams}' missing, cli signTx not usable.`);
        }
        else {
            this.signKeys = searchParams.getAll(signKeyParams);
        }
    }
    address = "";
    signKeys = [];
    networkId = "--testnet-magic 42";
    enable(_options) {
        if (!this.address) {
            console.warn("CLIWallet address is not set, wallet cannot be used.");
            throw { code: APIErrorCode.InvalidRequest, info: `address not set` };
        }
        else {
            try {
                // dev: simple address validation; throws internally if bad address.
                new helios.Address(this.address);
            }
            catch (error) {
                if (error && Object.hasOwn(error, "message")) {
                    throw { code: APIErrorCode.InvalidRequest, info: error.message };
                }
                throw { code: APIErrorCode.InvalidRequest, info: `${error}` };
            }
        }
        return new Promise(resolve => setTimeout(() => {
            const walletApi = {
                getNetworkId: () => new Promise(resolve => resolve(NetworkId.Testnet)),
                getUtxos: (_amount, _paginate) => {
                    const url = "http://localhost:8000/cgi-bin/cardano-cli.py";
                    const params = `query utxo --address ${this.address} ${this.networkId} --output-json`;
                    return fetch(params ? `${url}?params=${encodeURIComponent(`${params}`)}` : url, {
                        keepalive: false,
                        signal: AbortSignal.timeout(5000)
                    }).then(value => {
                        if (value.status !== 200)
                            throw `Unexpected status code: ${value.status}: ${value.statusText}`;
                        return value.text();
                    }).then((value) => {
                        let cbors = [];
                        const utxos = JSON.parse(value);
                        for (const txin in utxos) {
                            const utxo = utxos[txin];
                            const outputId = new helios.TxOutputId(txin);
                            const address = new helios.Address(utxo.address);
                            const value = (() => {
                                let lovelace = 0n;
                                let nativeTokens = [];
                                for (const key in utxo.value) {
                                    const element = utxo.value[key];
                                    if (typeof element === 'object') {
                                        const mph = key;
                                        for (const nameBytes in element) {
                                            nativeTokens.push([`${mph}.${nameBytes}`, BigInt(element[nameBytes])]);
                                        }
                                    }
                                    else {
                                        lovelace += BigInt(element);
                                    }
                                }
                                return new helios.Value(lovelace, nativeTokens);
                            })();
                            const output = new helios.TxOutput(address, value);
                            const data = new helios.TxInput(outputId, output);
                            cbors.push(helios.bytesToHex(data.toFullCbor()));
                        }
                        return cbors;
                    }).catch(error => {
                        if (error) {
                            if (typeof error === "string") {
                                throw { code: APIErrorCode.InternalError, info: error };
                            }
                            else if (Object.hasOwn(error, "message")) {
                                if (Object.hasOwn(error, "name")) {
                                    throw { code: APIErrorCode.InternalError, info: `${error.name}: ${error.message}, code: ${error.code}` };
                                }
                                throw { code: APIErrorCode.InternalError, info: error.message };
                            }
                        }
                        throw { code: APIErrorCode.InternalError, info: `${error}` };
                    });
                },
                getBalance: () => {
                    return new Promise(success => setTimeout(success, 0, walletApi.getUtxos().then(cbors => {
                        return cbors?.reduce((previousValue, currentValue) => {
                            return previousValue.add(helios.TxInput.fromFullCbor(helios.hexToBytes(currentValue)).value);
                        }, new helios.Value(0n)).toCborHex();
                    })));
                },
                // getCollateral: GetCollateral,
                // getExtensions: GetExtensions,
                // getUsedAddresses: GetUsedAddresses,
                // getUnusedAddresses: GetUnusedAddresses,
                getChangeAddress: () => {
                    return new Promise(success => setTimeout(success, 0, new helios.Address(this.address).toHex()));
                },
                // getRewardAddresses: GetRewardAddresses,
                signTx: (tx, _partialSign) => {
                    const formData = new FormData();
                    formData.append("tx_body", JSON.stringify({
                        type: "Unwitnessed Tx BabbageEra",
                        description: "Ledger Cddl Format",
                        cborHex: tx
                    }));
                    if (this.signKeys.length < 1) {
                        throw { code: APIErrorCode.InvalidRequest, info: "missing signKeys" };
                    }
                    formData.append("signing_keys", this.signKeys.join(" "));
                    formData.append("network_id", this.networkId);
                    return fetch("http://localhost:8000/cgi-bin/cardano-cli-sign.py", {
                        method: "POST",
                        body: formData,
                        keepalive: false,
                        signal: AbortSignal.timeout(5000)
                    }).then(value => {
                        if (value.status !== 200)
                            throw `Unexpected status code: ${value.status}: ${value.statusText}`;
                        return value.text();
                    }).then(text => {
                        if (text.startsWith('Error:')) {
                            throw text;
                        }
                        const cborHex = JSON.parse(text).cborHex;
                        // if (_partialSign) {
                        //   return helios.Tx.fromCbor(cborHex).witnesses.toCborHex();
                        // }
                        // return cborHex;
                        return helios.Tx.fromCbor(cborHex).witnesses.toCborHex();
                    }).catch(error => {
                        if (error) {
                            if (typeof error === "string") {
                                throw { code: APIErrorCode.InternalError, info: error };
                            }
                            else if (Object.hasOwn(error, "message")) {
                                if (Object.hasOwn(error, "name")) {
                                    throw { code: APIErrorCode.InternalError, info: `${error.name}: ${error.message}, code: ${error.code}` };
                                }
                                throw { code: APIErrorCode.InternalError, info: error.message };
                            }
                        }
                        throw { code: APIErrorCode.InternalError, info: `${error}` };
                    });
                },
                // signData: SignData,
                submitTx: (tx) => {
                    const formData = new FormData();
                    formData.append("params", this.networkId);
                    formData.append("tx_file_data", JSON.stringify({
                        "type": "Witnessed Tx BabbageEra",
                        "description": "Ledger Cddl Format",
                        "cborHex": tx
                    }));
                    return fetch("http://localhost:8000/cgi-bin/cardano-cli-submit.py", {
                        method: "POST",
                        body: formData,
                        keepalive: false,
                        signal: AbortSignal.timeout(5000)
                    }).then(value => {
                        if (value.status !== 200)
                            throw `Unexpected status code: ${value.status}: ${value.statusText}`;
                        return value.text();
                    }).then(text => {
                        if (text.startsWith('Error:')) {
                            throw text;
                        }
                        return text;
                    }).catch(error => {
                        if (error) {
                            if (typeof error === "string") {
                                throw { code: APIErrorCode.InternalError, info: error };
                            }
                            else if (Object.hasOwn(error, "message")) {
                                if (Object.hasOwn(error, "name")) {
                                    throw { code: APIErrorCode.InternalError, info: `${error.name}: ${error.message}, code: ${error.code}` };
                                }
                                throw { code: APIErrorCode.InternalError, info: error.message };
                            }
                        }
                        throw { code: APIErrorCode.InternalError, info: `${error}` };
                    });
                },
                // experimental?: any,
            };
            resolve(walletApi);
        }, 0));
    }
}
//# sourceMappingURL=CLIWallet.js.map