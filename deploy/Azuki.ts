import { deployVanilaNFT } from './VanilaNFT721'

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  await deployVanilaNFT('azuki', { deployments, getNamedAccounts })
}

module.exports.tags = ['azuki']
