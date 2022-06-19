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
    
    let NftContract721;
    let NftContract1155;
    let StorageContract
    let MarketContract;

    let nftContract721;
    let nftContract1155;
    let storageContract;
    let marketContract;
    
    let MINTER_ROLE = utils.keccak256(
        utils.toUtf8Bytes("MINTER_ROLE")
    );
    let STORAGE_ADMIN_ROLE = utils.keccak256(
        utils.toUtf8Bytes("STORAGE_ADMIN_ROLE")
    );
    
    let maxRoyalty = 10;
    let platformFee = 5;
    let feeAddress = "0x1652149105D6d5F41844B1104499d0C2E4930ee7";
    
    // rinkeby
    let proxyRegistryAddress = "0x1E525EEAF261cA41b809884CBDE9DD9E1619573A";
    // mainnet
    // let proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
    
    let owner;
    [owner] = await ethers.getSigners();
    let ownerBalance = await ethers.provider.getBalance(owner.address)
    console.log("Owner Address:", owner.address);
    console.log('Owner Balance:', ownerBalance.toString());
    
    NftContract721 = await ethers.getContractFactory("NftContract721");
    NftContract1155 = await ethers.getContractFactory("NftContract1155");
    StorageContract = await ethers.getContractFactory("TokenStorage");
    MarketContract = await ethers.getContractFactory("TokenMarket");
    
    nftContract721 = await NftContract721.deploy(
        proxyRegistryAddress
    );
    await nftContract721.deployed();
    console.log(`Nft Contract 721 address: ${nftContract721.address}`);
    
    nftContract1155 = await NftContract1155.deploy(
        proxyRegistryAddress
    );
    await nftContract1155.deployed();
    console.log(`Nft Contract 1155 address: ${nftContract1155.address}`);
    
    storageContract = await StorageContract.deploy(
        platformFee,
        feeAddress
    );
    await storageContract.deployed();
    console.log(`Storage Contract address: ${storageContract.address}`);
    
    marketContract = await MarketContract.deploy(
        maxRoyalty,
        nftContract721.address,
        nftContract1155.address,
        storageContract.address
    );
    await marketContract.deployed();
    console.log(`Market Contract address: ${marketContract.address}`);

    await nftContract721.grantRole(MINTER_ROLE, marketContract.address);
    console.log("Minter Role granted by 721 contract");
    
    await nftContract1155.grantRole(MINTER_ROLE, marketContract.address);
    console.log("Minter Role granted by 1155 contract");
    
    await storageContract.grantRole(STORAGE_ADMIN_ROLE, marketContract.address);
    console.log("Storage Admin Role granted by storage contract");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
