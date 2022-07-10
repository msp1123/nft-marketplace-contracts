// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Proxy.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";

/// @custom:security-contact praveenmsp23@gmail.com
contract NftContract1155 is ERC1155PresetMinterPauser {
    string public name;
    string public symbol;
    string public _contractUri;

    uint256 public platformFee;

    address public feeAddress;
    address public proxyRegistryAddress;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _chainId,
        uint256 _platformFee,
        address _feeAddress,
        address _proxyRegistryAddress
    ) ERC1155PresetMinterPauser("") {
        require(platformFee <= 10, "Fee limit exceeded");
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());

        name = _name;
        symbol = _symbol;
        feeAddress = _feeAddress;
        platformFee = _platformFee;
        proxyRegistryAddress = _proxyRegistryAddress;

        _contractUri = concat(
            "https://marketplace-nft.s3.us-west-1.amazonaws.com/nft/contract/",
            _chainId,
            "/",
            toAsciiString(address(this)),
            ".json"
        );
        setURI(
            concat(
                "https://marketplace-nft.s3.us-west-1.amazonaws.com/nft/token/",
                _chainId,
                "/",
                toAsciiString(address(this)),
                "/{id}.json"
            )
        );
    }

    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
     */
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override
        returns (bool isOperator)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(_owner)) == _operator) {
            return true;
        }

        return ERC1155.isApprovedForAll(_owner, _operator);
    }

    function pause() public override onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public override onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setURI(string memory _newUri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(_newUri);
    }

    function setContractURI(string memory _newUri)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _contractUri = _newUri;
    }

    // internal methods
    function toAsciiString(address x) public pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(abi.encodePacked("0x", s));
    }

    function char(bytes1 b) public pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function concat(
        string memory a,
        string memory b,
        string memory c,
        string memory d,
        string memory e
    ) public pure returns (string memory) {
        return (string(abi.encodePacked(a, "/", b, "/", c, "/", d, "/", e)));
    }
}
