import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { solidity } from 'ethereum-waffle'

import { ExecutionInfo } from "../utils/execution-router";
import { SeaportListing } from "@reservoir0x/contracts/test/router/v6/helpers/seaport";
import {
  bn,
  getChainId,
  getRandomBoolean,
  getRandomFloat,
  getRandomInteger,
} from "@reservoir0x/contracts/test/utils";
import { 
  Chain,
  deploy,
  linkChains,
  prepareMaker,
  prepareTaker,
  prepareStargate,
  setupBridge,
  setupChainPath,
  setupPool,
  setupSeaportListings,
  toWei
} from "./TestDependencies";

chai.use(solidity)

const SRC_CHAIN_ID = 1
const DST_CHAIN_ID = 2
const SRC_POOL_ID = 1
const DST_POOL_ID = 2

describe("[ExchangeRouter] Seaport listings", () => {
  let makerChain: Chain
  let takerChain: Chain

  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;     // maker
  let carol: SignerWithAddress;     // taker
  let bob: SignerWithAddress;     // fee recipient

  beforeEach(async () => {
    [deployer, alice, carol, bob] = await ethers.getSigners();

    makerChain = await deploy(deployer, SRC_CHAIN_ID)
    takerChain = await deploy(deployer, DST_CHAIN_ID)

    await linkChains(makerChain, takerChain)
    await linkChains(takerChain, makerChain)

    await prepareMaker(makerChain, alice)
    await prepareTaker(takerChain, carol)

    // for same chain trading, need to send the funds to carol.
    await makerChain.erc20Mock.mint(carol.address, toWei(100));

    await prepareStargate(makerChain, SRC_POOL_ID, deployer)
    await prepareStargate(takerChain, DST_POOL_ID, deployer)

    await setupBridge(makerChain, takerChain)
    await setupBridge(takerChain, makerChain)

    await setupChainPath(makerChain, DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID, deployer)
    await setupChainPath(takerChain, SRC_CHAIN_ID, DST_POOL_ID, SRC_POOL_ID, deployer)

    await setupPool(makerChain, DST_CHAIN_ID, SRC_POOL_ID, DST_POOL_ID, alice)
    await setupPool(takerChain, SRC_CHAIN_ID, DST_POOL_ID, SRC_POOL_ID, carol)
  });

  const getBalances = async (chain: Chain) => {
    return {
      alice: await chain.erc20Mock.balanceOf(alice.address),
      carol: await chain.erc20Mock.balanceOf(carol.address),
      bob: await chain.erc20Mock.balanceOf(bob.address),
      router: await chain.erc20Mock.balanceOf(chain.router.address),
      seaportModule: await chain.erc20Mock.balanceOf(chain.seaportModule.address),
    };
  };

  const testAcceptListings = async (
    // Whether to revert or not in case of any failures
    revertIfIncomplete: boolean,
    // Number of listings to fill
    listingsCount: number
  ) => {
    // Setup

    // Makers: Alice
    // Taker: Carol
    // Fee recipient: Bob

    const paymentToken = makerChain.erc20Mock.address;
    const parsePrice = (price: string, isUsdc: boolean) =>
      isUsdc ? parseUnits(price, 6) : parseEther(price);

    const listings: SeaportListing[] = [];
    for (let i = 0; i < listingsCount; i++) {
      listings.push({
        seller: alice,
        nft: {
          kind: "erc721",
          contract: makerChain.nftMock,
          id: getRandomInteger(1, 10000),
        },
        paymentToken,
        price: parsePrice(getRandomFloat(0.0001, 2).toFixed(6), true),
        isCancelled: false,
      });
    }

    await setupSeaportListings(listings, makerChain);

    // Prepare executions
    const totalPrice = bn(
      listings.map(({ price }) => price).reduce((a, b) => bn(a).add(b), bn(0))
    );

    const executions: ExecutionInfo[] = [
      // transfer funds from buyer to seaport module
      {
        module: makerChain.erc20Mock.address,
        data: makerChain.erc20Mock.interface.encodeFunctionData(
          'transferFrom',
          [
            carol.address,
            makerChain.seaportModule.address,
            listings[0].price
          ]
        ),
        value: 0
      },

      // accept erc20 listing
      {
        module: makerChain.seaportModule.address,
        data: makerChain.seaportModule.interface.encodeFunctionData(
          'acceptERC20Listing',
          [
            ...listings.map((listing) => ({
              parameters: {
                ...listing.order!.params,
                totalOriginalConsiderationItems:
                  listing.order!.params.consideration.length,
              },
              numerator: 1,
              denominator: 1,
              signature: listing.order!.params.signature,
              extraData: "0x",
            })),
            {
              fillTo: carol.address,
              refundTo: carol.address,
              revertIfIncomplete,
              amount: totalPrice,
              // Only relevant when filling USDC listings
              token: paymentToken,
            },
            [],
          ]
        ),
        value: 0
      },
    ];

    // Approve
    // seller approve seaport exchange for all nfts.
    await (await makerChain.nftMock.connect(alice).setApprovalForAll(makerChain.seaport.address, true)).wait();
    // seller approve router for usdc transfer.
    await (await makerChain.erc20Mock.connect(carol).approve(makerChain.router.address, listings[0].price)).wait();

    // Fetch pre-state

    const balancesBefore = await getBalances(makerChain);

    // Execute

    await makerChain.router.connect(carol).execute(executions, {
      value: executions
        .map(({ value }) => value)
        .reduce((a, b) => bn(a).add(b), bn(0)),
    });

    // // Fetch post-state

    const balancesAfter = await getBalances(makerChain);

    // Alice got the payment
    expect(balancesAfter.alice.sub(balancesBefore.alice)).to.eq(
      listings
        .filter(
          ({ seller, isCancelled }) =>
            !isCancelled && seller.address === alice.address
        )
        .map(({ price }) => price)
        .reduce((a, b) => bn(a).add(b), bn(0))
    );
    // Bob got the payment
    expect(balancesAfter.bob.sub(balancesBefore.bob)).to.eq(
      listings
        .filter(
          ({ seller, isCancelled }) =>
            !isCancelled && seller.address === bob.address
        )
        .map(({ price }) => price)
        .reduce((a, b) => bn(a).add(b), bn(0))
    );

    // Carol got the NFTs from all filled orders
    for (let i = 0; i < listings.length; i++) {
      const nft = listings[i].nft;
      if (!listings[i].isCancelled) {
        if (nft.kind === "erc721") {
          expect(await nft.contract.ownerOf(nft.id)).to.eq(carol.address);
        } else {
          expect(await nft.contract.balanceOf(carol.address, nft.id)).to.eq(1);
        }
      } else {
        if (nft.kind === "erc721") {
          expect(await nft.contract.ownerOf(nft.id)).to.eq(
            listings[i].seller.address
          );
        } else {
          expect(
            await nft.contract.balanceOf(listings[i].seller.address, nft.id)
          ).to.eq(1);
        }
      }
    }

    // Router is stateless
    expect(balancesAfter.router).to.eq(0);
    expect(balancesAfter.seaportModule).to.eq(0);
  };

  it("Listing/Sell with USDC - Same Chain", async () => {
    await testAcceptListings(true, 1);
  });

});
