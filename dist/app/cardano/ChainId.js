/**
 * The "network ID" identifies a network in the Cardano blockchain, it is included in every address and also
 * optionally present in the transaction body.
 *
 * This can only store 16 possibilities (4 bits).
 */
export var NetworkId;
(function (NetworkId) {
    NetworkId[NetworkId["Mainnet"] = 1] = "Mainnet";
    NetworkId[NetworkId["Testnet"] = 0] = "Testnet";
})(NetworkId || (NetworkId = {}));
/** Common Cardano NetworkMagics */
export var NetworkMagics;
(function (NetworkMagics) {
    NetworkMagics[NetworkMagics["Mainnet"] = 764824073] = "Mainnet";
    NetworkMagics[NetworkMagics["Preprod"] = 1] = "Preprod";
    NetworkMagics[NetworkMagics["Preview"] = 2] = "Preview";
    NetworkMagics[NetworkMagics["Sanchonet"] = 4] = "Sanchonet";
})(NetworkMagics || (NetworkMagics = {}));
/** Common Cardano ChainIds */
export const ChainIds = {
    Mainnet: {
        networkId: NetworkId.Mainnet,
        networkMagic: NetworkMagics.Mainnet
    },
    Preprod: {
        networkId: NetworkId.Testnet,
        networkMagic: NetworkMagics.Preprod
    },
    Preview: {
        networkId: NetworkId.Testnet,
        networkMagic: NetworkMagics.Preview
    },
    Sanchonet: {
        networkId: NetworkId.Testnet,
        networkMagic: NetworkMagics.Sanchonet
    }
};
//# sourceMappingURL=ChainId.js.map