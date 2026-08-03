// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title StampOpenNFT — shared STAMP collection (fixed CREATE2 address)
/// @notice Anyone can mint. Display name lives in tokenURI metadata, not contract name.
/// @dev Keep bytecode stable (salt STAMP_OPEN_NFT_V1) so collection address does not jump.
contract StampOpenNFT is ERC721URIStorage {
    uint256 private _nextTokenId;

    constructor() ERC721("STAMP", "STAMP") {}

    function mint(address to, string memory tokenURI_) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
