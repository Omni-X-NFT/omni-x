import hre from 'hardhat'
import {ethers} from "ethers"


const lzEndpoints = {
  goerli: ["0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23", 1],
  mumbai: ["0xf69186dfBa60DdB133E91E9A4B5673624293d8F8", 2],
  arbitrumGoerli: ["0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab", 3],
  bsc: ["0x6Fcb97553D41516Cb228ac03FdC8B9a0a9df04A1", 4],
  optimism: ["0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1", 5],
  fantom: ["0x7dcAD72640F835B0FA36EFD3D6d3ec902C7E5acf", 6],
  fuji: ["0x93f54D755A063cE7bB9e6Ac47Eccc8e33411d706", 7],
  moonbeam: ["0xb23b28012ee92E8dE39DEb57Af31722223034747", 8]
}

const tokenUri = "https://tokenUri.com"
const tax = 500
const maxTokensPerMint = 5


 



async function main() {

  let advancedONFT1155Gasless: any
  const owner = (await hre.ethers.getSigners())[0]
  console.log("Deployer is:", owner.address)
  const network = await hre.ethers.provider.getNetwork()
  // const USDC = await hre.ethers.getContractFactory("ERC20Mock");
  // const usdc = await USDC.deploy("USDC", "TEST");
  // await usdc.deployed();
  // await usdc.mint(owner.address, 1000000000000);

  const usdcaddress = "0xF6df969C6FD8665D982b1B65d8161aCE558409f9"

  

  console.log("USDC was deployed on", network.name, "to:", usdcaddress)
  

  const AdvancedONFT1155Gasless = await hre.ethers.getContractFactory("AdvancedONFT1155Gasless");

  
  advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.arbitrumGoerli[0], tokenUri, tokenUri, tax, owner.address, usdcaddress, maxTokensPerMint, lzEndpoints.arbitrumGoerli[1]);

  // if (network.chainId == 5){

  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.goerli[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.goerli[1]);
  // } else if (network.chainId == 80001){
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.mumbai[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.mumbai[1]);
  // } else if (network.chainId == 421613){
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.arbitrumGoerli[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.arbitrumGoerli[1]);
  // } else if (network.chainId == 97){
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.bsc[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.bsc[1]);
  // } else if (network.chainId == 420){
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.optimism[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.optimism[1]);
  // } else if (network.chainId == 4002) {
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.fantom[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.fantom[1]);
  // } else if (network.chainId == 43113) {
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.fuji[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.fuji[1]);
  // } else if (network.chainId == 1287){
  //   advancedONFT1155Gasless = await AdvancedONFT1155Gasless.deploy(lzEndpoints.moonbeam[0], tokenUri, tokenUri, tax, owner.address, usdc.address, maxTokensPerMint, lzEndpoints.moonbeam[1]);
  // } else {
  //   console.log( network.name,'Network not supported')
  // }

  await advancedONFT1155Gasless.deployed();

  console.log("AdvancedONFT1155Gasless was deployed on", network.name, "to:", advancedONFT1155Gasless.address)

  // await usdc.approve(advancedONFT1155Gasless.address, 100000000000);
  // await advancedONFT1155Gasless.setPrice(1000000000)
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
