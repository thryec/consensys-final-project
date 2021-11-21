import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import Web3Modal from 'web3modal'
import { useRouter } from 'next/dist/client/router'
import { nftaddress, marketplaceaddress } from '../../config'
import NFT from '../../hardhat/artifacts/contracts/NFT.sol/NFT.json'
import Market from '../../hardhat/artifacts/contracts/Marketplace.sol/Marketplace.json'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'

const myGallery = () => {
    const [myNFTs, setMyNFTs] = useState([])
    const [isLoaded, setIsLoaded] = useState(false)
    const [modalActive, setModalActive] = useState(false)
    const router = useRouter()

    const fetchMyNFTs = async () => {
        const web3modal = new Web3Modal()
        const connection = await web3modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        const nftContract = new ethers.Contract(nftaddress, NFT.abi, signer)
        const marketplaceContract = new ethers.Contract(marketplaceaddress, Market.abi, signer)

        const data = await marketplaceContract.getItemsOwned()

        const items = await Promise.all(
            data.map(async (el) => {
                const tokenURI = await nftContract.getTokenURI(el.tokenId)
                const res = await fetch(tokenURI)
                const data = await res.json()
                let price = ethers.utils.formatUnits(el.price.toString(), 'ether')
                let item = {
                    price,
                    tokenId: el.tokenId.toNumber(),
                    itemId: el.itemId.toNumber(),
                    seller: el.seller,
                    owner: el.owner,
                    listed: el.isListed,
                    image: data.image,
                    name: data.name,
                    description: data.description,
                }
                return item
            })
        )
        setMyNFTs(items)
        setIsLoaded(true)
    }

    const listItem = async (itemId) => {
        // const web3modal = new Web3Modal()
        // const connection = await web3modal.connect()
        // const provider = new ethers.providers.Web3Provider(connection)
        // const signer = provider.getSigner()

        // const marketplaceContract = new ethers.Contract(marketplaceaddress, Market.abi, signer)

        console.log('listing item with itemId: ', itemId)
        setModalActive(true)
    }

    const burnItem = async (tokenId) => {
        const web3modal = new Web3Modal()
        const connection = await web3modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        const nftContract = new ethers.Contract(nftaddress, NFT.abi, signer)
        const marketplaceContract = new ethers.Contract(marketplaceaddress, Market.abi, signer)

        console.log('burning token with id ', tokenId)
        const burn = await nftContract.burnTokens(tokenId, 1)
        const txn = await burn.wait()
        console.log('token burned, txn receipt: ', txn)
        router.push('/gallery')
    }

    const renderNFTs = myNFTs.map((el, i) => {
        return (
            <Card sx={{ width: 275 }} key={i}>
                <CardMedia component="img" height="300" image={el.image} alt="green iguana" />
                <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                        {el.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {el.description}
                    </Typography>
                </CardContent>
                <CardActions>
                    <Button
                        onClick={() => {
                            listItem(el.tokenId)
                        }}
                        size="small"
                    >
                        Sell
                    </Button>
                    <Modal
                        open={modalActive}
                        onClose={() => {
                            setModalActive(false)
                        }}
                        aria-labelledby="modal-modal-title"
                        aria-describedby="modal-modal-description"
                    >
                        <Box sx={modalStyle}>
                            <Typography id="modal-modal-title" variant="h6" component="h2">
                                Text in a modal
                            </Typography>
                            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                                Duis mollis, est non commodo luctus, nisi erat porttitor ligula.
                            </Typography>
                        </Box>
                    </Modal>
                </CardActions>
            </Card>
        )
    })

    const render = myNFTs.map((el, i) => {
        return (
            <div key={i}>
                <img src={el.image} />
                <p>{el.price} ETH</p>
            </div>
        )
    })

    // useEffect(() => {
    //     fetchMyNFTs()
    // }, [])

    return isLoaded ? (
        <div style={bodyStyle}>
            <Stack direction="row" spacing={2}>
                {renderNFTs}
            </Stack>
        </div>
    ) : (
        <div style={bodyStyle}>
            <Button onClick={fetchMyNFTs} variant="contained">
                Connect Wallet
            </Button>
        </div>
    )
}

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 700,
    height: 500,
    bgcolor: 'background.paper',
    border: '2px solid #aaa',
    borderRadius: '5%',
    boxShadow: 24,
    p: 4,
}

const bodyStyle = {
    margin: 40,
}

export default myGallery
