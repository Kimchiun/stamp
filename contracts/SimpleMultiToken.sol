// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SimpleMultiToken — ERC-1155 deploy & mint (fungible editions)
contract SimpleMultiToken is ERC1155URIStorage, Ownable {
    string public name;
    string public symbol;
    uint256 private _nextTokenId;

    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) ERC1155("") Ownable(initialOwner) {
        name = name_;
        symbol = symbol_;
    }

    function mint(
        address to,
        uint256 amount,
        string memory tokenURI_
    ) external onlyOwner returns (uint256) {
        require(amount > 0, "amount=0");
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId, amount, "");
        _setURI(tokenId, tokenURI_);
        return tokenId;
    }
}
