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
        vm.deal(owner, 1000 ether);
        dadBros.setMerkleRoot(bytes32("free"), bytes32("0x64ca47771b3"));
        dadBros.setMerkleRoot(bytes32("friends"), bytes32("0x64ca47771b3"));
        dadBros.flipSaleStarted();
        vm.stopPrank();
        merkleRoots.push(bytes32("free"));
        
    }

    // function testPricingPublic() public {



    //     (uint128 newSpotPrice, uint256 totalPrice) = dadBros.getPriceInfo(3, 20);
    //     console.logUint(totalPrice);
    //     console.logUint(newSpotPrice);

    //     console.logString("Minting 1 token 10 times");
    //     for (uint i = 0; i < 10; i++) {
    //         vm.startPrank(owner);
    //         (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
    //         console.logString("Total price of next token");
    //         console.logUint(totalPrice);
    //         dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 1);
    //         vm.stopPrank();
            
    //     }

    //     assertEq(dadBros.balanceOf(owner), 10);
    //     console.logString("-----------------");
    //     console.logString("Minting 1 token after some time");
    //     vm.warp(dadBros.lastUpdatePublic() + 1 days);
    //     vm.startPrank(owner);
    //     (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
    //     console.logString("Total price of next token");
    //     console.logUint(totalPrice);
    //     dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 1);
    //     vm.stopPrank();

   

    //     console.logString("-----------------");
    //     console.logString("Minting 10 tokens 1 time");

    //     vm.startPrank(owner);
    //     (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 10);
    //     console.logString("Total price of next 10 tokens");
    //     console.logUint(totalPrice);
    //     dadBros.mint{value: totalPrice }(10, 3, merkleRoots, 1);
    //     vm.stopPrank();
     
    //     assertEq(dadBros.balanceOf(owner), 21);

    //     vm.startPrank(owner);
    //     (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
    //     console.logString("Total price of next token");
    //     console.logUint(totalPrice);
    //     dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 1);
    //     vm.stopPrank();

    //     assertEq(dadBros.balanceOf(owner), 22);

    // }
       function testPricingPublic100() public {
        


        uint128 newSpotPrice;
        uint256 totalPrice;
        vm.startPrank(owner);
        (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
        dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
        vm.warp(dadBros.lastUpdatePublic() + 144);
        vm.stopPrank();
        console.logString('first mint');
        console.logUint(totalPrice);


        for (uint i = 0; i < 100; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 144);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("100 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 101);
       

    }
    function testPricingPublic200() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 200; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 72);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("200 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 200);
       

    }
    function testPricingPublic300() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 300; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 48);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("300 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 300);
       

    }
    function testPricingPublic400() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 400; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 36);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("400 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 400);
       

    }
    function testPricingPublic500() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 500; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 29);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("500 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 500);
       

    }
    function testPricingPublic600() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 600; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 24);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("600 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 600);
       

    }
    function testPricingPublic700() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 700; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 21);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("700 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 700);
       

    }
    function testPricingPublic800() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 800; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 18);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("800 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 800);
       

    }
    function testPricingPublic900() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 900; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 16);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("900 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 900);
       

    }
    function testPricingPublic1000() public {


        uint128 newSpotPrice;
        uint256 totalPrice;



        for (uint i = 0; i < 1000; i++) {
            vm.startPrank(owner);
            (newSpotPrice, totalPrice) = dadBros.getPriceInfo(3, 1);
            dadBros.mint{value: totalPrice }(1, 3, merkleRoots, 0);
            vm.warp(dadBros.lastUpdatePublic() + 14);
            vm.stopPrank();
        }
        
        console.logString("-----------------");
        console.logString("1000 tokens over 4 hours");
        console.logString("Total price of next token");
        console.logUint(newSpotPrice);

        assertEq(dadBros.balanceOf(owner), 1000);
       

    }




}