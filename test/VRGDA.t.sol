// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {IONFT721} from "../contracts/token/onft/IONFT721.sol";
import {DadBros} from "../contracts/token/onft/extension/DadBros.sol";
import {IONFT1155} from "../contracts/token/onft/IONFT1155.sol";
import {ERC20Mock} from "../contracts/mocks/ERC20Mock.sol";
import "forge-std/console.sol";



contract VRGDATest is Test {
    DadBros dadBros;
    address owner;



    string constant NAME = "test";
    string constant SYMBOL = "TEST";
    address layerZeroEndpoint = makeAddr("layerZeroEndpoint");
    string constant TOKEN_URI = "https:/exampleURI.com";
    bytes32[] public merkleRoots;

     function setUp() public  {
        owner = makeAddr("owner");
        vm.startPrank(owner);
        dadBros = new DadBros(NAME, SYMBOL, layerZeroEndpoint, TOKEN_URI, TOKEN_URI, 500, owner);
        vm.deal(owner, 100 ether);
        dadBros.setMerkleRoot(bytes32("free"), bytes32("0x64ca47771b3"));
        dadBros.setMerkleRoot(bytes32("friends"), bytes32("0x64ca47771b3"));
        dadBros.flipSaleStarted();
        vm.stopPrank();
        merkleRoots.push(bytes32("free"));
        
    }

    function testPricingPublic() public {
        vm.warp(dadBros.lastUpdatePublic() + 100);


        (uint128 newSpotPrice, uint256 totalPrice) = dadBros.getPriceInfo(3, 1);
        console.logString("Minting 1 token 10 times");
        for (uint i = 0; i < 10; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            console.logString("Total price of next token");
            console.logUint(totalPrice);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 1);
            vm.stopPrank();
            
        }

        assertEq(dadBros.balanceOf(owner), 10);
        console.logString("-----------------");
        console.logString("Minting 1 token after some time");
        vm.warp(dadBros.lastUpdatePublic() + 14400);
        vm.startPrank(owner);
        (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
        console.logString("Total price of next token");
        console.logUint(totalPrice);
        dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 1);
        vm.stopPrank();

   

        console.logString("-----------------");
        console.logString("Minting 10 tokens 1 time");

        vm.startPrank(owner);
        (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 10);
        console.logString("Total price of next 10 tokens");
        console.logUint(totalPrice);
        dadBros.mint{value: totalPrice }(10, 3, merkleRoots, 1);
        vm.stopPrank();
     
        assertEq(dadBros.balanceOf(owner), 21);

        vm.startPrank(owner);
        (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
        console.logString("Total price of next token");
        console.logUint(totalPrice);
        dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 1);
        vm.stopPrank();

        assertEq(dadBros.balanceOf(owner), 22);

    }



}