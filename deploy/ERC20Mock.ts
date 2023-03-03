import hre from 'hardhat'

async function main () {
  const owner = (await hre.ethers.getSigners())[0]
  console.log('Deployer is:', owner.address)
  const network = await hre.ethers.provider.getNetwork()

  const USDC = await hre.ethers.getContractFactory('ERC20Mock')
  const usdc = await USDC.deploy('USDC', 'TEST')
  await usdc.deployed()
  await usdc.mint(owner.address, 1000000000000)

  console.log('USDC was deployed on', network.name, 'to:', usdc.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
