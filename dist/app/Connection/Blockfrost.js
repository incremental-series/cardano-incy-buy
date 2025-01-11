export class Blockfrost {
    network;
    projectId;
    constructor(projectId, network = "mainnet") {
        this.projectId = projectId;
        this.network = network;
    }
    queryAddressUTXOs(address) {
        return fetch(`https://cardano-${this.network}.blockfrost.io/api/v0/addresses/${address}/utxos`, {
            headers: {
                project_id: this.projectId
            }
        }).then(response => {
            if (!response.ok) {
                if (response.status === 403)
                    throw new Error(`Blockfrost ${response.status} Forbidden: Check projectId and network configuration.`);
                if (response.status === 404)
                    throw new Error(`Blockfrost ${response.status} Not Found: Does address not exist on chain?`);
                throw new Error(`Blockfrost response ${response.status}`);
            }
            return response.text();
        });
    }
    getUTXOs(address) {
        return this.queryAddressUTXOs(address).then(value => Blockfrost._getUTXOs(value));
    }
    getInlineDatumUTXOs(address) {
        return this.queryAddressUTXOs(address).then(value => Blockfrost._getInlineDatumUTXOs(value));
    }
    static _getUTXOs(json) {
        function _toQueryUTXO(json) {
            return JSON.parse(json);
        }
        return _toQueryUTXO(json).map(queryUTXO => {
            const obj = {
                txId: `${queryUTXO.tx_hash}#${queryUTXO.output_index}`,
                values: queryUTXO.amount.reduce((indexedArray, token) => {
                    if (token.unit === 'lovelace') {
                        indexedArray[token.unit] = BigInt(token.quantity);
                    }
                    else {
                        // Minting policy is 28 bytes, i.e. 56 characters.
                        const [mph, nameBytes] = [token.unit.substring(0, 56), token.unit.substring(56)];
                        indexedArray[`${mph}.${nameBytes}`] = BigInt(token.quantity);
                    }
                    return indexedArray;
                }, {})
            };
            if (queryUTXO.data_hash)
                obj.datumhash = queryUTXO.data_hash;
            if (queryUTXO.inline_datum)
                obj.inlineDatumCBOR = queryUTXO.inline_datum;
            return obj;
        });
    }
    static _getInlineDatumUTXOs(json) {
        return this._getUTXOs(json).filter(element => element.datumhash && element.inlineDatumCBOR);
    }
}
//# sourceMappingURL=Blockfrost.js.map