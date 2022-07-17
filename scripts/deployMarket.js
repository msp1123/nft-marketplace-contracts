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
    
    let TokenAsset;
    let TokenMarket;
    let TokenStorage;
    
    let tokenAsset;
    let tokenMarket;
    let tokenStorage;
    
    let MINTER_ROLE = utils.keccak256(
        utils.toUtf8Bytes("MINTER_ROLE")
    );
    let STORAGE_ADMIN_ROLE = utils.keccak256(
        utils.toUtf8Bytes("STORAGE_ADMIN_ROLE")
    );
    
    let chainId = 4;
    let maxRoyalty = 10;
    let platformFee = 5;
    let symbol = "NFTMARKET";
    let name = "NFT Market Tokens";
    let platformAddress = "0x1652149105D6d5F41844B1104499d0C2E4930ee7";
    
    // rinkeby
    let proxyRegistryAddress = "0x1E525EEAF261cA41b809884CBDE9DD9E1619573A";
    // mainnet
    // let proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
    
    let owner;
    [owner] = await ethers.getSigners();
    let ownerBalance = await ethers.provider.getBalance(owner.address)
    console.log("Owner Address:", owner.address);
    console.log('Owner Balance:', ownerBalance.toString());
    
    TokenAsset = await ethers.getContractFactory("TokenAsset");
    TokenMarket = await ethers.getContractFactory("TokenMarket");
    TokenStorage = await ethers.getContractFactory("TokenStorage");
    
    tokenAsset = await TokenAsset.deploy(
        name,
        symbol,
        chainId
    );
    await tokenAsset.deployed();
    console.log(`Token Contract deployed at: ${tokenAsset.address}`);
    
    tokenStorage = await TokenStorage.deploy(
        platformFee,
        platformAddress
    );
    await tokenStorage.deployed();
    console.log(`Storage Contract deployed at: ${tokenStorage.address}`);
    
    tokenMarket = await TokenMarket.deploy(
        maxRoyalty,
        tokenAsset.address,
        tokenStorage.address
    );
    await tokenMarket.deployed();
    console.log(`Market Contract deployed at: ${tokenMarket.address}`);

    let grantMinterRole = await tokenAsset.grantRole(MINTER_ROLE, tokenMarket.address);
    await grantMinterRole.wait();
    console.log("Minter Role granted by Asset contract");
    
    let grantStorageRole = await tokenStorage.grantRole(STORAGE_ADMIN_ROLE, tokenMarket.address);
    await grantStorageRole.wait()
    console.log("Storage Admin Role granted by storage contract");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
