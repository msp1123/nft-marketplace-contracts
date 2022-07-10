// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import "./Nft721.sol";
import "./Nft1155.sol";
import "./Storage.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract TokenMarket is Pausable, Ownable, AccessControlEnumerable {
    bytes32 public constant MARKET_ADMIN_ROLE = keccak256("MARKET_ADMIN_ROLE");

    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    uint256 public maxRoyalty;

    address public nftContractAddress721;
    address public nftContractAddress1155;
    address public storageContractAddress;

    event TokenMinted(
        uint256 standard,
        address nftAddress,
        uint256 tokenId,
        uint256 amount,
        address owner
    );
    event TokenListed(
        uint256 standard,
        address nftAddress,
        uint256 tokenId,
        uint256 itemId,
        uint256 amount,
        uint256 price
    );
    event TokenBought(
        uint256 standard,
        address nftAddress,
        uint256 tokenId,
        uint256 itemId,
        uint256 amount,
        uint256 price,
        address owner
    );
    event TokenUpdated(
        uint256 standard,
        address nftAddress,
        uint256 tokenId,
        uint256 itemId,
        uint256 price
    );
    event TokenBurned(
        uint256 standard,
        address nftAddress,
        uint256 tokenId,
        uint256 itemId,
        uint256 amount,
        address owner
    );

    TokenStorage private tokenStorage;

    constructor(
        uint256 _maxRoyalty,
        address _nftContractAddress721,
        address _nftContractAddress1155,
        address _storageContractAddress
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MARKET_ADMIN_ROLE, _msgSender());

        maxRoyalty = _maxRoyalty;
        nftContractAddress721 = _nftContractAddress721;
        nftContractAddress1155 = _nftContractAddress1155;
        storageContractAddress = _storageContractAddress;
        tokenStorage = TokenStorage(storageContractAddress);
    }

    function mintToken(
        uint256 _standard,
        uint256 _tokenId,
        uint256 _royalty,
        uint256 _amount
    ) public {
        require(_amount > 0, "Amount should be more than zero");
        require(_royalty <= maxRoyalty, "Royalty limit exceeded");

        address _nftAddress;
        if (_standard == 721) {
            _nftAddress = nftContractAddress721;
            require(
                tokenStorage.isTokenMinted(_nftAddress, _tokenId) == false,
                "Token ID already minted"
            );
            require(_amount == 1, "Invalid mint amount");
            NftContract721(_nftAddress).mint(_msgSender(), _tokenId);
        } else if (_standard == 1155) {
            _nftAddress = nftContractAddress1155;
            require(
                tokenStorage.isTokenMinted(_nftAddress, _tokenId) == false,
                "Token ID already minted"
            );
            NftContract1155(_nftAddress).mint(_msgSender(), _tokenId, _amount, "0x");
        } else {
            revert("Invalid nft address");
        }

        tokenStorage.mintToken(
            _nftAddress,
            _tokenId,
            _amount,
            _msgSender(),
            _royalty,
            _standard,
            block.timestamp
        );

        emit TokenMinted(
            _standard,
            _nftAddress,
            _tokenId,
            _amount,
            _msgSender()
        );
    }

    function createSale(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _price,
        uint256 _amount
    ) public {
        require(_amount > 0, "Amount should be more than zero");
        require(_price > 0, "Price must be greater than zero");
        require(
            tokenStorage.isTokenMinted(_nftAddress, _tokenId),
            "Token not found in Market"
        );

        uint256 _standard;
        uint256 _itemId;
        if (_supportERC721(_nftAddress)) {
            address owner = NftContract721(_nftAddress).ownerOf(_tokenId);
            require(owner == _msgSender(), "Caller is not owner");
            if (_amount > 1) {
                _amount = 1;
            }

            bool isApproved = NftContract721(_nftAddress).isApprovedForAll(
                _msgSender(),
                address(this)
            );
            require(isApproved, "Set approval before listing");
            _standard = 721;
            _itemId = 1;
        } else if (_supportERC1155(_nftAddress)) {
            uint256 balance = NftContract1155(_nftAddress).balanceOf(_msgSender(), _tokenId);
            require(balance >= _amount, "Must own enough token");

            bool isApproved = NftContract1155(_nftAddress).isApprovedForAll(
                _msgSender(),
                address(this)
            );
            require(isApproved, "Set approval before listing");
            _standard = 1155;
            _itemId =
                tokenStorage.getTokenListingCount(_nftAddress, _tokenId) +
                1;
        } else {
            revert("Invalid nft address");
        }

        tokenStorage.listToken(
            _nftAddress,
            _tokenId,
            _itemId,
            _amount,
            _price,
            _msgSender(),
            block.timestamp
        );

        emit TokenListed(
            _standard,
            _nftAddress,
            _tokenId,
            _itemId,
            _amount,
            _price
        );
    }

    function buyToken(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _itemId,
        uint256 _amount
    ) public payable {
        require(_amount > 0, "Amount should be more than zero");
        require(
            _itemId <= tokenStorage.getTokenListingCount(_nftAddress, _tokenId),
            "Item not found in market"
        );

        (
            uint256 price,
            uint256 amount,
            uint256 royalty,
            address owner,
            address creator,
            bool tradable,
            ,
            uint256 standard
        ) = tokenStorage.getListedToken(_nftAddress, _tokenId, _itemId);

        require(owner != address(0), "Token not found in listing");
        require(tradable, "Token is not tradable");
        require(owner != _msgSender(), "Cannot buy own token");
        require(msg.value == price * _amount, "Not enough eth sent");
        require(amount >= _amount, "Cannot buy more than available");

        if (_supportERC721(_nftAddress)) {
            NftContract721(_nftAddress).safeTransferFrom(owner, _msgSender(), _tokenId);
        } else if (_supportERC1155(_nftAddress)) {
            NftContract1155(_nftAddress).safeTransferFrom(
                owner,
                _msgSender(),
                _tokenId,
                _amount,
                ""
            );
        } else {
            revert("Invalid nft address");
        }

        payPurchaseFee(payable(owner), payable(creator), msg.value, royalty);

        tokenStorage.buyToken(
            _nftAddress,
            _tokenId,
            _itemId,
            _amount,
            price * _amount,
            owner,
            _msgSender(),
            block.timestamp
        );

        emit TokenBought(
            standard,
            _nftAddress,
            _tokenId,
            _itemId,
            amount,
            price,
            owner
        );
    }

    function payPurchaseFee(
        address payable _owner,
        address payable _creator,
        uint256 _value,
        uint256 _royalty
    ) private {
        address payable _platform = payable(tokenStorage.feeAddress());

        uint256 forCreator = ((_value * _royalty) / 100);
        uint256 forPlatform = ((_value * tokenStorage.platformFee()) / 100);
        uint256 forOwner = _value - forCreator - forPlatform;

        // Due to Stack too deep exception, calculations are done on the flow
        _owner.transfer(forOwner);
        _creator.transfer(forCreator);
        _platform.transfer(forPlatform);
    }
    
    function setMaxRoyalty(uint256 _newMaxRoyalty) public adminOnly {
        maxRoyalty = _newMaxRoyalty;
    }

    function _supportERC721(address _nftAddress) private view returns (bool) {
        return IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721);
    }

    function _supportERC1155(address _nftAddress) private view returns (bool) {
        return IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155);
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
}
