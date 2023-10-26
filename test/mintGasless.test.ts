import hre from 'hardhat'
import { Signer } from 'ethers'
import { expect } from 'chai'
import omniElementArgs from '../constants/omniElementArgs.json'
import snapshotData from '../constants/greg_holders_snapshot_final.json'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'


// Must un-comment regular mint and regular public mint on AdvancedONFT1155 for these tests to pass
describe('Mint Gasless: ', function () {
  let owner: Signer, ownerAddress: string, instance: any, usdc: any
  let lzEndpointMock: any
  let lzEndpointDstMock: any
  const chainIdSrc = 1
  const chainIdDst = 2
  const args = (omniElementArgs as any)['arbitrum-goerli']

  

  beforeEach(async function () {
    owner = (await hre.ethers.getSigners())[0]

    ownerAddress = await owner.getAddress()

    const USDC = await hre.ethers.getContractFactory('ERC20Mock')
    usdc = await USDC.deploy()
    await usdc.deployed()

    await usdc.mint(ownerAddress, 100000000)
    lzEndpointMock = await hre.ethers.getContractFactory('LZEndpointMock')
    await lzEndpointMock.deploy(chainIdSrc)
    lzEndpointDstMock = await lzEndpointMock.deploy(chainIdDst)

    const ONFT = await hre.ethers.getContractFactory('contracts/token/onft/extension/AdvancedONFT721Gasless.sol:AdvancedONFT721Gasless')

    instance = await ONFT.deploy(
        args.name,
        args.symbol,
        lzEndpointMock,
        args.startMintId,
        args.endMintId,
        args.maxTokensPerMint,
        args.baseTokenURI,
        args.hiddenURI,
        args.stableCoin,
        args.tax,
        args.taxRecipient
    )

    await instance.deployed()
    await (await instance.connect(owner).flipSaleStarted()).wait()
    await (await instance.connect(owner).flipPublicSaleStarted()).wait()
    await (await instance.setMerkleRoot(args.merkleRoot)).wait()
  })
  it('should mint one ONFT', async function () {
    const amount = 1
    const minter = snapshotData[5].address
    const leaves = snapshotData.map((holder) =>
    hre.ethers.utils.solidityKeccak256(
        ['address', 'uint256'],
        [holder.address, holder.count]
    ))
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    const leaf = hre.ethers.utils.solidityKeccak256(['address', 'uint256'], [minter, amount])
    const proof = tree.getHexProof(leaf)



    await instance.mintGasless(amount, minter, proof)

    const ONFTBalance = await instance.balanceOf(minter, amount)
    expect(await parseInt(ONFTBalance)).to.eq(amount)
  })
})