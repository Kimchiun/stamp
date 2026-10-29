// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title StampCollection — per-user ERC-721 collection (EIP-1167 clone target)
/// @notice Created by StampCollectionFactory. Only the owner can mint.
contract StampCollection is ERC721URIStorageUpgradeable, OwnableUpgradeable {
    uint256 public constant MAX_BATCH = 50;
    uint256 private _nextTokenId;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        address owner_
    ) external initializer {
        __ERC721_init(name_, symbol_);
        __Ownable_init(owner_);
    }

    function mint(address to, string memory tokenURI_) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    /// @dev Same tokenURI for every token; amount capped to keep one tx under gas caps.
    function mintBatch(
        address to,
        uint256 amount,
        string calldata tokenURI_
    ) external onlyOwner returns (uint256 lastId) {
        require(amount > 0 && amount <= MAX_BATCH, "bad amount");
        for (uint256 i = 0; i < amount; i++) {
            lastId = _nextTokenId++;
            _safeMint(to, lastId);
            _setTokenURI(lastId, tokenURI_);
        }
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
