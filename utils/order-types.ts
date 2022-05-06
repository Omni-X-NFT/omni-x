import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { TypedDataUtils } from "ethers-eip712"

export class MakerOrder {
  isOrderAsk  : boolean = false;
  signer      : string = ethers.constants.AddressZero;
  collection  : string = ethers.constants.AddressZero;
  price       : BigNumber = BigNumber.from(0);
  tokenId     : BigNumber = BigNumber.from(0);
  amount      : BigNumber = BigNumber.from(0);
  strategy    : string = ethers.constants.AddressZero;
  currency    : string = ethers.constants.AddressZero;
  nonce       : number = 0;
  startTime   : number = 0;
  endTime     : number = 0;
  params      : string = "";
  minPercentageToAsk     : number = 0;
  v           : number = 0;
  r           : string = "";
  s           : string = "";

  sign = (signer: Signer) => {
    
  }
}

export class TakerOrder {
  isOrderAsk  : boolean = false;
  taker       : string = ethers.constants.AddressZero;
  price       : BigNumber = BigNumber.from(0);
  tokenId     : BigNumber = BigNumber.from(0);
  params      : string = "";
  minPercentageToAsk     : number = 0;
}
