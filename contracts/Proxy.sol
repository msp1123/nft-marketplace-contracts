// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
