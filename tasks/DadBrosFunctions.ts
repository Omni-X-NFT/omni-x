// import { ethers } from "hardhat";
// import { loadAbi } from './shared' // Used to pull the contract ABI located in a folder in the repo. Could just copy and paste ABI if needed, this isn't necessary
// import { MerkleTree } from 'merkletreejs' // Necessary for generating merkle root and proof
// import keccak256 from 'keccak256' // Necessary for generating merkle root and proof
// import WhitelistFriends from '../constants/DadBrosFriendsFinalSnapshot.json' // List of whitelist addresses in the form [{address: '0x...', count: 1}, {address: '0x...', count: 1}, ...] This is also used for merkle proof and root generation
// import WhitelistFree from '../constants/DadBrosFreeFinalSnapshot.json' // List of whitelist addresses in the form [{address: '0x...', count: 1}, {address: '0x...', count: 1}, ...] This is also used for merkle proof and root generation

// // Gets contract ABI from file in directory
// const DadBrosAbi = loadAbi('../artifacts/contracts/token/onft/extension/DadBros.sol/DadBros.json')


// async function getPrice () {
//   const [contractCaller] = await ethers.getSigners()
//   // pass in contract address, abi, and signer object to create a contract object
//   const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller)
//   // For Friends Mint
//   // params: MintType (1: free, 2: friends, 3: public), amount (1-5)
//   // Return : result[0] = newNextPrice, result[1] = totalPrice for (1-5) friends mints
//   const result = await (await contract.getPriceInfo(2, 5)).wait()

//   // For Public Mint
//   // params: MintType (1: free, 2: friends, 3: public), amount (1-20)
//   // Return : result[0] = newNextPrice, result[1] = totalPrice for (1-20) public mints
//   const result = await (await contract.getPriceInfo(3, 20)).wait()
// }
// getPrice()

// async function merkleProofGenFree (amount: number, address: string) {
//   // Merkle Tree and Proof Generation for Free mint
//   const leaves = (WhitelistFree as any).map((x: any) => keccak256(ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
//   const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
//   const root = tree.getHexRoot()
//   // Merkle root = root.toString()
//   const leaf = keccak256(ethers.utils.solidityPack(['address', 'uint256'], [amount, address]))
//   const proof = tree.getHexProof(leaf)
//   // proof holds a list of byte32 hashes that can be passed into the mint function as a merkle proof for the specified address and amount
// }
// async function merkleProofGenFriends (amount: number, address: string) {
//   // Merkle Tree and Proof Generation for Free mint
//   const leaves = (WhitelistFriends as any).map((x: any) => keccak256(ethers.utils.solidityPack(['address', 'uint256'], [x.address, x.count])))
//   const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
//   const root = tree.getHexRoot()
//   // Merkle root = root.toString()
//   const leaf = keccak256(ethers.utils.solidityPack(['address', 'uint256'], [amount, address]))
//   const proof = tree.getHexProof(leaf)
//   // proof holds a list of byte32 hashes that can be passed into the mint function as a merkle proof for the specified address and amount
// }

// async function mint () {
//   const [contractCaller] = await ethers.getSigners()
//   const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller)

//   // For Free Mint
//   // params: amount (1-4), MintType (1: free, 2: friends, 3: public), MerkleProof, amount of whitelist allocation (1-4)
//   // NOTE: amount can be less than amount of whitelist allocation but cannot be more
//   const proofFree = await merkleProofGenFree(4, '0x0')
//   await (await contract.mint(4, 1, proofFree, 4)).wait()  
//   // For Friends Mint
//   // params: amount (1-5), MintType (1: free, 2: friends, 3: public), MerkleProof, amount of whitelist allocation (1-5)
//   // NOTE: amount can be less than amount of whitelist allocation but cannot be more
//   const proofFriends = await merkleProofGenFriends(5, '0x0')
//   await (await contract.mint(5, 2, proofFriends, 5)).wait()  
//   // For Public Mint
//   // params: amount (1-20), MintType (1: free, 2: friends, 3: public), proof, whitelist amount (0 for free)
//   // NOTE: a fake proof has to be passed into the contract even though it is not being used 
//   const proofPublic = [ethers.utils.formatBytes32String('0')]
//   await (await (contract.mint(20, 3, proofPublic, 0))).wait()
// }

// mint()

// async function getFreeSupply () {
//   const [contractCaller] = await ethers.getSigners()
//   const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller)  
//   // freeSupply =  the supply of free mints (out of 700)
//   const freeSupply = await contract.freeSupply()
// }
// getFreeSupply()


// async function getFriendsAndPublicSupply () {
//   const [contractCaller] = await ethers.getSigners()
//   const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller)  
//   // friendsSupply =  the supply of friends mints (out of 2300)
//   const friendsSupply = await contract.friendsAndPublicSupply()
// }
// getFriendsAndPublicSupply()

// async function getTokenURI () {
//     const [contractCaller] = await ethers.getSigners()
//     const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller) 
//     // Params: tokenId (1-3000) 
//     // tokenURI =  the URI of the token metadata
//     const tokenURI = await contract.tokenURI(1)
// }


// async function getSaleStarted () {
//   const [contractCaller] = await ethers.getSigners()
//   const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller)  
//   // saleStarted = true if sale is live started
//   const saleStarted = await contract._saleStarted()
// }
// getSaleStarted()

// async function getRevealed () {
//   const [contractCaller] = await ethers.getSigners()
//   const contract = new ethers.Contract('0x0cfc7829a076F05434e8D4f0c1dED2656BFCfEb1', DadBrosAbi().abi, contractCaller)  
//   // revealed = true if the DadBros have been revealed
//   const revealed = await contract.revealed()
// }
// getRevealed()
