// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.13;

// import {Test} from "forge-std/Test.sol";
// import {IONFT721} from "../contracts/token/onft/IONFT721.sol";
// import {AdvancedONFT721Gasless} from "../contracts/token/onft/extension/AdvancedONFT721Gasless.sol";
// import {IONFT1155} from "../contracts/token/onft/IONFT1155.sol";
// import {AdvancedONFT1155} from "../contracts/token/onft/extension/AdvancedONFT1155.sol";
// import {ERC20Mock} from "../contracts/mocks/ERC20Mock.sol";
// import "forge-std/console.sol";





// interface IOperatorFilterRegistry {
//     function filteredOperators(address addr) external returns (address[] memory);
// }

// contract ValidationTest is Test {
//     address constant CANONICAL_OPERATOR_FILTER_REGISTRY = 0x000000000000AAeB6D7670E522A718067333cd4E;
//     address constant CANONICAL_OPENSEA_REGISTRANT = 0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6;
//     // Contract to test against
//     address contractAddress721;
//     address contractAddress1155;
//     // Token ID to test against
//     uint256 tokenId;
//     // Owner of the NFT
//     address owner;
//     address[] filteredOperators;

//     string constant NAME = "test";
//     string constant SYMBOL = "TEST";
//     address layerZeroEndpoint = makeAddr("layerZeroEndpoint");
//     uint constant START_MINT = 1;
//     uint constant END_MINT = 100;
//     uint constant MAX_TOKENS_PER_MINT= 5;
//     string constant TOKEN_URI = "https:/exampleURI.com";
//     uint constant MINT_AMOUNT = 1;

//     function setUp() public  {
//         owner = makeAddr("owner");
//         tokenId = 1;
//         // Fork mainnet
//         uint256 forkId = vm.createFork(vm.rpcUrl("mainnet"));
//         vm.selectFork(forkId);


//         filteredOperators = IOperatorFilterRegistry(CANONICAL_OPERATOR_FILTER_REGISTRY).filteredOperators(CANONICAL_OPENSEA_REGISTRANT);

//         ERC20Mock erc20Mock = new ERC20Mock();
//         erc20Mock.mint(owner, 1000);
//         vm.deal(owner, 1 ether);
//         vm.startPrank(owner);
//         AdvancedONFT721Gasless onft721 = new AdvancedONFT721Gasless(NAME, SYMBOL, layerZeroEndpoint, START_MINT, END_MINT, MAX_TOKENS_PER_MINT, TOKEN_URI, TOKEN_URI, address(erc20Mock), 500, owner);
//         AdvancedONFT1155 onft1155 = new AdvancedONFT1155(layerZeroEndpoint,TOKEN_URI, TOKEN_URI, 500,owner);
//         vm.stopPrank();

//         contractAddress721 = address(onft721);
//         contractAddress1155 = address(onft1155);

//         vm.startPrank(owner);
//         onft721.flipSaleStarted();
//         onft1155.flipSaleStarted();
//         onft721.flipPublicSaleStarted();
//         onft1155.flipPublicSaleStarted();
//         onft721.setPrice(1);
//         onft1155.setPrice(1);
//         erc20Mock.approve(address(onft721), 1000);
//         erc20Mock.approve(address(onft1155), 1000);
//         onft721.publicMint(MINT_AMOUNT);
//         onft1155.publicMint{value: 100}(tokenId, MINT_AMOUNT);
//         vm.stopPrank();
   
//     }

//     function testONFT721GaslessOpenSeaFilter() public {
//         IONFT721 onft721 = IONFT721(contractAddress721);

//         // Try to get the current owner of the NFT, falling back to value set during setup on revert
//         try onft721.ownerOf(tokenId) returns (address _owner) {
//             owner = _owner;
//         } catch (bytes memory) {
//             // Do nothing
//         }

//         for (uint256 i = 0; i < filteredOperators.length; i++) {
//             address operator = filteredOperators[i];

//             // Try to set approval for the operator
//             vm.startPrank(owner);
//             try onft721.setApprovalForAll(operator, true) {
//                 // blocking approvals is not required, so continue to check transfers
//             } catch (bytes memory) {
//                 // continue to test transfer methods, since marketplace approvals can be
//                 // hard-coded into contracts
//             }

//             // also include per-token approvals as those may not be blocked
//             try onft721.approve(operator, tokenId) {
//                 // continue to check transfers
//             } catch (bytes memory) {
//                 // continue to test transfer methods, since marketplace approvals can be
//                 // hard-coded into contracts
//             }

//             vm.stopPrank();
//             // Ensure operator is not able to transfer the token
//             vm.startPrank(operator);
//             vm.expectRevert();
//             onft721.safeTransferFrom(owner, address(1), tokenId);

//             vm.expectRevert();
//             onft721.safeTransferFrom(owner, address(1), tokenId, "");

//             vm.expectRevert();
//             onft721.transferFrom(owner, address(1), tokenId);
//             vm.stopPrank();
//         }
//     }

//     function testONFT1155OpenSeaFilter() public {
//         IONFT1155 onft721 = IONFT1155(contractAddress1155);
//         for (uint256 i = 0; i < filteredOperators.length; i++) {
//             address operator = filteredOperators[i];

//             // Try to set approval for the operator
//             vm.prank(owner);
//             try onft721.setApprovalForAll(operator, true) {}
//             catch (bytes memory) {
//                 // even if approval reverts, continue to test transfer methods, since marketplace approvals can be
//                 // hard-coded into contracts
//             }

//             uint256[] memory tokenIds = new uint256[](1);
//             tokenIds[0] = tokenId;
//             uint256[] memory amounts = new uint256[](1);
//             amounts[0] = 1;

//             // Ensure operator is not able to transfer the token
//             vm.startPrank(operator);
//             vm.expectRevert();
//             onft721.safeTransferFrom(owner, address(1), tokenId, 1, "");

//             vm.expectRevert();
//             onft721.safeBatchTransferFrom(owner, address(1), tokenIds, amounts, "");

//             vm.stopPrank();
//         }
//     }
//  }