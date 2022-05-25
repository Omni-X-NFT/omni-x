import fs from 'fs'
import path from 'path'

type rtnType = {
  [key: string]: string
}

export const getDeploymentAddresses = (networkName: string): rtnType => {
  const PROJECT_ROOT = path.resolve(__dirname, '..')
  const DEPLOYMENT_PATH = path.resolve(PROJECT_ROOT, 'deployments')

  let folderName = networkName
  if (networkName === 'hardhat') {
    folderName = 'localhost'
  }

  const networkFolderName = fs.readdirSync(DEPLOYMENT_PATH).filter((f) => f === folderName)[0]
  if (networkFolderName === undefined) {
    throw new Error('missing deployment files for endpoint ' + folderName)
  }

  const rtnAddresses: rtnType = {}
  const networkFolderPath = path.resolve(DEPLOYMENT_PATH, folderName)
  const files = fs.readdirSync(networkFolderPath).filter((f) => f.includes('.json'))
  files.forEach((file) => {
    const content = fs.readFileSync(path.resolve(networkFolderPath, file))
    const data = JSON.parse(content.toString())
    const contractName = file.split('.')[0]
    rtnAddresses[contractName] = data.address
  })

  return rtnAddresses
}
