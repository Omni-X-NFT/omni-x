import hre from 'hardhat'
import fs from 'fs'
import path from 'path'
import LZ_ENDPOINTS from '../constants/layerzeroEndpoints.json'

type CHAINTYPE = {
  [key: string]: string
}

const ENDPOINTS: CHAINTYPE = LZ_ENDPOINTS

async function main (): Promise<void> {
  const [deployer] = await hre.ethers.getSigners()

  console.log(`>>> your address: ${deployer.address}`)

  // get the Endpoint address
  const endpointAddr = ENDPOINTS[hre.network.name]
  console.log(`[${hre.network.name}] LayerZero Endpoint address: ${endpointAddr}`)

  // OmniBridgeInstance contract
  const omniBridge = await hre.ethers.getContractFactory('OmniBridge')
  const OmniBridgeInstance = await omniBridge.deploy(
    endpointAddr
  )
  await OmniBridgeInstance.deployed()

  console.log(OmniBridgeInstance.address)

  // OmniBridge1155Instance contract
  const omniBridge1155 = await hre.ethers.getContractFactory('OmniBridge1155')
  const OmniBridge1155Instance = await omniBridge1155.deploy(
    endpointAddr
  )
  await OmniBridge1155Instance.deployed()

  console.log(OmniBridge1155Instance.address)

  const folderName = hre.network.name === 'hardhat' ? 'localhost' : hre.network.name
  if (!fs.existsSync(path.resolve(__dirname, `../deployments/${folderName}`))) {
    fs.mkdirSync(path.resolve(__dirname, `../deployments/${folderName}`))
  }
  fs.writeFileSync(path.resolve(__dirname, `../deployments/${folderName}/OmniBridge.json`), JSON.stringify({
    address: OmniBridgeInstance.address
  }), {
    encoding: 'utf8',
    flag: 'w'
  })
  fs.writeFileSync(path.resolve(__dirname, `../deployments/${folderName}/OmniBridge1155.json`), JSON.stringify({
    address: OmniBridge1155Instance.address
  }), {
    encoding: 'utf8',
    flag: 'w'
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
