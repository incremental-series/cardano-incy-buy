import * as helios from "./index.js";
export function isValidAddress(address) {
    try {
        return !!helios.Address.fromProps(address);
    }
    catch (error) {
        return false;
    }
}
export function isValidOutputId(outputId) {
    try {
        return !!helios.TxOutputId.fromProps(outputId);
    }
    catch (error) {
        return false;
    }
}
export function createHeliosValue(multilineInput) {
    let value = new helios.Value();
    const strSplit = multilineInput.split(/\s/).filter(value => value);
    for (let i = 0; i < strSplit.length; ++i) {
        const quantity = BigInt(strSplit[i]);
        const isLastElement = i + 1 === strSplit.length;
        const isLovelace = !isLastElement ? /lovelace/i.test(strSplit[i + 1]) : false;
        const isDigitNext = !isLastElement ? /^\d+$/.test(strSplit[i + 1]) : false;
        if (isLastElement || isLovelace || isDigitNext) {
            value = value.add(helios.Value.fromProps(quantity));
            if (isLovelace)
                i += 1;
        }
        else {
            // Minting policy is 28 bytes, i.e. 56 characters.
            const [mph, tokenName] = [strSplit[i + 1].substring(0, 56), strSplit[i + 1].substring(56).replace(/^\./, '')];
            value = value.add(helios.Value.asset(mph, tokenName, quantity));
            i += 1;
        }
    }
    return value;
}
//# sourceMappingURL=utils.js.map