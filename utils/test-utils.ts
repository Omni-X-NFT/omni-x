import { ethers } from "hardhat"
import { BigNumber } from "@ethersproject/bignumber"
import { Contract } from "ethers"

export const toWei = (amount: number | string): BigNumber => {
  return ethers.utils.parseEther(amount.toString())
}

export const deployContract = async (name: string, owner: any, initParams: Array<any>): Promise<Contract> => {
  const factory = await ethers.getContractFactory(name, owner)
  const contract = await factory.deploy(...initParams)
  return contract.deployed();
}

export const now = () => {
  return new Date().valueOf();
}