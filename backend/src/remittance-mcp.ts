/**
 * Remittance AI - MCP (Model Context Protocol) Service
 * Next-gen autonomous DeFi agent with real-time blockchain analytics
 * 
 * MCP Spec: https://modelcontextprotocol.io/
 */

import { verifyRemittance, getRemittanceStatus } from "./remittance";

// MCP Server Info
export const mcpServerInfo = {
  name: "remittance-ai",
  version: "1.0.0",
  protocolVersion: "2025-06-18",
  capabilities: {
    tools: {},
    resources: {},
  },
};

// MCP Tools - Blockchain analytics & verification
export const mcpTools = [
  {
    name: "check_remittance_status",
    description: "Query real-time on-chain metrics: total operations executed, remaining capacity, REMIT token circulation stats, and protocol health indicators",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "verify_user_eligibility",
    description: "Run pre-flight verification for wallet address: checks USDC/STORY balances, ERC-20 allowances, and per-wallet operation limits against smart contract state",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Ethereum wallet address (0x...)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_contract_info",
    description: "Retrieve verified contract addresses, ABI references, and deployment metadata for Remittance protocol on Ethereum Mainnet",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// MCP Resources - Live on-chain data feeds
export const mcpResources = [
  {
    uri: "remittance://contracts",
    name: "Smart Contract Registry",
    description: "Verified contract addresses and deployment info on Ethereum Mainnet",
    mimeType: "application/json",
  },
  {
    uri: "remittance://stats",
    name: "Protocol Analytics",
    description: "Real-time protocol metrics: TVL, operation count, token circulation",
    mimeType: "application/json",
  },
];

// Tool execution
export async function executeMcpTool(toolName: string, args: Record<string, unknown>): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (toolName) {
      case "check_remittance_status": {
        const status = await getRemittanceStatus();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              totalOperations: status.totalOperations,
              remainingOperations: status.remainingOperations,
              maxOperations: status.maxOperations,
              progress: `${((status.totalOperations / status.maxOperations) * 100).toFixed(2)}%`,
              remitMinted: status.remitMinted,
              remitRemaining: status.remitRemaining,
              remitTotalSupply: status.remitTotalSupply,
            }, null, 2),
          }],
        };
      }

      case "verify_user_eligibility": {
        const address = args.address as string;
        if (!address) {
          return {
            content: [{ type: "text", text: "Error: address is required" }],
            isError: true,
          };
        }
        const result = await verifyRemittance(address);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              canRemit: result.canRemit,
              reason: result.reason,
              details: result.data,
            }, null, 2),
          }],
        };
      }

      case "get_contract_info": {
        const status = await getRemittanceStatus();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              network: "Ethereum Mainnet (chainId: 1)",
              contracts: {
                remittance: status.contractAddress,
                remitToken: status.remitTokenAddress,
                usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                storyToken: "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e",
              },
              configuration: {
                usdcRequired: "10 USDC",
                storyRequired: "5 STORY",
                usdcReturn: "9 USDC",
                remitReward: "10 REMIT",
                maxPerWallet: 100,
                maxTotalOperations: 20000,
                transferTax: "1% (to tax wallet)",
              },
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
      isError: true,
    };
  }
}

// Resource reading
export async function readMcpResource(uri: string): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  switch (uri) {
    case "remittance://contracts": {
      const status = await getRemittanceStatus();
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            network: "Ethereum Mainnet",
            chainId: 1,
            remittanceContract: status.contractAddress,
            remitToken: status.remitTokenAddress,
            usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            storyToken: "0xdC94E8Ab22d66bcC9b0BDB5E48711Fb12CBea74e",
          }, null, 2),
        }],
      };
    }

    case "remittance://stats": {
      const status = await getRemittanceStatus();
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            timestamp: new Date().toISOString(),
            totalOperations: status.totalOperations,
            remainingOperations: status.remainingOperations,
            remitMinted: status.remitMinted,
            remitRemaining: status.remitRemaining,
          }, null, 2),
        }],
      };
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
