import { BigNumberish, BytesLike } from 'ethers'
import { ethers } from 'hardhat'
import { TypedDataUtils } from 'ethers-eip712'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

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

const getTypeString = (type : 'EIP712Domain' | 'MakerOrder') => {
  const attrs = MAKE_ORDER_SIGN_TYPES[type].reduce((acc, v) => `${acc},${v.type} ${v.name}`, ``)
  return `${type}(${attrs.slice(1)})`
}
const EIP712DomainType = getTypeString('EIP712Domain')
const MakerOrderType = getTypeString('MakerOrder')

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
  v: BigNumberish = 0
  r: BytesLike = []
  s: BytesLike = []

  constructor (isOrderAsk: boolean) {
    this.isOrderAsk = isOrderAsk;
  }

  async sign(signer: SignerWithAddress, contractAddr: string) {
    // console.log(ethers.utils.id(EIP712DomainType));
    const DOMAIN_SEPARATOR = ethers.utils.defaultAbiCoder.encode(
      ['string', 'string', 'string', 'uint256', 'address'],
      [
        ethers.utils.id(EIP712DomainType),
        ethers.utils.id('LooksRareExchange'),
        ethers.utils.id('1'),
        await signer.getChainId(),
        contractAddr
      ]
    )

    // console.log('---', DOMAIN_SEPARATOR);
    // console.log('---', ethers.utils.id(DOMAIN_SEPARATOR));
    
    const domain = {
      name: 'LooksRareExchange',
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
    console.log('---', TypedDataUtils.hashStruct(typedData, 'EIP712Domain', domain).toString())
    console.log('---', TypedDataUtils.hashStruct(typedData, 'MakerOrder', this))

    // const digest = TypedDataUtils.encodeDigest({
    //   domain,
    //   types: MAKE_ORDER_SIGN_TYPES,
    //   primaryType: 'MakerOrder',
    //   message: this
    // });
    
    // const signature = await signer.signMessage(digest);
    // const splitted = ethers.utils.splitSignature(signature);
    
    // this.r = splitted.r;
    // this.s = splitted.s;
    // this.v = splitted.v;

    // console.log('----', digest.toString());
    // console.log('----', signer.address);

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
}
