const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Min } = require("mocha/lib/reporters");
const { utils } = ethers;

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

    let NftContract;
    let MarketContract;
    let nftContract;
    let marketContract;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    //rinkeby proxy
    let proxyRegistryAddress = "0xF57B2c51dED3A29e6891aba85459d600256Cf317";
    let MARKET_ADMIN_ROLE = utils.keccak256(
        utils.toUtf8Bytes("MARKET_ADMIN_ROLE")
    );

    let contractName = "NFTMarketplace";
    let tokenSymbol = "NFT";
    let feeAddress = "0x1652149105D6d5F41844B1104499d0C2E4930ee7";
    let platformCommission = 5;

    // `beforeEach` will run before each test, re-deploying the contract every time.
    // It receives a callback, which can be async.
    before(async function () {

        // Get the ContractFactory and Signers here.
        NftContract = await ethers.getContractFactory("NFT721");
        MarketContract = await ethers.getContractFactory("Market721");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens once its transaction has been mined.

        nftContract = await NftContract.deploy(
            contractName,
            tokenSymbol
        );

        marketContract = await MarketContract.deploy(
            nftContract.address,
            feeAddress,
            platformCommission
        );
    });

    // You can nest describe calls to create subsections.
    describe("Deployment", function () {
        describe("NftContract", function () {
            it("Should set the right owner", async function () {
                expect(await nftContract.owner()).to.equal(owner.address);
            });
        });

        describe("MarketContract", function () {
            it("Should set the right owner", async function () {
                expect(await marketContract.owner()).to.equal(owner.address);
            });
            it("Should check nft contract address", async function () {
                expect(await marketContract.nftContractAddress()).to.equal(nftContract.address);
            });
        });
    });

    describe("Market actions", function () {
        it("Should grant permission for Market Contract", async function () {
            await nftContract.connect(addr1).setApprovalForAll(marketContract.address, true);
            let isApproved = await nftContract.isApprovedForAll(
                addr1.address,
                marketContract.address
            );
            console.log("Approval status:", isApproved);
            expect(isApproved).to.equal(true);
        });

        describe("Market tests", async function () {

            it("Should able to mint token", async function () {

                let tokenId = 1;
                let royalty = 10;
                let minter = addr1;

                console.log("Minting token Id:", tokenId);
                console.log("Minter address:", minter.address);
                console.log("Royalty:", royalty);

                await expect(marketContract.connect(minter)
                    .mintToken(tokenId, royalty)).to
                    .emit(marketContract, "TokenCreated")
                    .withArgs(tokenId, minter.address);

                let [id, price, owner, creator, royaltyFee]= await marketContract.getToken(tokenId);
                console.log("Minted Token:", id);

                expect(tokenId).to.equal(tokenId);
                expect(royalty).to.equal(royalty);
            });
            
            it("Should able to create sale", async function () {
                
                let tokenId = 1;
                let creator = addr1;
                let tokenPrice = utils.parseEther("0.05");

                let [id, price, owner, creatorAdd, royaltyFee]= await marketContract.getToken(tokenId);
                console.log("Token owner:", owner);
                expect(owner).to.equal(creator.address);

                console.log("Creator address:", creator.address);
                console.log("Sale creating for token Id:", tokenId);
                console.log("Token price for sale:", tokenPrice.toString());

                await expect(marketContract.connect(creator)
                    .createSale(tokenId, tokenPrice)).to
                    .emit(marketContract, "TokenOnSale")
                    .withArgs(tokenId, tokenPrice);
            });

            it("Should able to buy token", async function () {

                let tokenId = 1;
                let amountToBuy = 1;
                let buyer = addr2;
                let [owner, price, royalty] = await marketContract.getTokenPrice(tokenId);
                console.log("Token owner:", owner);

                expect(owner).to.not.equal(buyer.address);

                console.log("Buyer address:", buyer.address);
                console.log("Purchasing token Id:", tokenId);
                console.log("Amount to buy:", amountToBuy);
                console.log("Token price to purchase:", price.toString());

                await expect(
                    marketContract
                        .connect(buyer)
                        .buyToken(tokenId, { value: price })
                    ).to
                    .emit(marketContract, "TokenBought")
                    .withArgs(tokenId, price, buyer.address);
                
                let [id, tokenPrice, ownerAdd, creator, royaltyFee] = await marketContract.getToken(tokenId);
                console.log("Bought Token owner:", ownerAdd);

                expect(ownerAdd).to.equal(buyer.address);
            });
        });
    });

    describe("Admin actions", function () {

        it("Should assign market admin role", async function () {
            await marketContract.grantRole(MARKET_ADMIN_ROLE, addr1.address);
            let hasRole = await marketContract.hasRole(MARKET_ADMIN_ROLE,
                addr1.address);

            expect(hasRole).to.equal(true);
        });

        it("Should set fee address", async function () {
            let newFeeAddress = addrs[5].address;
            await marketContract.connect(addr1)
                .setFeeAddress(newFeeAddress);

            let feeAddress = await marketContract.feeAddress();
            expect(feeAddress).to.equal(newFeeAddress);
        });

    });
});
