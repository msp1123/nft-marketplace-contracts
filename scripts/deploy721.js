// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.

// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const hre = require("hardhat");
const { ethers } = require("hardhat");
const { utils } = ethers;

async function main () {

    // Hardhat always runs the compile task when running scripts with its command
    // line interface.

    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');
    // We get the contract to deploy
    
    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens once its transaction has been
    // mined.
    
    // let ProxyRegistry = await ethers.getContractFactory("ProxyRegistry");
    // let proxyRegistry = await ProxyRegistry.deploy();
    
    // await proxyRegistry.deployed();
    // let proxyRegistryAddress = proxyRegistry.address;
    
    let owner;
    let NftContract = await ethers.getContractFactory("NFT721");
    let MarketContract = await ethers.getContractFactory("Market721");
    [owner] = await ethers.getSigners();

    console.log("Owner:", owner.address);
   
    let tokenSymbol = "NFT";
    let contractName = "NFTMarketplace";
    let feeAddress = "0x1652149105D6d5F41844B1104499d0C2E4930ee7";
    let platformCommission = 5;
    
    let nftContract = await NftContract.deploy(
        contractName,
        tokenSymbol
    );
    
    await nftContract.deployed();
    console.log("NFT721 contract deployed at:", nftContract.address);

    let marketContract = await MarketContract.deploy(
        nftContract.address,
        feeAddress,
        platformCommission
    );

    await marketContract.deployed();
    console.log("Market721 contract deployed at:", marketContract.address);

    await nftContract.setApprovalForAll(marketContract.address, true);
    console.log("Market contract approved by NFT contract");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
