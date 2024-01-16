import { promises as fs } from 'fs'
import * as path from 'path'

interface NFT {
  identifier: string;
  // include other properties if necessary
}

interface NFTData {
  nfts: NFT[];
}

const extractUniqueIdentifiers = async (filePath: string) => {
  try {
    const data = await fs.readFile(filePath, 'utf8')
    const jsonData: NFTData = JSON.parse(data)
    const uniqueIdentifiers = new Set<string>()

    jsonData.nfts.forEach(nft => {
      uniqueIdentifiers.add(nft.identifier)
    })

    await writeIdentifiersToFile(Array.from(uniqueIdentifiers))
  } catch (err) {
    console.error('Error:', err)
  }
}

const writeIdentifiersToFile = async (identifiers: string[]) => {
  const outputFile = path.join(__dirname, 'unique_identifiers.txt')
  const dataToWrite = identifiers.join('\n')

  try {
    await fs.writeFile(outputFile, dataToWrite, 'utf8')
    console.log(`Unique identifiers have been saved to ${outputFile}`)
  } catch (err) {
    console.error('Error writing to file:', err)
  }
}

// Replace with the path to your JSON file
const jsonFilePath = '../omni-x/constants/omnixpolygonomnielements.json'
extractUniqueIdentifiers(jsonFilePath)
