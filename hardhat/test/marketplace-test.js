const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('NFT Marketplace', function () {
    let marketplace
    let nft
    let marketplaceAddress
    let nftAddress
    let contractOwner
    let seller1
    let seller2
    let buyer1
    let buyer2
    let listPrice
    const provider = ethers.provider

    beforeEach(async () => {
        ;[contractOwner, seller1, seller2, buyer1, buyer2] = await ethers.getSigners()

        const Marketplace = await ethers.getContractFactory('Marketplace')
        marketplace = await Marketplace.deploy()
        await marketplace.deployed()
        marketplaceAddress = marketplace.address

        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(marketplaceAddress)
        await nft.deployed()
        nftAddress = nft.address

        listingCost = await marketplace.getListingCost()
        listingCost = listingCost.toString()
    })

    describe('Deployment', async () => {
        it('Should set the owner of both contracts as contractOwner', async () => {
            expect(await marketplace.owner()).to.equal(contractOwner.address)
            expect(await nft.owner()).to.equal(contractOwner.address)
            // console.log(`contractOwner: ${contractOwner.address}, marketplaceOwner: ${await marketplace.owner()}, nftOwner: ${await nft.owner()}`);
        })

        it('Should set the address of the Marketplace contract as the marketAddress in the NFT contract', async () => {
            expect(await marketplaceAddress).to.equal(await nft.getMarketAddress())
            // console.log(`marketplaceAddress: ${await marketplaceAddress}, nftAddress: ${await nft.getMarketAddress()} `);
        })
    })

    describe('Minting Tokens', async () => {
        beforeEach(async () => {
            await nft.mintToken(contractOwner.address, 0, 5, '0x00')
            await nft.mintToken(contractOwner.address, 1, 10, '0x00')
        })

        it('Should mint the correct quantity of NFTs', async () => {
            const numOfToken0 = await nft.balanceOf(contractOwner.address, 0)
            const numOfToken1 = await nft.balanceOf(contractOwner.address, 1)
            expect(await numOfToken0).to.equal(5)
            expect(await numOfToken1).to.equal(10)
            // console.log("token count: ", noOfToken0, noOfToken1);
        })

        it('Should successfully set the tokenURI of the NFT', async () => {
            await nft.connect(contractOwner).setTokenURI(0, 'https://cdn.mos.cms.futurecdn.net/2NBcYamXxLpvA77ciPfKZW-1200-80.jpg')
            await nft
                .connect(contractOwner)
                .setTokenURI(1, 'https://www.dccomics.com/sites/default/files/Marquee_DSM_CH_098_558a03cfde9174.78898221.jpg')
            const token0URI = await nft.getTokenURI(0)
            const token1URI = await nft.getTokenURI(1)
            expect(await token0URI).to.equal('https://cdn.mos.cms.futurecdn.net/2NBcYamXxLpvA77ciPfKZW-1200-80.jpg')
            expect(await token1URI).to.equal('https://www.dccomics.com/sites/default/files/Marquee_DSM_CH_098_558a03cfde9174.78898221.jpg')
            // console.log(token0URI, token1URI);
        })
    })

    describe('Market Transactions', async () => {
        listPrice = ethers.utils.parseUnits('10', 'ether')

        beforeEach(async () => {
            await nft.mintToken(contractOwner.address, 0, 5, '0x00')
            await nft.mintToken(contractOwner.address, 1, 10, '0x00')
            await nft.mintToken(seller1.address, 2, 15, '0x00')
            await nft.mintToken(seller2.address, 3, 20, '0x00')
            await nft.setApprovalForAll(marketplaceAddress, true)
            await nft.connect(seller1).setApprovalForAll(marketplaceAddress, true)
            await nft.connect(seller2).setApprovalForAll(marketplaceAddress, true)
        })

        it('Should successfully list items for sale', async () => {
            await marketplace.listItemForSale(nftAddress, 0, 1, listPrice)
            await marketplace.connect(seller1).listItemForSale(nftAddress, 2, 2, listPrice)
            await marketplace.connect(seller2).listItemForSale(nftAddress, 3, 2, listPrice)

            const ownersItem = await marketplace.getItemById(1)
            const seller1Item = await marketplace.getItemById(2)
            const seller2Item = await marketplace.getItemById(3)

            expect(await ownersItem.isListed).to.be.true
            expect(await ownersItem.isSold).to.be.false
            expect(await seller1Item.isListed).to.be.true
            expect(await seller1Item.isSold).to.be.false
            expect(await seller2Item.isListed).to.be.true
            expect(await seller2Item.isSold).to.be.false
        })

        it('Should throw an error if listPrice < 0', async () => {
            await expect(marketplace.listItemForSale(nftAddress, 0, 2, 0)).to.be.revertedWith('Item price must be greater than zero')
        })

        it('Should transfer NFT to buyer when purchase is made', async () => {
            await marketplace.listItemForSale(nftAddress, 0, 1, listPrice)
            await marketplace.listItemForSale(nftAddress, 1, 1, listPrice)
            await marketplace.connect(buyer1).purchaseItems(nftAddress, 1, 1, { value: listPrice })
            await marketplace.connect(buyer2).purchaseItems(nftAddress, 2, 1, { value: listPrice })

            const ownerToken0Balance = await nft.balanceOf(contractOwner.address, 0)
            const ownerToken1Balance = await nft.balanceOf(contractOwner.address, 1)
            expect(ownerToken0Balance).to.equal(4)
            expect(ownerToken1Balance).to.equal(9)

            const buyer1Token0Balance = await nft.balanceOf(buyer1.address, 0)
            const buyer2Token1Balance = await nft.balanceOf(buyer2.address, 1)
            expect(buyer1Token0Balance).to.equal(1)
            expect(buyer2Token1Balance).to.equal(1)
        })

        it('Should transfer cost of NFT to seller when purchase is made', async () => {
            const originalOwnerBalance = await provider.getBalance(contractOwner.address)
            const originalBuyerBalance = await provider.getBalance(buyer1.address)
            // console.log('originalOwnerBalance', originalOwnerBalance.toString(), 'originalBuyerBalance', originalBuyerBalance.toString())
            await marketplace.listItemForSale(nftAddress, 0, 1, listPrice)
            await marketplace.listItemForSale(nftAddress, 1, 1, listPrice)
            await marketplace.connect(buyer1).purchaseItems(nftAddress, 1, 1, { value: listPrice })
            await marketplace.connect(buyer1).purchaseItems(nftAddress, 2, 1, { value: listPrice })
            const newOwnerBalance = await provider.getBalance(contractOwner.address)
            const newBuyerBalance = await provider.getBalance(buyer1.address)
            // console.log('newOwnerBalance', newOwnerBalance.toString(), 'newBuyerBalance', newBuyerBalance.toString())

            const priceInWei = ethers.utils.parseUnits('4', 'ether')
            // console.log('price in Wei: ', priceInWei.toString())
            expect(newOwnerBalance - originalOwnerBalance > priceInWei).to.be.true
            expect(originalBuyerBalance - newBuyerBalance > priceInWei).to.be.true
        })
    })

    describe('Listing Permissions', async () => {
        beforeEach(async () => {
            await nft.mintToken(contractOwner.address, 0, 5, '0x00')
            await nft.mintToken(contractOwner.address, 1, 10, '0x00')
            await nft.setApprovalForAll(marketplaceAddress, true)
            await marketplace.listItemForSale(nftAddress, 0, 1, listPrice)
            await marketplace.listItemForSale(nftAddress, 1, 1, listPrice)
        })

        it('Should allow owner of NFT to delist item', async () => {
            const originalListedItems = await marketplace.getListedItems()
            await marketplace.delistItem(1)
            const newListedItems = await marketplace.getListedItems()
            expect(originalListedItems.length - newListedItems.length).to.equal(1)
        })

        it('Should allow owner of NFT to list an item they have purchased', async () => {
            await marketplace.connect(buyer1).purchaseItems(nftAddress, 1, 1, { value: listPrice })
            const originalListedItems = await marketplace.getListedItems()
            // console.log('originalListedItems: ', originalListedItems)
            await marketplace.connect(buyer1).relistItem(1)
            const newListedItems = await marketplace.getListedItems()
            // console.log('newListedItems: ', newListedItems)
            expect(newListedItems.length - originalListedItems.length).to.equal(1)
        })
    })

    describe('Retrieving Items', async () => {
        beforeEach(async () => {
            await nft.mintToken(seller1.address, 0, 10, '0x00')
            await nft.mintToken(seller1.address, 1, 5, '0x00')
            await nft.connect(seller1).setApprovalForAll(marketplaceAddress, true)
            await marketplace.connect(seller1).listItemForSale(nftAddress, 0, 5, listPrice)
            await marketplace.connect(seller1).listItemForSale(nftAddress, 1, 2, listPrice)
        })

        it('Should fetch the correct quantity of NFTs created', async () => {
            const seller1Tokens = await marketplace.connect(seller1).getItemsCreated()
            console.log('seller Tokens: ', seller1Tokens[0].quantity)
            expect(seller1Tokens.length).to.equal(2)
            expect(seller1Tokens[0].quantity).to.equal(10)
            // expect(seller1Tokens[1].quantity).to.equal(5)
        })

        it('Should fetch the correct quantity of NFTs owned', async () => {
            await marketplace.connect(buyer1).purchaseItems(nftAddress, 1, 2, { value: listPrice })
            await marketplace.connect(buyer2).purchaseItems(nftAddress, 2, 1, { value: listPrice })
            const seller1Tokens = await marketplace.connect(seller1).getItemsCreated()
            // expect(seller1Tokens[0].length).to.equal(10)
        })
    })
})
