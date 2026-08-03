// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";

/// @title StampOpenMulti — shared STAMP multi-token collection (fixed CREATE2 address)
contract StampOpenMulti is ERC1155URIStorage {
    string public constant name = "STAMP";
    string public constant symbol = "STAMP";
    uint256 private _nextTokenId;

    constructor() ERC1155("") {}

    function mint(
        address to,
        uint256 amount,
        string memory tokenURI_
    ) external returns (uint256) {
        require(amount > 0, "amount=0");
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId, amount, "");
        _setURI(tokenId, tokenURI_);
        return tokenId;
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
