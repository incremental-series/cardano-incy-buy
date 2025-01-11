# cardano-incy-buy
This is a locally hostable website providing a connection to the on-chain buy-incy contract.  
Check the wiki for more information: https://github.com/incremental-series/cardano-incy-buy/wiki  

## How to automate contract on-chain data fetching with Blockfrost.io
URL example, with `localhost` and port `5501` for automated data-fetching: http://localhost:5501/dist/?blockfrost_project_id=mainnetqnWuO__LettersYouNeedToChange__Dg4&blockfrost_network=mainnet  
From which the `mainnetqnWuO__LettersYouNeedToChange__Dg4` has to be changed with your own fully functional ID, which you can retrieve from your account on https://blockfrost.io/dashboard

Connecting to that URL with the browser that has your Cardano wallet enabled is basically all that is needed.  
Will have to give permission from the wallet to access the DApp first, though.