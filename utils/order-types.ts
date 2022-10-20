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
}

let ethers: any
export const setEthers = (ethers_: any) => {
  ethers = ethers_
}

const zeroPad = (value: any, length: number) => {
  return ethers.utils.arrayify(ethers.utils.hexZeroPad(ethers.utils.hexlify(value), length))
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
  signature: string = ''

  constructor (isOrderAsk: boolean) {
    this.isOrderAsk = isOrderAsk
  }

  static deserialize (file: string): MakerOrder {
    const data = fs.readFileSync(file).toString()
    const obj = JSON.parse(data)

    obj.params = ethers.utils.arrayify({ length: 64, ...obj.params })
    return obj
  }

  serialize (file: string) {
    const data = JSON.stringify(this)
    fs.writeFileSync(file, data)

    console.log(`write to ${file}`)
  }

  setParams (types: string[], values: any[]) {
    this.params = ethers.utils.arrayify(
      ethers.utils.defaultAbiCoder.encode(types, values)
    )
  }

  encodeParams (chainId: number) {
    this.setParams(['uint16'], [chainId])
  }

  async sign (signer: SignerWithAddress) {
    const typedData = {
      domain: {},
      types: MAKE_ORDER_SIGN_TYPES,
      primaryType: 'MakerOrder',
      message: this
    }

    const eip191Header = ethers.utils.arrayify('0x1901')
    const messageHash = TypedDataUtils.hashStruct(typedData, typedData.primaryType, typedData.message)
    const pack = ethers.utils.solidityPack(['bytes', 'bytes32'], [
      eip191Header,
      zeroPad(messageHash, 32)
    ])
    const digest = ethers.utils.keccak256(pack)
    this.signature = await signer.signMessage(ethers.utils.arrayify(digest))
    return this
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

  setParams (types: string[], values: any[]) {
    this.params = ethers.utils.arrayify(
      ethers.utils.defaultAbiCoder.encode(types, values)
    )
  }

  encodeParams (chainId: number, currency: string, collection: string, strategy: string, currencyRate: number) {
    this.setParams(['uint16', 'address', 'address', 'address', 'uint256'], [chainId, currency, collection, strategy, currencyRate])
  }
}
