import * as helios from "../helios/index.js";
const DEFAULT_PARAMS = {
    socketPath: "/tmp/cardano.socket",
    networkId: "--testnet-magic 42"
};
export class CardanoCLI {
    socketPath;
    networkId;
    constructor(socketPath, networkSwitch) {
        this.socketPath = socketPath || DEFAULT_PARAMS.socketPath;
        this.networkId = networkSwitch || DEFAULT_PARAMS.networkId;
    }
    queryAddressUTXOs(address) {
        const url = "http://localhost:8000/cgi-bin/cardano-cli.py";
        const params = `query utxo --address ${address} ${this.networkId} --output-json`;
        return fetch(params ? `${url}?params=${encodeURIComponent(`${params}`)}` : url, {
            keepalive: false,
            signal: AbortSignal.timeout(1500)
        }).then(value => {
            if (value.status !== 200)
                throw `Unexpected status code: ${value.status}: ${value.statusText}`;
            return value.text();
        });
    }
    getUTXOs(address) {
        return this.queryAddressUTXOs(address).then(value => CardanoCLI._getUTXOs(value));
    }
    getInlineDatumUTXOs(address) {
        return this.queryAddressUTXOs(address).then(value => CardanoCLI._getInlineDatumUTXOs(value));
    }
    static _getUTXOs(json) {
        function _toQueryUTXO(json) {
            return JSON.parse(json);
        }
        return Object.entries(_toQueryUTXO(json)).map(value => {
            const [key, queryUTXO] = value;
            const obj = {
                txId: key,
                values: (() => {
                    const indexedArray = {};
                    for (const key in queryUTXO.value) {
                        const element = queryUTXO.value[key];
                        if (typeof (element) === 'object') {
                            const mph = key;
                            for (const nameBytes in element) {
                                indexedArray[`${mph}.${nameBytes}`] = BigInt(element[nameBytes]);
                            }
                        }
                        else {
                            indexedArray[key] = BigInt(element);
                        }
                    }
                    return indexedArray;
                })()
            };
            if (queryUTXO.inlineDatum && queryUTXO.inlineDatumhash) {
                obj.datumhash = queryUTXO.inlineDatumhash;
                const listData = new helios.ListData(queryUTXO.inlineDatum.list.map(value => {
                    if (value['bytes'] !== undefined)
                        return new helios.ByteArrayData(helios.hexToBytes(value['bytes']));
                    else if (value['int'] !== undefined)
                        return new helios.IntData(BigInt(value['int']));
                    else
                        throw { "Missing parsing for...": value };
                }));
                obj.inlineDatumCBOR = listData.toCborHex();
            }
            else if (queryUTXO.datumhash) {
                obj.datumhash = queryUTXO.datumhash;
            }
            return obj;
        });
    }
    static _getInlineDatumUTXOs(json) {
        return this._getUTXOs(json).filter(element => element.datumhash && element.inlineDatumCBOR);
    }
}
//# sourceMappingURL=CardanoCLI.js.map