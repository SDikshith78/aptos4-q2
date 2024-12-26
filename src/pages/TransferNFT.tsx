import React, { useState } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AptosClient } from "aptos";

interface TransferNFTProps {
  marketplaceAddr: string;
  nftId: number;
  onClose: () => void;
  onTransferSuccess: () => void;
  onTransferFail: () => void;
}

const TransferNFT: React.FC<TransferNFTProps> = ({ marketplaceAddr, nftId, onClose, onTransferSuccess, onTransferFail }) => {
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const { signAndSubmitTransaction } = useWallet();

  const handleTransfer = async () => {
    if (!recipientAddress) {
      message.error('Please enter a recipient address.');
      return;
    }

    setIsTransferring(true);
    try {
      const transaction = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::transfer_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, nftId.toString(), recipientAddress],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(transaction);
      await new AptosClient("https://fullnode.testnet.aptoslabs.com/v1").waitForTransaction(response.hash);

      message.success('NFT transferred successfully!');
      onClose();
      onTransferSuccess(); // Call this when transfer is successful
    } catch (error) {
      console.error("Error transferring NFT:", error);
      message.error('Failed to transfer NFT. Please try again.');
      onTransferFail(); // Call this when transfer fails
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Modal
      title="Transfer NFT"
      visible={true}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isTransferring} onClick={handleTransfer}>
          {isTransferring ? 'Transferring...' : 'Transfer'}
        </Button>,
      ]}
    >
      <Input 
        placeholder="Enter recipient's wallet address"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
    </Modal>
  );
};

export default TransferNFT;