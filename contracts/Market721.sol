// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;
import "./NFT721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract Market721 is Pausable, Ownable, AccessControlEnumerable {
    bytes32 public constant MARKET_ADMIN_ROLE = keccak256("MARKET_ADMIN_ROLE");

    struct Asset {
        uint256 tokenId;
        uint256 price;
        address owner;
        address creator;
        uint256 royalty;
    }

    address public feeAddress;
    address public nftContractAddress;
    uint256 private platformCommission;

    mapping(uint => Asset) public assetTable;

    event TokenBurnt(uint256 tokenId, address owner);
    event TokenCreated(uint256 tokenId, address owner);
    event TokenOnSale(uint256 tokenId, uint256 price);
    event TokenPriceUpdated(uint256 tokenId, uint256 price);
    event TokenBought(uint256 tokenId, uint256 price, address owner);
    
    NFT721 nft;

    constructor(
        address _nftContractAddress,
        address _feeAddress,
        uint256 _platformCommission
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MARKET_ADMIN_ROLE, _msgSender());

        feeAddress = _feeAddress;
        nftContractAddress = _nftContractAddress;
        platformCommission = _platformCommission;
        nft = NFT721(nftContractAddress);
    }

    /**
     * @dev Throws if called by any account other than admins.
     */
    modifier adminOnly() {
        require(
            hasRole(MARKET_ADMIN_ROLE, _msgSender()),
            "#adminOnly: need admin role"
        );
        _;
    }
    
    function mintToken(
        uint256 _tokenId,
        uint256 _royalty
    ) public {
        nft.mint(_msgSender(), _tokenId);
        assetTable[_tokenId].royalty = _royalty;
        assetTable[_tokenId].owner = _msgSender();
        assetTable[_tokenId].creator = _msgSender();

        emit TokenCreated(_tokenId, _msgSender());
    }

    function createSale(
        uint256 _tokenId,
        uint256 _tokenPrice
    ) public {
        require(_msgSender() ==  assetTable[_tokenId].owner,
            "Only owners can create sale");
        require(_tokenPrice > 0,
            "Price must be greater than zero");

        assetTable[_tokenId].price = _tokenPrice;
        emit TokenOnSale(_tokenId, assetTable[_tokenId].price);
    }
    
    function getTokenPrice(
        uint256 _tokenId
    ) public view returns (address, uint256, uint256){
        return (
            assetTable[_tokenId].owner,
            assetTable[_tokenId].price,
            assetTable[_tokenId].royalty
        );
    }

    function getToken(uint256 _tokenId) public view returns (Asset memory) {
        return assetTable[_tokenId];
    }

    function updateTokenPrice(uint256 _tokenId, uint256 _tokenPrice) public {
        require(_msgSender() ==  assetTable[_tokenId].owner,
            "Only owners can update price");
        require(_tokenPrice > 0,
            "Price must be greater than zero");

        assetTable[_tokenId].price = _tokenPrice;
        emit TokenPriceUpdated(_tokenId, assetTable[_tokenId].price);
    }

    function buyToken(uint256 _tokenId) public payable {
        require(assetTable[_tokenId].price > 0,
            "Token not found on sale");
        require(_msgSender() !=  assetTable[_tokenId].owner,
            "Can not buy owned token");
        require(msg.value == assetTable[_tokenId].price,
            "Not enough eth sent");

        address payable oldOwner = payable(assetTable[_tokenId].owner);
        address payable creator = payable(assetTable[_tokenId].creator);
        address payable platform = payable(feeAddress);
        address newOwner = _msgSender();

        uint256 forCreator = msg.value * assetTable[_tokenId].royalty / 100;
        uint256 forPlatform = msg.value * platformCommission / 100;
        uint256 forOwner = msg.value - forCreator - forPlatform;

        nft.safeTransferFrom(oldOwner, newOwner, _tokenId);

        assetTable[_tokenId].owner = newOwner;
        oldOwner.transfer(forOwner);
        creator.transfer(forCreator);
        platform.transfer(forPlatform);

        emit TokenBought(_tokenId, assetTable[_tokenId].price, _msgSender());
    }

    function setFeeAddress(address _feeAddress) external adminOnly {
        feeAddress = _feeAddress;
    }

    function transferToken(address _to, uint256 _tokenId) public {
        require(_addressNotNull(_to), "Can not transfer to zero address");
        require(_msgSender() == assetTable[_tokenId].owner,
            "Only owners can transfer token");

        nft.safeTransferFrom(_msgSender(), _to, _tokenId);
        assetTable[_tokenId].owner = _to;
    }

    function burnToken(uint256 _tokenId) public onlyOwner {
        require(_msgSender() == assetTable[_tokenId].owner,
            "Only owners can burn token");

        nft.burn(_tokenId);
        emit TokenBurnt(_tokenId, _msgSender());
    }

    /* PRIVATE FUNCTIONS */
    /// Safety check on _to address to prevent against an unexpected 0x0 default.
    function _addressNotNull(address _to) private pure returns (bool) {
        return _to != address(0);
    }
    
    function getBalance(address user) public view returns (uint256 balance) {
        return user.balance;
    }
}