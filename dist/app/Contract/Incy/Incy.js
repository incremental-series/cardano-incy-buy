import * as helios from "../../helios/index.js";
import { getDataGenerators, getOnchainSource } from "./contract.js";
/**
 * Connects to onchain code source,
 * providing off-chain code functionality such as price calculation
 * and network communication data structures for usage and redemption.
 */
export class Incy {
    program;
    /**
     * Price calculation step size, i.e. the minimum amount of tokens that can be purchased.
     * Quantity of tokens must be divisible by this number with zero remainder.
     */
    priceStepSize;
    /** Amount of tokens sold before unit price increments. */
    priceGroupSize;
    contractIds = {
        token: 'TOKEN',
        priceStepSize: 'PRICE_STEP_SIZE',
        priceGroupSize: 'PRICE_GROUP_SIZE',
        adminEStop: 'ADMIN_ESTOP',
        datumSeller: 'DG_SELLER',
        datumCounter: 'DG_COUNTER',
        datumStaking: 'DG_STAKING',
        datum: 'DG_DATUM',
        stakingHash: 'DG_STAKE_PKH',
        stakingCred: 'DG_STAKING_CRED',
        purchaseAmount: 'DG_PURCHASE_AMOUNT',
        redeemerBuy: 'DG_REDEEMER_BUY'
    };
    stakingHash;
    constructor(config) {
        this.priceStepSize = config.priceStepSize;
        this.priceGroupSize = config.priceGroupSize;
        this.program = helios.Program.new(this.getProgramSource());
        if (this.priceStepSize < 1n)
            throw "this.priceStepSize < 1n";
        if (this.priceGroupSize < 1n)
            throw "this.priceGroupSize < 1n";
        if (config.counter !== undefined && config.counter < 0n)
            throw "config.counter < 0n";
        this.program.parameters[this.contractIds.token] = helios.AssetClass.fromProps(`${config.token.mintingPolicyHash}.${config.token.nameBytes}`);
        this.program.parameters[this.contractIds.priceStepSize] = this.priceStepSize;
        this.program.parameters[this.contractIds.priceGroupSize] = this.priceGroupSize;
        this.program.parameters[this.contractIds.adminEStop] = helios.PubKeyHash.fromProps(config.eStopPublicKeyHash);
        this.program.parameters[this.contractIds.datumSeller] = helios.PubKeyHash.fromProps(config.sellerPublicKeyHash);
        this.program.parameters[this.contractIds.datumCounter] = config.counter !== undefined ? config.counter : 0n;
        const stakingHash = config.stakeHex ? helios.StakeAddress.fromHex(config.stakeHex).stakingHash : null;
        if (stakingHash) {
            this.program.parameters[this.contractIds.stakingHash] = stakingHash;
            this.program.parameters[this.contractIds.datumStaking] = this.program.evalParam(this.contractIds.stakingCred).data.toCborHex();
        }
        this.stakingHash = stakingHash;
    }
    /** Onchain contract source. */
    static getContractSource() {
        return getOnchainSource();
    }
    /** Onchain contract source with offchain data generators. */
    getProgramSource() {
        return Incy.getContractSource() + getDataGenerators();
    }
    getContractAddress(isTestnet) {
        return helios.Address.fromHashes(this.getCompiledContract().validatorHash, this.stakingHash, isTestnet);
    }
    getCompiledContract() {
        return this.program.compile(true);
    }
    calculatePrice(buyAmount, datumCounter) {
        return Incy.calculatePrice(buyAmount, datumCounter, this.priceGroupSize, this.priceStepSize);
    }
    getDatum(datumValues) {
        if (datumValues)
            this.setDatum(datumValues);
        return this.program.evalParam(this.contractIds.datum).data;
    }
    setDatum(datumValues) {
        if (datumValues.counter !== undefined) {
            if (datumValues.counter < 0n)
                throw "datumValues.counter < 0n";
            this.program.parameters[this.contractIds.datumCounter] = datumValues.counter;
        }
        if (datumValues.seller)
            this.program.parameters[this.contractIds.datumSeller] = helios.PubKeyHash.fromProps(datumValues.seller);
        if (datumValues.staking)
            this.program.parameters[this.contractIds.datumStaking] = datumValues.staking;
    }
    getDatumCounter() {
        return helios.IntData.fromCbor(this.program.evalParam(this.contractIds.datumCounter).data.toCbor()).value;
    }
    getDatumSeller() {
        return helios.PubKeyHash.fromUplcData(this.program.evalParam(this.contractIds.datumSeller).data);
    }
    getDatumStaking() {
        return helios.ByteArrayData.fromCbor(this.program.evalParam(this.contractIds.datumStaking).data.toCbor()).hex;
    }
    getBuyRedeemer(purchaseAmount) {
        this.program.parameters[this.contractIds.purchaseAmount] = purchaseAmount;
        return this.program.evalParam(this.contractIds.redeemerBuy);
    }
    buyTx(buyAmount, onchain, paymentInputs, isTestnet) {
        const contractAddress = this.getContractAddress(isTestnet);
        const contractInput = new helios.TxInput(onchain.contractUTXO, new helios.TxOutput(contractAddress, onchain.balance, helios.Datum.inline(this.getDatum({ counter: onchain.datum.counter }))));
        const userPayment = new helios.Value(this.calculatePrice(buyAmount, onchain.datum.counter));
        const tokensBought = new helios.Value(0n, new helios.Assets([[helios.AssetClass.fromUplcData(this.program.evalParam(this.contractIds.token).data), buyAmount]]));
        return helios.Tx.new()
            .attachScript(this.getCompiledContract())
            .addInput(contractInput, this.getBuyRedeemer(buyAmount).data)
            .addInputs(paymentInputs)
            .addOutput(new helios.TxOutput(contractAddress, onchain.balance.add(userPayment).sub(tokensBought), helios.Datum.inline(this.getDatum({ counter: onchain.datum.counter + (buyAmount / this.priceStepSize) })))).addOutput(new helios.TxOutput(onchain.tokenReceiver, tokensBought));
    }
    static calculatePrice(buyAmount, datumCounter, priceGroupSize, priceStepSize) {
        if (buyAmount % priceStepSize) {
            throw new Error(`Non-zero division remainder for ${buyAmount} with ${priceStepSize}.`);
        }
        const Intmin = bigIntMin;
        function bigIntMin(a, b) { return (b < a) ? b : a; }
        const PRICE_GROUP_SIZE = priceGroupSize;
        const PRICE_STEP_SIZE = priceStepSize;
        ////////////////////////////////////////////////////////////////
        const buyUnits = buyAmount / PRICE_STEP_SIZE;
        const unitsA = /* Int::min */ Intmin(buyUnits, PRICE_GROUP_SIZE - (datumCounter % PRICE_GROUP_SIZE));
        const fullGroups = ((buyUnits - unitsA) / PRICE_GROUP_SIZE);
        const unitsB = fullGroups * PRICE_GROUP_SIZE;
        const unitsC = buyUnits - unitsA - unitsB;
        const groupIndex = (datumCounter / PRICE_GROUP_SIZE) + 1n;
        const priceA = unitsA * groupIndex;
        const incSum = (n) => { return (n * (n + 1n) / 2n); };
        const priceB = (incSum(groupIndex + fullGroups) - incSum(groupIndex)) * PRICE_GROUP_SIZE;
        const priceC = unitsC * (groupIndex + fullGroups + 1n);
        const result = priceA + priceB + priceC;
        return result;
    }
    static MakeDatum(cborBytes) {
        const datumTransferBuilder = Object.assign({}, {
            ret: {},
            buildIndex: 0n,
            ensureIndex: (currentIndex, shouldBe) => {
                if (currentIndex != shouldBe) {
                    throw new Error(`Unexpected index ${currentIndex} != ${shouldBe}`);
                }
            },
            transferByteArrayData: (bytes) => {
                if (datumTransferBuilder.buildIndex === 1n) {
                    datumTransferBuilder.ensureIndex(datumTransferBuilder.buildIndex++, 1n);
                    datumTransferBuilder.ret.seller = new helios.PubKeyHash(bytes);
                }
                else if (datumTransferBuilder.buildIndex === 2n) {
                    datumTransferBuilder.ensureIndex(datumTransferBuilder.buildIndex++, 2n);
                    datumTransferBuilder.ret.staking = helios.bytesToHex(bytes);
                }
            },
            transferIntData: (value) => {
                datumTransferBuilder.ensureIndex(datumTransferBuilder.buildIndex++, 0n);
                datumTransferBuilder.ret.counter = value;
            },
            transferListData: (items) => {
                if (items.length != 3) {
                    throw new Error("Unexpected length");
                }
            }
        }, {});
        helios.UplcData.fromCbor(cborBytes).transfer(datumTransferBuilder);
        datumTransferBuilder.ensureIndex(datumTransferBuilder.buildIndex, 3n);
        return datumTransferBuilder.ret;
    }
}
//# sourceMappingURL=Incy.js.map