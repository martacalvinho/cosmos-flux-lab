import React from 'react';
import NFTCollections from './components/nfts/NFTCollections';

// Simple test component to verify NFT rendering
const TestNFT = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">NFT Component Test</h1>
        <NFTCollections />
      </div>
    </div>
  );
};

export default TestNFT;
