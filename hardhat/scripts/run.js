const hre = require('hardhat')
const { ethers } = require('hardhat')

let marketplace
let nft

const main = async () => {
    const Marketplace = await hre.ethers.getContractFactory('Marketplace')
    marketplace = await Marketplace.deploy(5)
    await marketplace.deployed()
    console.log('Marketplace deployed to:', marketplace.address)

    const NFT = await hre.ethers.getContractFactory('NFT')
    nft = await NFT.deploy(marketplace.address)
    await nft.deployed()
    console.log('NFT contract deployed to: ', nft.address)
}

const testMint = async () => {
    const [owner, buyer] = await ethers.getSigners()
    const listPrice = ethers.utils.parseUnits('10', 'ether')
    const listPriceInHex = ethers.utils.parseUnits('10', 'ether')
    // console.log('owner in testMint: ', owner.address)

    // Mint NFT
    const mint = await nft.mintToken('https://ipfs.io/ipfs/QmXmNSH2dyp5R6dkW5MVhNc7xqV9v3NHWxNXJfCL6CcYxS', 2, '0x00')
    const txn = await mint.wait()

    // List NFT on Marketplace
    await marketplace.listItemsForSale(nft.address, 1, 2, listPrice)
    const item = await marketplace.getItemById(1)
    // console.log('listed item: ', item)

    // Purchase NFT
    await marketplace.connect(buyer).purchaseItem(nft.address, 1, { value: listPrice })
    const buyerBalance = await nft.balanceOf(buyer.address, '1')
    // console.log('buyerBalance: ', buyerBalance)
}

const runMain = async () => {
    try {
        await main()
        await testMint()
        process.exit(0)
    } catch (err) {
        console.log(err)
        process.exit(1)
    }
}

runMain()
