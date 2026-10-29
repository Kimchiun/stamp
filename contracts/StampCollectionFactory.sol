// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./StampCollection.sol";

/// @title StampCollectionFactory — users create their own named ERC-721 collection
/// @notice Called with a normal `to` (this contract), so wallets like Klip accept it.
/// @dev Deployed once per chain via CREATE2 (fixed salt) so the address is stable.
contract StampCollectionFactory {
    address public immutable implementation;
    mapping(address => address[]) private _collectionsOf;

    event CollectionCreated(
        address indexed owner,
        address indexed collection,
        string name,
        string symbol
    );

    constructor() {
        implementation = address(new StampCollection());
    }

    function createCollection(
        string calldata name_,
        string calldata symbol_
    ) external returns (address collection) {
        require(bytes(name_).length > 0 && bytes(name_).length <= 64, "name");
        require(bytes(symbol_).length > 0 && bytes(symbol_).length <= 12, "symbol");
        collection = Clones.clone(implementation);
        StampCollection(collection).initialize(name_, symbol_, msg.sender);
        _collectionsOf[msg.sender].push(collection);
        emit CollectionCreated(msg.sender, collection, name_, symbol_);
    }

    function collectionsOf(address owner) external view returns (address[] memory) {
        return _collectionsOf[owner];
    }
}
