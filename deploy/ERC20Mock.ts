import hre from 'hardhat'

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('ERC20Mock', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1
  })

  console.log(`✅ [${hre.network.name}]`)
}

module.exports.tags = ['ERC20Mock']
