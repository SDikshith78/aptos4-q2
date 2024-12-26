import React, { useState, useEffect } from "react";
import { Typography, Radio, message, Card, Row, Col, Pagination, Tag, Button, Modal, Input, Select, InputNumber } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import TipCreator from "./TipCreator"

import successAnimation from "../assets/success.json"
import failedAnimation from "../assets/failed.json"
import Lottie from "lottie-react";

const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");

type NFT = {
  id: number;
  owner: string;
  name: string;
  description: string;
  uri: string;
  price: number;
  for_sale: boolean;
  rarity: number;
};

interface MarketViewProps {
  marketplaceAddr: string;
}

const rarityColors: { [key: number]: string } = {
  1: "green",
  2: "blue",
  3: "purple",
  4: "orange",
};

const rarityLabels: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
};

const truncateAddress = (address: string, start = 6, end = 4) => {
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

const MarketView: React.FC<MarketViewProps> = ({ marketplaceAddr }) => {
  const { signAndSubmitTransaction } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [rarity, setRarity] = useState<'all' | number>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);

  // Support button
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [supportAmount, setSupportAmount] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

  //success and failed animation
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  

  const [filters, setFilters] = useState({
    priceFrom: undefined as number | undefined,
    priceTo: undefined as number | undefined,
  });
  
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc'>('price_asc');

  useEffect(() => {
    handleFetchNfts(rarity === 'all' ? undefined : rarity);
  }, [rarity, filters, sortBy]);

  const handleFetchNfts = async (selectedRarity: number | undefined) => {
    try {
      const response = await client.getAccountResource(
        marketplaceAddr,
        "0x223d508f051f5869e232658de4a25c493813273319b5130ae54838c609be630d::NFTMarketplace::Marketplace"
      );
      const nftList = (response.data as { nfts: NFT[] }).nfts;
  
      const hexToUint8Array = (hexString: string): Uint8Array => {
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
        }
        return bytes;
      };
  
      const decodedNfts = nftList.map((nft) => ({
        ...nft,
        name: new TextDecoder().decode(hexToUint8Array(nft.name.slice(2))),
        description: new TextDecoder().decode(hexToUint8Array(nft.description.slice(2))),
        uri: new TextDecoder().decode(hexToUint8Array(nft.uri.slice(2))),
        price: nft.price / 100000000,
      }));
  
      // Filter NFTs based on `for_sale` property, rarity, and price range
      let filteredNfts = decodedNfts.filter((nft) => 
        nft.for_sale && 
        (selectedRarity === undefined || nft.rarity === selectedRarity) &&
        (filters.priceFrom === undefined || nft.price >= filters.priceFrom) &&
        (filters.priceTo === undefined || nft.price <= filters.priceTo)
      );
  
      // Sort NFTs
      switch(sortBy) {
        case 'price_asc':
          filteredNfts.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filteredNfts.sort((a, b) => b.price - a.price);
          break;
        default:
          break;
      }
  
      setNfts(filteredNfts);
      setCurrentPage(1); // Reset to first page after filtering/sorting
    } catch (error) {
      console.error("Error fetching NFTs by rarity:", error);
      message.error("Failed to fetch NFTs.");
    }
  };

  const handleBuyClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsBuyModalVisible(true);
  };

  const handleCancelBuy = () => {
    setIsBuyModalVisible(false);
    setSelectedNft(null);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedNft) return;
  
    try {
      const priceInOctas = selectedNft.price * 100000000;
  
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::purchase_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), priceInOctas.toString()],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("NFT purchased successfully!");
      setIsBuyModalVisible(false);
      handleFetchNfts(rarity === 'all' ? undefined : rarity); // Refresh NFT list
      console.log("signAndSubmitTransaction:", signAndSubmitTransaction);
      setShowSuccess(true); //success animation
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      message.error("Failed to purchase NFT.");
      setShowFailure(true); // failed animation
      setTimeout(() => setShowFailure(false), 5000);
    }
  };

  const paginatedNfts = nfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  //support function
  const handleSupport = async () => {
    if (!selectedCreator || !supportAmount) return;
    
    try {
      const amountInMicroAPT = Number(supportAmount) * 100000000; // Convert to microAPT
  
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::tip_creator`,
        type_arguments: [],
        arguments: [selectedCreator, amountInMicroAPT.toString()],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("Tip sent successfully!");
      setIsSupportModalVisible(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000); // Show success animation for 5 seconds
    } catch (error) {
      console.error("Error sending tip:", error);
      message.error("Failed to send tip.");
      setShowFailure(true);
      setTimeout(() => setShowFailure(false), 5000); // Show failure animation for 5 seconds
    }
  };

  const handleSupportClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsSupportModalVisible(true);
  };

  const handleCloseSupportModal = () => {
    setIsSupportModalVisible(false);
  };

  return (
    <div
      style={{  
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor:'#ffeae3'
      }}
    >
      <Title level={2} style={{ marginBottom: "20px" }}>Marketplace</Title>
  
      {/* Filter Buttons */}
      <div style={{ marginBottom: "20px" }}>
        <Radio.Group
          value={rarity}
          onChange={(e) => {
            const selectedRarity = e.target.value;
            setRarity(selectedRarity);
            handleFetchNfts(selectedRarity === 'all' ? undefined : selectedRarity);
          }}
          buttonStyle="solid"
        >
          <Radio.Button value="all">All</Radio.Button>
          <Radio.Button value={1}>Common</Radio.Button>
          <Radio.Button value={2}>Uncommon</Radio.Button>
          <Radio.Button value={3}>Rare</Radio.Button>
          <Radio.Button value={4}>Super Rare</Radio.Button>
        </Radio.Group>
      </div>

      <div style={{ marginBottom: "20px" }}>
  <Row gutter={16}>
    <Col span={8}>
      <InputNumber 
        placeholder="Price From (APT)" 
        value={filters.priceFrom} 
        onChange={(value) => setFilters({ ...filters, priceFrom: value || undefined })}
        style={{ width: '100%' }}
      />
    </Col>
    <Col span={8}>
      <InputNumber 
        placeholder="Price To (APT)" 
        value={filters.priceTo} 
        onChange={(value) => setFilters({ ...filters, priceTo: value || undefined })}
        style={{ width: '100%' }}
      />
    </Col>
    <Col span={8}>
      <Select 
        value={sortBy} 
        onChange={(value) => setSortBy(value)} 
        style={{ width: '100%' }}
      >
        <Select.Option value="price_asc">Price: Low to High</Select.Option>
        <Select.Option value="price_desc">Price: High to Low</Select.Option>
      </Select>
    </Col>
  </Row>
</div>
  
      {/* Card Grid */}
      <Row
        gutter={[24, 24]}
        style={{
          marginTop: 20,
          width: "100%",
          display: "flex",
          justifyContent: "center", // Center row content
          flexWrap: "wrap",
        }}
      >
        {paginatedNfts.map((nft) => (
          <Col
            key={nft.id}
            xs={24} sm={12} md={8} lg={6} xl={6}
            style={{
              display: "flex",
              justifyContent: "center", // Center the single card horizontally
              alignItems: "center", // Center content in both directions
            }}
          >
            <Card
              hoverable
              style={{
                width: "100%", // Make the card responsive
                maxWidth: "240px", // Limit the card width on larger screens
                margin: "0 auto",
              }}
              cover={<img alt={nft.name} src={nft.uri} />}
              actions={[
                <Button type="link" onClick={() => handleBuyClick(nft)}
                
                  style={{
                    backgroundColor: "#7dff4c",
                    color: "black",
                    fontWeight: '600',
                    transition: 'color 0.3s ease'
                  }}
                >
                  Buy
                </Button>,
                <Button type="link" onClick={() => handleSupportClick(nft)}
                
                  style={{
                    backgroundColor: "#fbb530",
                    color: "black",
                    fontWeight: '600',
                    transition: 'color 0.3s ease'
                  }}
                >
                  Support
                </Button>,
              ]}
            >
              {/* Rarity Tag */}
              <Tag
                color={rarityColors[nft.rarity]}
                style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
              >
                {rarityLabels[nft.rarity]}
              </Tag>
  
              <Meta title={nft.name} description={`Price: ${nft.price} APT`} />
              <p>{nft.description}</p>
              <p>ID: {nft.id}</p>
              <p>Owner: {truncateAddress(nft.owner)}</p>
            </Card>
          </Col>
        ))}
      </Row>
  
      {/* Pagination */}
      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={nfts.length}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>

      {/* Support Modal */}
      <Modal
  title="Support Creator"
  visible={isSupportModalVisible}
  onCancel={handleCloseSupportModal}
  footer={null}
>
  {selectedNft && (
    <TipCreator 
      marketplaceAddr={marketplaceAddr} 
      creatorAddress={selectedNft.owner} 
      onClose={handleCloseSupportModal}
      onSupportSuccess={() => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      }}
      onSupportFail={() => {
        setShowFailure(true);
        setTimeout(() => setShowFailure(false), 5000);
      }}
    />
  )}
</Modal>
  
      {/* success and failed  */}
      {showSuccess && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
          <Lottie animationData={successAnimation} loop={false} />
        </div>
      )}
      
      {showFailure && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
          <Lottie animationData={failedAnimation} loop={false} />
        </div>
      )}

      {/* Buy Modal */}
      <Modal
        title="Purchase NFT"
        visible={isBuyModalVisible}
        onCancel={handleCancelBuy}
        footer={[
          <Button key="cancel" onClick={handleCancelBuy}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmPurchase}>
            Confirm Purchase
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {rarityLabels[selectedNft.rarity]}</p>
            <p><strong>Price:</strong> {selectedNft.price} APT</p>
            <p><strong>Owner:</strong> {truncateAddress(selectedNft.owner)}</p>
          </>
        )}
      </Modal>
    </div>
  );
};

export default MarketView;