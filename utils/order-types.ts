import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { TypedDataUtils } from "ethers-eip712"

const MAKE_ORDER_SIGN_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  MakerOrder: [
    { name: 'isOrderAsk', type: 'bool' },
    { name: 'signer', type: 'address' },
    { name: 'collection', type: 'address' },
    { name: 'price', type: 'uint256' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'strategy', type: 'address' },
    { name: 'currency', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'minPercentageToAsk', type: 'uint256' },
    { name: 'params', type: 'bytes' }
  ]
};

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

  sign = async (signer: Signer, contractAddr: string) => {
    const domain = {
      name: "LooksRareExchange",
      version: "1",
      chainId: await signer.getChainId(),
      verifyingContract: contractAddr
    };

    const digest = TypedDataUtils.encodeDigest({
      domain,
      types: MAKE_ORDER_SIGN_TYPES,
      primaryType: "MakerOrder",
      message: this
    });
    
    const signature = await signer.signMessage(digest);
    const splitted = ethers.utils.splitSignature(signature);
    
    this.r = splitted.r;
    this.s = splitted.s;
    this.v = splitted.v;

    return this;
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
