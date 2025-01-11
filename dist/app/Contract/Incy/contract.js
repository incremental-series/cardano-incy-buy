export function getOnchainSource() {
    return `spending incy

struct Datum {
  counter: Int
  seller: PubKeyHash
  staking: ByteArray
}

enum Redeemer {
  UserBuy {
    amount: Int
  }
  SellerRedeem {
    amount: Int
  }
  AdminClose
}

const TOKEN: AssetClass
const ADMIN_ESTOP: PubKeyHash
const PRICE_GROUP_SIZE: Int
const PRICE_STEP_SIZE: Int

func calculatePrice(buyAmount: Int, datumCounter: Int) -> Int {
  buyUnits: Int = buyAmount / PRICE_STEP_SIZE;
  unitsA: Int = Int::min(buyUnits, PRICE_GROUP_SIZE - (datumCounter % PRICE_GROUP_SIZE));
  fullGroups: Int = ((buyUnits - unitsA) / PRICE_GROUP_SIZE);
  unitsB: Int = fullGroups * PRICE_GROUP_SIZE;
  unitsC: Int = buyUnits - unitsA - unitsB;
  groupIndex: Int = (datumCounter / PRICE_GROUP_SIZE) + 1;
  priceA: Int = unitsA * groupIndex;
  incSum = (n: Int) -> { (n * (n + 1) / 2) };
  priceB: Int = (incSum(groupIndex + fullGroups) - incSum(groupIndex)) * PRICE_GROUP_SIZE;
  priceC: Int = unitsC * (groupIndex + fullGroups + 1);
  result: Int = priceA + priceB + priceC;
  result
}

func main(datum: Datum, redeemer: Redeemer, ctx: ScriptContext) -> Bool {
  tx: Tx = ctx.tx;
  isOutputGood = (requiredDatumOut: Datum, requiredValueOut: Value) -> Bool {
    ctx.get_cont_outputs().any(
      (txOut: TxOutput) -> Bool {
        datumOk: Bool = Datum::from_data(txOut.datum.get_inline_data()) == requiredDatumOut;
        valueOk: Bool = txOut.value == requiredValueOut;
        stakingOk: Bool = datum.staking == txOut.address.staking_credential.switch{
          None => #,
          Some{sc} => sc.serialize()
        };
        datumOk && valueOk && stakingOk
      }
    )
  };
  valueIn: Value = ctx.get_current_input().value;
  redeemer.switch {
    buy: UserBuy => {
      if (buy.amount < PRICE_STEP_SIZE) { error("buy.amount < PRICE_STEP_SIZE") }
      else if (buy.amount % PRICE_STEP_SIZE != 0) { error("buy.amount % PRICE_STEP_SIZE") }
      else {
        price: Int = calculatePrice(buy.amount, datum.counter);
        if (price < 1) { error("price < 1") }
        else {
          payment: Value = Value::lovelace(price);
          withdrawal: Value = Value::new(TOKEN, buy.amount);
          inputOk: Bool = valueIn.contains(withdrawal);
          outputOk: Bool = isOutputGood(datum.copy(counter: datum.counter + (buy.amount / PRICE_STEP_SIZE)), (valueIn + payment - withdrawal));
          inputOk && outputOk
        }
      }
    },
    redeem: SellerRedeem => {
      if (redeem.amount < 1) { error("redeem.amount") }
      else {
        withdrawal: Value = Value::lovelace(redeem.amount);
        inputOk: Bool = valueIn.contains(withdrawal);
        outputOk: Bool = isOutputGood(datum, (valueIn - withdrawal));
        inputOk && outputOk && tx.is_signed_by(datum.seller)
      }
    },
    else => tx.is_signed_by(ADMIN_ESTOP)
  }
}`;
}
export function getDataGenerators() {
    return `// Data generators
const DG_SELLER: PubKeyHash
const DG_COUNTER: Int
const DG_STAKING: ByteArray = #

const DG_DATUM: Datum = Datum {
  seller: DG_SELLER,
  counter: DG_COUNTER,
  staking: DG_STAKING
}
// Staking helper fields
const DG_STAKE_PKH: PubKeyHash = PubKeyHash::new(#)
const DG_STAKING_CRED: StakingCredential = StakingCredential::new_hash(StakingHash::new_stakekey(DG_STAKE_PKH))

const DG_PURCHASE_AMOUNT: Int
const DG_REDEEMER_BUY: Redeemer = Redeemer::UserBuy { DG_PURCHASE_AMOUNT }

const DG_REDEEM_AMOUNT: Int
const DG_REDEEMER_REDEEM: Redeemer = Redeemer::SellerRedeem { DG_REDEEM_AMOUNT }
const DG_REDEEMER_CLOSE: Redeemer = Redeemer::AdminClose`;
}
//# sourceMappingURL=contract.js.map