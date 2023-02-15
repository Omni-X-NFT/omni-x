import { deployVanilaNFT } from './VanilaNFT721'

// @ts-ignore
module.exports = async function ({ deployments, getNamedAccounts }) {
  await deployVanilaNFT('pudgy-penguins', { deployments, getNamedAccounts })
}

module.exports.tags = ['pudgy-penguins']
