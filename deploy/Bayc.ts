import { deployVanilaNFT } from './VanilaNFT721'

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  await deployVanilaNFT('bayc', { deployments, getNamedAccounts })
}

module.exports.tags = ['bayc']
