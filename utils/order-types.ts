import { BigNumberish, BytesLike } from 'ethers'
import { TypedDataUtils } from 'ethers-eip712'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import * as fs from 'fs'

const MAKE_ORDER_SIGN_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
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

let ethers: any
export const setEthers = (ethers_: any) => {
  ethers = ethers_
}

export class MakerOrder {
  isOrderAsk: boolean = false
  signer: string = ethers.constants.AddressZero
  collection: string = ethers.constants.AddressZero
  price: BigNumberish = 0
  tokenId: BigNumberish = 0
  amount: BigNumberish = 0
  strategy: string = ethers.constants.AddressZero
  currency: string = ethers.constants.AddressZero
  nonce: BigNumberish = 0
  startTime: BigNumberish = 0
  endTime: BigNumberish = 0
  minPercentageToAsk: BigNumberish = 0
  params: BytesLike = []
  signature: string = ""

  constructor (isOrderAsk: boolean) {
    this.isOrderAsk = isOrderAsk;
  }

  static deserialize(file: string): MakerOrder {
    const data = fs.readFileSync(file).toString()
    const obj = JSON.parse(data)

    return obj
  }

  serialize(file: string) {
    const data = JSON.stringify(this)
    fs.writeFileSync(file, data)
  }
  
  setParams(types: string[], values: any[]) {
    this.params = ethers.utils.arrayify(
      ethers.utils.defaultAbiCoder.encode(types, values)
    )
  }

  encodeParams(chainId: number, buyer: string) {
    if (this.isOrderAsk) {
      this.setParams(['uint16', 'address'], [chainId, buyer]);
    }
    else {
      // TODO!!! this should be checked again later
      this.setParams(['uint16', 'address'], [chainId, buyer]);
    }
  }

  async sign(signer: SignerWithAddress, contractAddr: string) {
    const domain = {
      name: 'OmniXExchange',
      version: '1',
      chainId: await signer.getChainId(),
      verifyingContract: contractAddr
    }
    const typedData = {
      domain,
      types: MAKE_ORDER_SIGN_TYPES,
      primaryType: 'MakerOrder',
      message: this
    }

    const digest = TypedDataUtils.encodeDigest(typedData);
    this.signature = await signer.signMessage(digest);
    return this;
  }
}

export class TakerOrder {
  isOrderAsk: boolean = false
  taker: string = ethers.constants.AddressZero
  price: BigNumberish = 0
  tokenId: BigNumberish = 0
  params: BytesLike = []
  minPercentageToAsk: BigNumberish = 0

  constructor (isOrderAsk: boolean) {
    this.isOrderAsk = isOrderAsk
  }

  setParams(types: string[], values: any[]) {
    this.params = ethers.utils.arrayify(
      ethers.utils.defaultAbiCoder.encode(types, values)
    )
  }

  encodeParams(chainId: number) {
    if (this.isOrderAsk) {
      // TODO!!! this should be checked again later
      this.setParams(['uint16'], [chainId]);
    }
    else {
      this.setParams(['uint16'], [chainId]);
    }
    
  }
}
