// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStampOpenNFT {
    function mint(address to, string memory tokenURI_) external returns (uint256);
}

/// @title StampEditionMinter — mint N ERC-721 STAMPs in one tx (Klip-friendly vs ERC-1155)
/// @notice Calls shared StampOpenNFT.mint in a loop so editions sit in the NFT collection.
contract StampEditionMinter {
    uint256 public constant MAX_BATCH = 50;

    function mintEditions(
        address collection,
        address to,
        uint256 amount,
        string calldata tokenURI_
    ) external returns (uint256 lastId) {
        require(collection != address(0), "collection");
        require(to != address(0), "to");
        require(amount > 0 && amount <= MAX_BATCH, "bad amount");
        IStampOpenNFT c = IStampOpenNFT(collection);
        for (uint256 i = 0; i < amount; i++) {
            lastId = c.mint(to, tokenURI_);
        }
    }
}
