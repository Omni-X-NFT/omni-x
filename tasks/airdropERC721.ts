import { task } from 'hardhat/config'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { BigNumber } from 'ethers'
// eslint-disable-next-line camelcase
import { GasliteDrop, GasliteDrop__factory } from 'typechain-types'

// Define constants
const CSV_FILE_PATH = './constants/OE2024final.csv'

// Define the task
task('airdropERC721', 'Airdrops NFTs to a list of addresses')
  .addParam('nft', 'The ERC721 contract address')
  .setAction(async ({ nft }, hre) => {
    const { ethers } = hre

    const [owner] = await ethers.getSigners()
    // Read and parse the CSV file
    const csvData = readFileSync(CSV_FILE_PATH)
    const records = parse(csvData, {
      columns: false,
      skip_empty_lines: true
    })

    // Extract addresses and tokenIds from the CSV records
    const addresses: string[] = []
    const tokenIds: BigNumber[] = []
    for (const record of records) {
      addresses.push(record[0])
      tokenIds.push(BigNumber.from(record[1]))
    }

    // Initialize the contract instance
    // eslint-disable-next-line camelcase
    const gasliteDropContract: GasliteDrop = GasliteDrop__factory.connect('0x09350F89e2D7B6e96bA730783c2d76137B045FEF', owner)

    // Call the airdropERC721 function
    const transaction = await gasliteDropContract.airdropERC721(nft, addresses, tokenIds)
    await transaction.wait()
    console.log(`tx: ${transaction.blockHash}`)
    console.log('Airdrop completed!')
  })

// Export for use in Hardhat configuration
export default {}
