// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../interfaces/IBlast.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../libraries/OmniLinearCurve.sol";

contract YieldAndGasNFT is ERC721A, Ownable {
    using OmniLinearCurve for OmniLinearCurve.OmniCurve;
    using Strings for uint;

    // Event to log withdrawals
    event Withdrawal(address indexed recipient, uint256 amount);
    
    struct Pricing {
      uint128 minPrice;
      uint128 maxPrice;
      uint128 delta;
      uint128 decay;
      uint128 spotPrice;
      uint256 lastUpdate;
    }

    Pricing public pricing;
    //mint start and end id
    uint256 public constant startId = 0;
    uint256 public constant maxId = 1000000000;
    // uint256 public mintPrice = 0.001 ether;
    address public creatorAddress;

    constructor(address _creatorAddress) ERC721A("YieldAndGasNFT", "YGNFT") {
      IBlast(0x4300000000000000000000000000000000000002).configureAutomaticYield();
      IBlast(0x4300000000000000000000000000000000000002).configureClaimableGas();
      creatorAddress = _creatorAddress;

      //mint token Id 0 to creator
      _safeMint(msg.sender, 1);
      //set default pricing parameters. min/spot price 0.001. max price 0.01. delta 0.0001. daily decay 0.005.
        pricing.minPrice = 1000000000000000;
        pricing.maxPrice = 10000000000000000;
        pricing.delta = 100000000000000;
        pricing.decay = 5000000000000000;
        pricing.spotPrice = 1000000000000000;
        pricing.lastUpdate = 0;
    }

    function mint(uint256 numberOfTokens) public payable {
        if (numberOfTokens == 0) revert("YieldAndGasNFT: number of tokens can not be zero");
        if (_nextTokenId() + numberOfTokens - 1 > maxId) revert("YieldAndGasNFT: max supply reached, try minting less");

        (uint128 newSpotPrice, uint256 totalPrice) = getPriceInfo(numberOfTokens);
        if (msg.value < totalPrice) revert("YieldAndGasNFT: not enough value passed with the message");

        _mint(msg.sender, numberOfTokens);

        pricing.lastUpdate = block.timestamp;
        pricing.spotPrice = newSpotPrice;
    }

    // returns (newSpotPrice, totalCost)
    function getPriceInfo(uint256 amount) public view returns (uint128, uint256) {
      OmniLinearCurve.OmniCurve memory curve;
      curve = OmniLinearCurve.OmniCurve({
        lastUpdate: pricing.lastUpdate == 0 ? block.timestamp : pricing.lastUpdate,
        spotPrice: pricing.spotPrice,
        priceDelta: pricing.delta,
        priceDecay: pricing.decay,
        minPrice: pricing.minPrice,
        maxPrice: pricing.maxPrice
      });
      return  OmniLinearCurve.getBuyInfo(curve,amount);
    }

    function setPricing(Pricing calldata _pricing) external onlyOwner {
      pricing = _pricing;
    }

    // 90% of deposits + yield goes to the creator
    // 10% to the protocol
    function withdraw() public onlyOwner {
      uint256 balance = address(this).balance;
      require(balance > 0, "YieldAndGasNFT: No funds to withdraw");

      // Calculate shares
      uint256 ownerShare = balance / 10;
      uint256 creatorShare = balance - ownerShare;

      // Update state before transferring funds
      // [Any state updates related to withdrawal should go here, if applicable]

      // Transfer funds
      payable(owner()).transfer(ownerShare);
      emit Withdrawal(owner(), ownerShare); // Log owner withdrawal

      payable(creatorAddress).transfer(creatorShare);
      emit Withdrawal(creatorAddress, creatorShare); // Log creator withdrawal
    }

    // all gas goes to the creator!
    function claimAllGas() public onlyOwner {
		  IBlast(0x4300000000000000000000000000000000000002).claimAllGas(address(this), creatorAddress);
    }

    // all gas goes to the creator!
    function claimMaxGas() public onlyOwner {
		  IBlast(0x4300000000000000000000000000000000000002).claimMaxGas(address(this), creatorAddress);
    }

    
}