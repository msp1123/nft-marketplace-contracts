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
describe("Market contract 721", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    // They're very useful to setup the environment for tests, and to clean it
    // up after they run.

    // A common pattern is to declare some variables, and assign them in the
    // `before` and `beforeEach` callbacks.

    let ProxyRegistry;
    let NftContract721;
    let NftContract1155;
    let StorageContract
    let MarketContract;

    let proxyRegistry;
    let nftContract721;
    let nftContract1155;
    let storageContract;
    let marketContract;

    let owner;
    let user1;
    let user2;

    let provider1;
    let provider2;

    let MINTER_ROLE = utils.keccak256(
        utils.toUtf8Bytes("MINTER_ROLE")
    );
    let MARKET_ADMIN_ROLE = utils.keccak256(
        utils.toUtf8Bytes("MARKET_ADMIN_ROLE")
    );
    let STORAGE_ADMIN_ROLE = utils.keccak256(
        utils.toUtf8Bytes("STORAGE_ADMIN_ROLE")
    );

    let maxRoyalty = 10;
    let platformFee = 5;
    let feeAddress = "0x1652149105D6d5F41844B1104499d0C2E4930ee7";

    // `beforeEach` will run before each test, re-deploying the contract every time.
    // It receives a callback, which can be async.
    before(async function () {

        let snapshot = await ethers.provider.send('evm_snapshot');

        // Get the ContractFactory and Signers here.
        ProxyRegistry = await ethers.getContractFactory("ProxyRegistry");
        NftContract721 = await ethers.getContractFactory("NftContract721");
        NftContract1155 = await ethers.getContractFactory("NftContract1155");
        StorageContract = await ethers.getContractFactory("TokenStorage");
        MarketContract = await ethers.getContractFactory("TokenMarket");
        [owner] = await ethers.getSigners();
        let ownerBalance = await ethers.provider.getBalance(owner.address)

        user1 = ethers.Wallet.createRandom();
        user2 = ethers.Wallet.createRandom();

        provider1 = user1.connect(ethers.provider);
        provider2 = user2.connect(ethers.provider);

        let transferAmount = ethers.utils.parseEther("10");
        await owner.sendTransaction({to: user1.address, value: transferAmount});
        await owner.sendTransaction({to: user2.address, value: transferAmount});

        console.log("Owner Address:", owner.address);
        console.log('Owner Balance:', ownerBalance.toString());

        console.log(`User 1: ${user1.address}`);
        console.log(`User 2: ${user2.address}`);

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been mined.
        proxyRegistry = await ProxyRegistry.deploy();
        nftContract721 = await NftContract721.deploy(
            proxyRegistry.address
        );
        nftContract1155 = await NftContract1155.deploy(
            proxyRegistry.address
        );
        storageContract = await StorageContract.deploy(
            platformFee,
            feeAddress
        );

        marketContract = await MarketContract.deploy(
            maxRoyalty,
            nftContract721.address,
            nftContract1155.address,
            storageContract.address
        );

        console.log(`Proxy Registery address: ${proxyRegistry.address}`);
        console.log(`Nft Contract 721 address: ${nftContract721.address}`);
        console.log(`Nft Contract 1155 address: ${nftContract1155.address}`);
        console.log(`Storage Contract address: ${storageContract.address}`);
        console.log(`Market Contract address: ${marketContract.address}`);
    });

    // You can nest describe calls to create subsections.
    describe("Deployment", function () {
        describe("Nft Contract 721", function () {
            it("Should check minter role", async function () {
                expect(await nftContract721.hasRole(MINTER_ROLE, marketContract.address)).to.equal(false);
            });

            it("Should able to grant minter role", async function () {
                expect(await nftContract721.grantRole(MINTER_ROLE, marketContract.address));
                expect(await nftContract721.hasRole(MINTER_ROLE, marketContract.address)).to.equal(true);
            });
        });

        describe("Nft Contract 1155", function () {
            it("Should check minter role", async function () {
                expect(await nftContract1155.hasRole(MINTER_ROLE, marketContract.address)).to.equal(false);
            });

            it("Should able to grant minter role", async function () {
                expect(await nftContract1155.grantRole(MINTER_ROLE, marketContract.address));
                expect(await nftContract1155.hasRole(MINTER_ROLE, marketContract.address)).to.equal(true);
            });
        });

        describe("Storage Contract", function () {
            it("Should check storage admin role", async function () {
                expect(await storageContract.hasRole(STORAGE_ADMIN_ROLE, marketContract.address)).to.equal(false);
            });

            it("Should able to grant storage admin role", async function () {
                expect(await storageContract.grantRole(STORAGE_ADMIN_ROLE, marketContract.address));
                expect(await storageContract.hasRole(STORAGE_ADMIN_ROLE, marketContract.address)).to.equal(true);
            });
        });

        describe("MarketContract", function () {
            it("Should check minter role", async function () {
                expect(await marketContract.owner()).to.equal(owner.address);
            });
            it("Should check max royalty is set properly", async function () {
                expect(await marketContract.maxRoyalty()).to.equal(maxRoyalty);
            });

            it("Should check 721 nft contract address is set properly", async function () {
                expect(await marketContract.nftContractAddress721()).to.equal(nftContract721.address);
            });
            it("Should check 1155 nft contract address is set properly", async function () {
                expect(await marketContract.nftContractAddress1155()).to.equal(nftContract1155.address);
            });
            it("Should check storage contract address is set properly", async function () {
                expect(await marketContract.storageContractAddress()).to.equal(storageContract.address);
            });
        });
    });

    describe("Market public actions", async function () {

        let royalty = 10;
        let tokenId = 1000;
        let amount721 = 1;
        let amount1155 = 10;
        let buyAmount = 5;
        let tokenPrice = utils.parseEther("0.05");
        let parsedPrice = utils.parseUnits((0.05 * buyAmount).toString());
        let currentTime = parseInt(Date.now() / 1000);

        console.log(`TokenId: ${tokenId}`);
        console.log(`Royalty: ${royalty}`);

        it("Should able to mint token in 721", async function () {

            let transaction = await marketContract.connect(provider1)
                .mintToken(nftContract721.address, tokenId, royalty, amount721);
            await transaction.wait();

            expect(await storageContract.isTokenMinted(nftContract721.address, tokenId)).to.equal(true);
            let mintedToken = await storageContract.getMintedToken(nftContract721.address, tokenId);

            console.log(`Minted Token 721: ${mintedToken}`);
        });

        it("Should able to mint token in 1155", async function () {

            let transaction = await marketContract.connect(provider1)
                .mintToken(nftContract1155.address, tokenId, royalty, amount1155);
            await transaction.wait();

            expect(await storageContract.isTokenMinted(nftContract1155.address, tokenId)).to.equal(true);
            let mintedToken = await storageContract.getMintedToken(nftContract1155.address, tokenId);

            console.log(`Minted Token 1155: ${mintedToken}`);
        });

        it("Should able to create sale 721", async function () {
            let setApproval = await nftContract721.connect(provider1).setApprovalForAll(marketContract.address, true);
            await setApproval.wait();

            await expect(marketContract.connect(provider1)
                .createSale(nftContract721.address, tokenId, tokenPrice, amount721)
            ).to.emit(marketContract, 'TokenListed');
        });

        it("Should able to create sale 1155", async function () {
            let setApproval = await nftContract1155.connect(provider1).setApprovalForAll(marketContract.address, true);
            await setApproval.wait();

            await expect(marketContract.connect(provider1)
                .createSale(nftContract1155.address, tokenId, tokenPrice, amount1155)
            ).to.emit(marketContract, 'TokenListed');
        });

        it("Should able to buy token 721", async function () {

            let itemId = await storageContract.getTokenListingCount(nftContract721.address, tokenId)

            await expect(marketContract.connect(provider2)
                .buyToken(nftContract721.address, tokenId, itemId, amount721, {value: tokenPrice})
            ).to.emit(marketContract, 'TokenBought');

            expect(await nftContract721.ownerOf(tokenId)).to.equal(user2.address);
        });

        it("Should able to buy token 1155", async function () {

            let itemId = await storageContract.getTokenListingCount(nftContract1155.address, tokenId)

            await expect(marketContract.connect(provider2)
                .buyToken(nftContract1155.address, tokenId, itemId, buyAmount, {value: parsedPrice})
            ).to.emit(marketContract, 'TokenBought');

            expect(await nftContract1155.balanceOf(user2.address, tokenId)).to.equal(buyAmount);
        });
    });
});
