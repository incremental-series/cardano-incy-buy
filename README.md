# cardano-incy-buy
This is a locally hostable website providing a connection to the on-chain buy-incy contract.  
Check the wiki for more information: https://github.com/incremental-series/cardano-incy-buy/wiki  

# How to get started
1. Download the files from this repository.
1. Host the dist folder content however you prefer.
   - Such as with Python: `python3 -m http.server 5501`
   - Or simply by opening the folder in VS Code and using one of its extensions to do the hosting.
1. Connect to the website with your browser that has a Cardano wallet.
   - Such as: http://localhost:5501/dist/
   - For automated data fetching, add `blockfrost_project_id` and `blockfrost_network` to the URL parameters:
     - Such as: http://localhost:5501/dist/?blockfrost_project_id=mainnetqnWuO__LettersYouNeedToChange__Dg4&blockfrost_network=mainnet
       - From which the `mainnetqnWuO__LettersYouNeedToChange__Dg4` has to be changed with your own fully functional ID, which you can retrieve from your account on https://blockfrost.io/dashboard

## Contract details
The current contract address on mainnet is:
_addr1z95eh8ptmasf64k8wjsfcqp8rzl6lu9djs2ysmxrqd3gqh44v2qsyqa6sl8euv3qgg05nd2mupewypz99p597pdnjqxsdn6fz7_

This is only for information purposes, as the address is calculated and shown on the connected website. Furthermore, this package and the on-chain contract have several security checks in place to ensure the transactions are always with the right UTXO, tokens, and the contract address.

### Token Details
Policy ID: **0000001c1f5134859ee40556e75834b9929d1b393ab94858a3d27ae0**  
Asset Name: **494e4359**  
Total Supply: **100,000,000 INCY**  

<img src="https://github.com/user-attachments/assets/da4145f3-e7a2-4f16-9345-fcbed1f0b38f" width="256"/>  <img src="https://github.com/user-attachments/assets/1b2f426f-c97e-4ba6-b746-87d00f6fb003" width="256"/>

For more information about INCY: https://github.com/incremental-series/cardano-incy
