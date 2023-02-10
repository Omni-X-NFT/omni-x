import hre from 'hardhat'
import {ethers} from "ethers"

async function main() {

    
    const ONFT = await hre.ethers.getContractFactory("AdvancedONFT1155Gasless");
    const USDC = await hre.ethers.getContractFactory("ERC20Mock");

    const usdc = await USDC.attach("0xF6df969C6FD8665D982b1B65d8161aCE558409f9");
    const onft = await ONFT.attach("0xd8995A055c8E6819647f234490D405bA40671fA9");
    

    await onft.setPrice(1000000000);
    await usdc.approve(onft.address, 100000000000);



    
    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  