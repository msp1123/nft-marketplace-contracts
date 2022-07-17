const {expect} = require("chai");
const {ethers} = require("hardhat");
const {Min} = require("mocha/lib/reporters");
const {waitFor} = require("../utils/util.service");
const {utils} = ethers;

// `describe` is a Mocha function that allows you to organize your tests. It's
// not actually needed, but having your tests organized makes debugging them
// easier. All Mocha functions are available in the global scope.

// `describe` receives the name of a section of your test suite, and a callback.
// The callback must define the tests of that section. This callback can't be
// an async function.
describe("Market contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    // They're very useful to setup the environment for tests, and to clean it
    // up after they run.

    // A common pattern is to declare some variables, and assign them in the
    // `before` and `beforeEach` callbacks.

    let TokenAsset;
    let TokenMarket;
    let TokenStorage;

    let tokenAsset;
    let tokenMarket;
    let tokenStorage;

    let user1
    let user2
    let owner;

    let provider1
    let provider2

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

    // `beforeEach` will run before each test, re-deploying the contract every time.
    // It receives a callback, which can be async.
    before(async function () {
        
        [owner] = await ethers.getSigners();
        let ownerBalance = await ethers.provider.getBalance(owner.address)
        console.log("Owner Address:", owner.address);
        console.log('Owner Balance:', ownerBalance.toString());
        
        user1 = ethers.Wallet.createRandom();
        user2 = ethers.Wallet.createRandom();

        provider1 = user1.connect(ethers.provider);
        provider2 = user2.connect(ethers.provider);

        let transferAmount = ethers.utils.parseEther("10");
        await owner.sendTransaction({to: user1.address, value: transferAmount});
        await owner.sendTransaction({to: user2.address, value: transferAmount});

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
    });

    // You can nest describe calls to create subsections.
    describe("Deployment", function () {
        describe("Asset Contract pre approvals", function () {
            it("Should check minter role in asset contract", async function () {
                expect(await tokenAsset.hasRole(MINTER_ROLE, tokenMarket.address)).to.equal(false);
            });

            it("Should able to grant minter role in asset contract", async function () {
                expect(await tokenAsset.grantRole(MINTER_ROLE, tokenMarket.address));
                expect(await tokenAsset.hasRole(MINTER_ROLE, tokenMarket.address)).to.equal(true);
            });
        });

        describe("Storage Contract", function () {
            it("Should check storage admin role", async function () {
                expect(await tokenStorage.hasRole(STORAGE_ADMIN_ROLE, tokenMarket.address)).to.equal(false);
            });

            it("Should able to grant storage admin role", async function () {
                expect(await tokenStorage.grantRole(STORAGE_ADMIN_ROLE, tokenMarket.address));
                expect(await tokenStorage.hasRole(STORAGE_ADMIN_ROLE, tokenMarket.address)).to.equal(true);
            });
        });

        describe("MarketContract", function () {
            it("Should check minter role in market", async function () {
                expect(await tokenMarket.owner()).to.equal(owner.address);
            });
            it("Should check max royalty is set properly", async function () {
                expect(await tokenMarket.maxRoyalty()).to.equal(maxRoyalty);
            });

            it("Should check nft contract address is set properly", async function () {
                expect(await tokenMarket.nftContractAddress()).to.equal(tokenAsset.address);
            });
            it("Should check storage contract address is set properly", async function () {
                expect(await tokenMarket.storageContractAddress()).to.equal(tokenStorage.address);
            });
        });
    });

    describe("Market public actions", async function () {

        let royalty = 10;
        let tokenId = 1000;
        let amount = 10;
        let buyAmount = 5;
        let tokenPrice = utils.parseEther("0.05");
        let parsedPrice = utils.parseUnits((0.05 * buyAmount).toString());
        let currentTime = parseInt(Date.now() / 1000);

        console.log(`TokenId: ${tokenId}`);
        console.log(`Royalty: ${royalty}`);

        it("Should able to mint token in asset contract", async function () {

            let transaction = await tokenMarket.connect(provider1)
                .mintToken(tokenId, royalty, amount);
            await transaction.wait();

            expect(await tokenStorage.isTokenMinted(tokenAsset.address, tokenId)).to.equal(true);
            let mintedToken = await tokenStorage.getMintedToken(tokenAsset.address, tokenId);

            console.log(`Minted Token: ${mintedToken}`);
        });

        it("Should able to create sale", async function () {
            let setApproval = await tokenAsset.connect(provider1).setApprovalForAll(tokenMarket.address, true);
            await setApproval.wait();

            await expect(tokenMarket.connect(provider1)
                .createSale(tokenAsset.address, tokenId, tokenPrice, amount)
            ).to.emit(tokenMarket, 'TokenListed');
        });

        it("Should able to buy token", async function () {

            let itemId = await tokenStorage.getTokenListingCount(tokenAsset.address, tokenId)

            await expect(tokenMarket.connect(provider2)
                .buyToken(tokenAsset.address, tokenId, itemId, buyAmount, {value: parsedPrice})
            ).to.emit(tokenMarket, 'TokenBought');

            expect(await tokenAsset.balanceOf(user2.address, tokenId)).to.equal(buyAmount);
        });
    });
});
