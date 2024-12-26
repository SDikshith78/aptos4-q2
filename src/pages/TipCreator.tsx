// src/pages/TipCreator.tsx

import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { AptosClient } from "aptos";

interface TipCreatorProps {
  marketplaceAddr: string;
  creatorAddress: string;
  onClose: () => void;
  onSupportSuccess: () => void;
  onSupportFail: () => void;
}

const TipCreator: React.FC<TipCreatorProps> = ({ marketplaceAddr, creatorAddress, onClose, onSupportSuccess, onSupportFail }) => {
  const [amount, setAmount] = useState<string>('');
  const [isTipping, setIsTipping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { account, signAndSubmitTransaction } = useWallet();

  const handleTip = async () => {
    const tipAmount = Number(amount);
    if (isNaN(tipAmount) || tipAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    setIsTipping(true);
    setError(null);

    try {
      if (!account) {
        throw new Error("Wallet not connected. Please connect your wallet.");
      }

      const transactionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::tip_creator`,
        type_arguments: [],
        arguments: [creatorAddress, Math.floor(tipAmount * 1e8).toString()],
      };

      console.log("Transaction Payload:", transactionPayload); // Log to check structure

      // Bypassing type check for signAndSubmitTransaction due to potential type mismatch
      const response = await (window as any).aptos.signAndSubmitTransaction(transactionPayload);
      console.log("Transaction Response:", response);

      // Wait for transaction to be mined if necessary
      const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");
      await client.waitForTransaction(response.hash);

      alert('Support has been successful! Payment is success.');
      onSupportSuccess(); // This will now work
      onClose();
    } catch (err) {
      setError(`Failed to send support: ${(err as Error).message}`);
      onSupportFail(); // This will now work
      console.error("Transaction Error:", err);
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <div className="tip-creator-container">
      <h3>Support the Creator</h3>
      <input 
        type="number" 
        value={amount} 
        onChange={(e) => setAmount(e.target.value)} 
        placeholder="Amount in APT" 
        className="tip-amount-input"
      />
      <button 
        onClick={handleTip} 
        disabled={isTipping}
        className="tip-button"
      >
        {isTipping ? 'Sending Support...' : 'Send Support'}
      </button>
      
      <button onClick={onClose} className="cancel-button">Cancel</button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default TipCreator;