/**
 * DualNFT Mint Page - Enhanced Version
 * Features: User NFTs, Grid Gallery, IPFS Images, NFT Details Modal
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, createConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { mainnet } from "wagmi/chains";
import { http } from "wagmi";
import { formatEther, parseEther, maxUint256 } from "viem";

// ============================================================================
// Config
// ============================================================================

const DUALNFT_ADDRESS = "0xE38123495D4C8a18675bC0C4f9E4a9F932AC64D8" as const;
const STORY_TOKEN_ADDRESS = "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e" as const;
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
const METADATA_CID = "bafybeicfhlcssgs5amjomfqsa4hatcn64z44uzspz73ncjd555t2za57qq";

// All 10000 images hosted on server for fast loading
const SERVER_IMAGE_BASE = "/nft";

const MINT_PRICE = parseEther("10");

// ERC-404 ID encoding prefix
const ID_ENCODING_PREFIX = BigInt(1) << BigInt(255);

const RPC_URL = "https://lb.drpc.live/ethereum/AsVs23QoLEOwisC7Py3FTOoL9ez-0OkR8K7sOmy9-kY5";

const connectors = connectorsForWallets(
  [{ groupName: "Popular", wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet] }],
  { appName: "DualNFT", projectId: "dualnft-8004mint" }
);

const config = createConfig({
  connectors,
  chains: [mainnet],
  transports: { [mainnet.id]: http(RPC_URL) },
});

const queryClient = new QueryClient();

// Contract ABIs
const DUALNFT_ABI = [
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "mintedCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "erc721BalanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "erc20BalanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "owned", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256[]" }] },
] as const;

const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

// ============================================================================
// Types
// ============================================================================

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

// ============================================================================
// Helper Functions
// ============================================================================

// Decode ERC-404 encoded token ID to actual ID
function decodeTokenId(encodedId: bigint): number {
  if (encodedId >= ID_ENCODING_PREFIX) {
    return Number(encodedId - ID_ENCODING_PREFIX);
  }
  return Number(encodedId);
}

// All 10000 images are now on the server - no need for IPFS fallback
function getImageUrl(tokenId: number): string {
  return `${SERVER_IMAGE_BASE}/${tokenId}.svg`;
}

// Fetch metadata from IPFS
async function fetchMetadata(tokenId: number): Promise<NFTMetadata | null> {
  try {
    const res = await fetch(`${IPFS_GATEWAY}${METADATA_CID}/${tokenId}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================================================
// Components
// ============================================================================

// NFT Card Component
function NFTCard({ tokenId, onClick, size = "medium" }: { tokenId: number; onClick?: () => void; size?: "small" | "medium" | "large" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  const sizes = {
    small: { width: "100px", height: "100px" },
    medium: { width: "160px", height: "160px" },
    large: { width: "100%", maxWidth: "400px", height: "auto", aspectRatio: "1" },
  };

  return (
    <div
      onClick={onClick}
      style={{
        ...sizes[size],
        backgroundColor: "#1a1a1a",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #2a2a2a",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = "scale(1)")}
    >
      {!loaded && !error && (
        <div style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}>
          <div style={{
            width: "24px",
            height: "24px",
            border: "2px solid #2a2a2a",
            borderTopColor: "#2081e2",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      )}
      <img
        src={getImageUrl(tokenId)}
        alt={`DualNFT #${tokenId}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: loaded ? "block" : "none",
        }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
      {error && (
        <div style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#666",
          fontSize: "12px",
        }}>
          #{tokenId}
        </div>
      )}
      <div style={{
        position: "absolute",
        bottom: "8px",
        left: "8px",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: "4px 8px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 600,
      }}>
        #{tokenId}
      </div>
    </div>
  );
}

// NFT Detail Modal
function NFTModal({ tokenId, onClose }: { tokenId: number; onClose: () => void }) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetadata(tokenId).then((data) => {
      setMetadata(data);
      setLoading(false);
    });
  }, [tokenId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#1a1a1a",
          borderRadius: "16px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid #2a2a2a",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div style={{ width: "100%", aspectRatio: "1", backgroundColor: "#0a0a0a" }}>
          <img
            src={getImageUrl(tokenId)}
            alt={`DualNFT #${tokenId}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        {/* Info */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>DualNFT #{tokenId}</h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#888",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>
            Each NFT is bound to 1 DUAL token. Transfer the NFT, and the token moves with it.
          </p>

          {/* Attributes */}
          {loading ? (
            <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>Loading attributes...</div>
          ) : metadata?.attributes ? (
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Attributes</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {metadata.attributes.map((attr, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#0a0a0a",
                      borderRadius: "8px",
                      padding: "12px",
                      border: "1px solid #2a2a2a",
                    }}
                  >
                    <div style={{ color: "#2081e2", fontSize: "11px", textTransform: "uppercase", marginBottom: "4px" }}>
                      {attr.trait_type}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{attr.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>No attributes found</div>
          )}

          {/* Links */}
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <a
              href={`https://opensea.io/assets/ethereum/${DUALNFT_ADDRESS}/${ID_ENCODING_PREFIX + BigInt(tokenId)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#2081e2",
                color: "#fff",
                textAlign: "center",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              View on OpenSea
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main App
// ============================================================================

function MintApp() {
  const { address, isConnected } = useAccount();
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"mint" | "my-nfts" | "gallery">("mint");

  const showToast = useCallback((msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Read contract data
  const { data: mintedCount, refetch: refetchMinted } = useReadContract({
    address: DUALNFT_ADDRESS, abi: DUALNFT_ABI, functionName: "mintedCount",
  });

  const { data: storyBalance } = useReadContract({
    address: STORY_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: STORY_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, DUALNFT_ADDRESS] : undefined, query: { enabled: !!address },
  });

  const { data: userNFTBalance } = useReadContract({
    address: DUALNFT_ADDRESS, abi: DUALNFT_ABI, functionName: "erc721BalanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: userDualBalance } = useReadContract({
    address: DUALNFT_ADDRESS, abi: DUALNFT_ABI, functionName: "erc20BalanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: ownedTokenIds } = useReadContract({
    address: DUALNFT_ADDRESS, abi: DUALNFT_ABI, functionName: "owned",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  // Decode owned token IDs
  const userNFTIds = useMemo(() => {
    if (!ownedTokenIds) return [];
    return (ownedTokenIds as bigint[]).map(decodeTokenId);
  }, [ownedTokenIds]);

  // All minted NFTs (based on mintedCount) - show newest first
  const allMintedIds = useMemo(() => {
    const count = mintedCount ? Number(mintedCount) : 0;
    if (count === 0) return [];
    // Return all minted IDs in reverse order (newest first)
    return Array.from({ length: count }, (_, i) => count - 1 - i);
  }, [mintedCount]);

  // Write
  const { writeContract: approve, data: approveTxHash, isPending: isApproving } = useWriteContract();
  const { writeContract: mint, data: mintTxHash, isPending: isMinting } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintTxHash });

  useEffect(() => {
    if (isApproveSuccess) {
      showToast("Approved! Now minting...", "success");
      refetchAllowance();
      mint({ address: DUALNFT_ADDRESS, abi: DUALNFT_ABI, functionName: "mint" });
    }
  }, [isApproveSuccess, mint, refetchAllowance, showToast]);

  useEffect(() => {
    if (isMintSuccess) {
      showToast("NFT minted successfully!", "success");
      refetchAllowance();
      refetchMinted();
    }
  }, [isMintSuccess, refetchAllowance, refetchMinted, showToast]);

  const handleMint = () => {
    if (!address) return;
    const needsApproval = !allowance || allowance < MINT_PRICE;
    if (needsApproval) {
      showToast("Requesting approval...", "info");
      approve({ address: STORY_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [DUALNFT_ADDRESS, maxUint256] });
    } else {
      showToast("Minting NFT...", "info");
      mint({ address: DUALNFT_ADDRESS, abi: DUALNFT_ABI, functionName: "mint" });
    }
  };

  const isLoading = isApproving || isApproveConfirming || isMinting || isMintConfirming;
  const needsApproval = !allowance || allowance < MINT_PRICE;
  const hasBalance = storyBalance && storyBalance >= MINT_PRICE;
  const minted = mintedCount ? Number(mintedCount) : 0;
  const userNFTs = userNFTBalance ? Number(userNFTBalance) : 0;
  const userDual = userDualBalance ? Number(formatEther(userDualBalance)).toFixed(2) : "0";
  const balance = storyBalance ? Number(formatEther(storyBalance)).toFixed(2) : "0";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#121212", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/favicon.png" alt="8004Mint" style={{ width: "36px", height: "36px", borderRadius: "8px" }} />
          <span style={{ fontSize: "20px", fontWeight: 600 }}>DualNFT</span>
        </div>
        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", padding: "16px 24px", borderBottom: "1px solid #2a2a2a", maxWidth: "1200px", margin: "0 auto" }}>
        {[
          { id: "mint", label: "Mint" },
          { id: "my-nfts", label: `My NFTs (${userNFTs})` },
          { id: "gallery", label: "Gallery" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === tab.id ? "#2081e2" : "transparent",
              color: activeTab === tab.id ? "#fff" : "#888",
              border: "1px solid",
              borderColor: activeTab === tab.id ? "#2081e2" : "#2a2a2a",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        {/* Mint Tab */}
        {activeTab === "mint" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}>
            {/* Left - Preview */}
            <div>
              <div style={{ backgroundColor: "#1a1a1a", borderRadius: "16px", overflow: "hidden", border: "1px solid #2a2a2a" }}>
                <img
                  src={getImageUrl(minted > 0 ? minted - 1 : 0)}
                  alt="DualNFT Preview"
                  style={{ width: "100%", aspectRatio: "1", objectFit: "contain", backgroundColor: "#0a0a0a" }}
                />
              </div>
              {minted > 0 && (
                <p style={{ color: "#888", fontSize: "13px", marginTop: "12px", textAlign: "center" }}>
                  Showing: DualNFT #{minted - 1} (Last Minted)
                </p>
              )}
            </div>

            {/* Right - Info */}
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>DualNFT Collection</h1>
              <p style={{ color: "#8a8a8a", fontSize: "16px", marginBottom: "32px", lineHeight: 1.6 }}>
                ERC-404: Each NFT is bound to 1 $DUAL token.
                Transfer NFT = Transfer token. Trade on DEX, NFT follows.
              </p>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
                {[
                  { value: "10K", label: "Max NFTs" },
                  { value: "1", label: "DUAL / NFT" },
                  { value: minted.toLocaleString(), label: "Minted" },
                ].map((stat, i) => (
                  <div key={i} style={{ backgroundColor: "#1a1a1a", borderRadius: "12px", padding: "20px", textAlign: "center", border: "1px solid #2a2a2a" }}>
                    <div style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>{stat.value}</div>
                    <div style={{ color: "#8a8a8a", fontSize: "14px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Mint Card */}
              <div style={{ backgroundColor: "#1a1a1a", borderRadius: "16px", padding: "24px", border: "1px solid #2a2a2a", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ color: "#8a8a8a", fontSize: "14px" }}>Mint Price</span>
                  <span style={{ fontSize: "28px", fontWeight: 700 }}>10 STORY</span>
                </div>
                <div style={{ color: "#8a8a8a", fontSize: "13px", marginBottom: "20px" }}>
                  2 STORY burned · 8 STORY returned · Net cost: 2 STORY
                </div>

                {isConnected && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #2a2a2a", fontSize: "14px" }}>
                      <span style={{ color: "#8a8a8a" }}>Your STORY</span>
                      <span>{balance} STORY</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #2a2a2a", fontSize: "14px" }}>
                      <span style={{ color: "#8a8a8a" }}>Your NFTs</span>
                      <span>{userNFTs} NFTs</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #2a2a2a", fontSize: "14px" }}>
                      <span style={{ color: "#8a8a8a" }}>Your $DUAL</span>
                      <span style={{ color: "#2081e2" }}>{userDual} DUAL</span>
                    </div>
                  </>
                )}

                <button
                  onClick={handleMint}
                  disabled={!isConnected || !hasBalance || isLoading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "16px",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "12px",
                    cursor: !isConnected || !hasBalance || isLoading ? "not-allowed" : "pointer",
                    marginTop: "20px",
                    backgroundColor: !isConnected || !hasBalance || isLoading ? "#2a2a2a" : "#2081e2",
                    color: !isConnected || !hasBalance || isLoading ? "#666" : "#fff",
                    transition: "all 0.2s",
                  }}
                >
                  {!isConnected ? "Connect Wallet to Mint" :
                   !hasBalance ? "Insufficient STORY Balance" :
                   isApproving || isApproveConfirming ? "Approving..." :
                   isMinting || isMintConfirming ? "Minting..." :
                   needsApproval ? "Approve & Mint" : "Mint NFT"}
                </button>
              </div>

              {/* Links */}
              <div style={{ fontSize: "13px", color: "#8a8a8a" }}>
                <a href="https://opensea.io/collection/0xe38123495d4c8a18675bc0c4f9e4a9f932ac64d8" target="_blank" rel="noopener noreferrer" style={{ color: "#2081e2", textDecoration: "none", marginRight: "16px" }}>
                  View on OpenSea
                </a>
                <a href={`https://etherscan.io/address/${DUALNFT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2081e2", textDecoration: "none" }}>
                  Contract: {DUALNFT_ADDRESS.slice(0, 6)}...{DUALNFT_ADDRESS.slice(-4)}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* My NFTs Tab */}
        {activeTab === "my-nfts" && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>My NFTs</h2>
            {!isConnected ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                <p style={{ marginBottom: "16px" }}>Connect your wallet to view your NFTs</p>
                <ConnectButton />
              </div>
            ) : userNFTIds.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
                <p style={{ marginBottom: "16px" }}>You don't own any DualNFTs yet</p>
                <button
                  onClick={() => setActiveTab("mint")}
                  style={{ padding: "12px 24px", backgroundColor: "#2081e2", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                >
                  Mint Your First NFT
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
                {userNFTIds.map((id) => (
                  <NFTCard key={id} tokenId={id} onClick={() => setSelectedNFT(id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>
              All Minted NFTs ({allMintedIds.length})
            </h2>
            {allMintedIds.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
                {allMintedIds.map((id) => (
                  <NFTCard key={id} tokenId={id} onClick={() => setSelectedNFT(id)} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎨</div>
                <p style={{ fontSize: "16px" }}>No NFTs minted yet. Be the first!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* NFT Detail Modal */}
      {selectedNFT !== null && (
        <NFTModal tokenId={selectedNFT} onClose={() => setSelectedNFT(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          padding: "12px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 500,
          zIndex: 1001,
          backgroundColor: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "#2081e2",
        }}>
          {toast.msg}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          main > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#2081e2", borderRadius: "medium" })}>
          <MintApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
