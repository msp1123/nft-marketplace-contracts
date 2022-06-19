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
    address public proxyRegistryAddress;

    constructor(
        address _proxyRegistryAddress
    ) ERC1155PresetMinterPauser("https://nft-marketplace.com/v1/token/{id}") {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());
        
        name = "NFT Asset 1155 TEST";
        symbol = "NFT";
        proxyRegistryAddress = _proxyRegistryAddress;
        _contractUri = "https://marketplace-nft.s3.us-west-1.amazonaws.com/contract/contract.json";
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

    function setContractURI(string memory _newUri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _contractUri = _newUri;
    }
}
