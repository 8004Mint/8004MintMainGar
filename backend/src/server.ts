require("dotenv").config();
import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { signClaim, ClaimPayload } from "./sign";
import { scoreEssay, checkOpenAIConnection } from "./scoring/score";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "11155111", 10);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const TOKEN_NAME = process.env.TOKEN_NAME || "Story Token";

const IDENTITY_REGISTRY_ADDRESS = process.env.IDENTITY_REGISTRY_ADDRESS || "";
const AGENT_ID = process.env.AGENT_ID || "1";
const AGENT_REGISTRY = process.env.AGENT_REGISTRY || "";
const API_BASE_PUBLIC = process.env.API_BASE_PUBLIC || "https://8004mint.com";

// Optional: recipient for 10 USDC payment (Ethereum mainnet) before claim; if unset, no payment check
const PAYMENT_RECIPIENT = process.env.PAYMENT_RECIPIENT || "";
const RPC_URL = process.env.RPC_URL || "";
// Ethereum mainnet USDC
const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_DECIMALS = 6;
const PAYMENT_AMOUNT_USDC = 10n * 10n ** BigInt(USDC_DECIMALS); // 10 USDC

// In-memory nonce (production should use Redis/DB)
const usedNonces = new Set<string>();

function nextNonce(recipient: string): bigint {
  let n = 0;
  while (usedNonces.has(`${recipient}:${n}`)) n++;
  usedNonces.add(`${recipient}:${n}`);
  return BigInt(n);
}

/**
 * POST /score
 * Body: { story: string } or { essay: string } (story preferred)
 * Returns: { score, rationale, flags } or 400
 */
app.post("/score", async (req: express.Request, res: express.Response) => {
  const text = req.body?.story ?? req.body?.essay;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing or invalid story" });
  }
  try {
    const result = await scoreEssay(text);
    return res.json(result);
  } catch (e: unknown) {
    console.error("score error", e);
    return res.status(500).json({ error: "Scoring failed" });
  }
});

/**
 * GET /openai-check — verify OpenAI/ChatGPT API connectivity.
 */
app.get("/openai-check", async (_req: express.Request, res: express.Response) => {
  const result = await checkOpenAIConnection();
  if (result.ok) return res.json({ ok: true });
  return res.status(503).json({ ok: false, error: result.error });
});

/**
 * Check whether recipient has transferred at least 10 USDC to PAYMENT_RECIPIENT (on-chain Transfer events).
 */
async function hasPaid10Usdc(recipient: string): Promise<boolean> {
  if (!PAYMENT_RECIPIENT || !RPC_URL) return true;
  const payTo = ethers.getAddress(PAYMENT_RECIPIENT);
  const from = ethers.getAddress(recipient);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const usdc = new ethers.Contract(
    USDC_ADDRESS,
    ["event Transfer(address indexed from, address indexed to, uint256 value)"],
    provider
  );
  const filter = usdc.filters.Transfer(from, payTo);
  const blockNumber = await provider.getBlockNumber();
  const fromBlock = Math.max(0, blockNumber - 50000); // ~1 week mainnet
  const events = await usdc.queryFilter(filter, fromBlock, "latest");
  let total = 0n;
  for (const e of events) {
    const value = (e as ethers.EventLog).args[2] as bigint;
    total += value;
  }
  return total >= PAYMENT_AMOUNT_USDC;
}

/**
 * POST /sign-claim
 * Body: { recipient, textHash, score }
 * Requires score >= 60; if PAYMENT_RECIPIENT set, verifies 10 USDC on-chain; then signs.
 */
app.post("/sign-claim", async (req: express.Request, res: express.Response) => {
  const { recipient, textHash, score } = req.body;
  if (!ISSUER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
    return res.status(500).json({ error: "Server not configured" });
  }
  if (!recipient || !textHash || typeof score !== "number") {
    return res.status(400).json({ error: "Missing recipient, textHash, or score" });
  }
  if (score < 60) {
    return res.status(400).json({ error: "Score too low to claim" });
  }

  const recipientAddress = ethers.getAddress(recipient);

  if (PAYMENT_RECIPIENT) {
    try {
      const paid = await hasPaid10Usdc(recipientAddress);
      if (!paid) {
        return res.status(402).json({
          error: "Payment required",
          payTo: PAYMENT_RECIPIENT,
          amount: "10",
          currency: "USDC",
          message: "Send 10 USDC to the address above, then retry Claim.",
        });
      }
    } catch (e: unknown) {
      console.error("payment check error", e);
      return res.status(500).json({ error: "Payment verification failed" });
    }
  }

  const nonce = nextNonce(recipientAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 15); // 15 min

  const payload: ClaimPayload = {
    recipient: recipientAddress,
    textHash,
    score: BigInt(score),
    nonce,
    deadline,
    campaignId: 1n,
  };

  try {
    const signature = await signClaim(
      ISSUER_PRIVATE_KEY,
      CHAIN_ID,
      CONTRACT_ADDRESS,
      TOKEN_NAME,
      payload
    );
    return res.json({
      signature,
      payload: {
        textHash: payload.textHash,
        score: payload.score.toString(),
        nonce: payload.nonce.toString(),
        deadline: payload.deadline.toString(),
        campaignId: payload.campaignId.toString(),
      },
    });
  } catch (e: unknown) {
    console.error("sign-claim error", e);
    return res.status(500).json({ error: "Signing failed" });
  }
});

/**
 * GET /funding-progress
 * Returns current funding progress: USDC received by PAYMENT_RECIPIENT
 * Total target: 100,000 USDC
 * - LP Reserve (fixed): 40% = 40,000 USDC
 * - Mintable: 60% = 60,000 USDC (6,000 mints × 10 USDC)
 * Progress starts at 40% and adds actual received USDC on top
 */
app.get("/funding-progress", async (_req: express.Request, res: express.Response) => {
  const lpReserveUsdc = 40000; // 40% fixed LP reserve
  const mintableUsdc = 60000;  // 60% mintable target
  const totalTargetUsdc = 100000; // 100% total

  if (!PAYMENT_RECIPIENT || !RPC_URL) {
    return res.json({
      received: "0",
      lpReserve: lpReserveUsdc.toString(),
      mintableTarget: mintableUsdc.toString(),
      totalTarget: totalTargetUsdc.toString(),
      percentage: 40, // Start at 40%
      mints: 0,
      maxMints: 6000,
    });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const usdc = new ethers.Contract(
      USDC_ADDRESS,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );
    const balance: bigint = await usdc.balanceOf(PAYMENT_RECIPIENT);
    const receivedUsdc = Number(balance) / 10 ** USDC_DECIMALS;
    const mints = Math.floor(receivedUsdc / 10); // Each mint costs 10 USDC
    
    // Progress = 40% (LP reserve) + (received / total) * 100
    // But cap mintable portion at 60%
    const mintablePercentage = Math.min(60, (receivedUsdc / totalTargetUsdc) * 100);
    const percentage = 40 + mintablePercentage;

    return res.json({
      received: receivedUsdc.toFixed(2),
      lpReserve: lpReserveUsdc.toString(),
      mintableTarget: mintableUsdc.toString(),
      totalTarget: totalTargetUsdc.toString(),
      percentage: Math.round(percentage * 100) / 100,
      mints,
      maxMints: 6000,
    });
  } catch (e: unknown) {
    console.error("funding-progress error", e);
    return res.status(500).json({ error: "Failed to fetch funding progress" });
  }
});

/**
 * GET /.well-known/agent-registration.json
 * ERC-8004 Agent registration; Identity Registry agentURI should point here.
 */
const agentRegistrationJson = () => ({
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Story Scoring Agent",
  description: "Scores user stories (0-100). Score ≥60 grants one claim of 100 Story tokens. Pay 10 USDC (Ethereum) to claim. ERC-8004 compliant.",
  image: `${API_BASE_PUBLIC}/story-logo.png`,
  services: [
    { name: "web", endpoint: API_BASE_PUBLIC },
    { name: "score", endpoint: `${API_BASE_PUBLIC}/score`, version: "1" },
    { name: "sign-claim", endpoint: `${API_BASE_PUBLIC}/sign-claim`, version: "1" },
    { name: "MCP", endpoint: `${API_BASE_PUBLIC}/story/mcp`, version: "2025-06-18" },
  ],
  x402Support: false,
  active: true,
  updatedAt: Math.floor(Date.now() / 1000),
  registrations: [{ agentId: parseInt(AGENT_ID, 10), agentRegistry: AGENT_REGISTRY }],
  supportedTrust: ["reputation", "crypto-economic"],
});

app.get("/.well-known/agent-registration.json", (req: express.Request, res: express.Response) => {
  if (!AGENT_REGISTRY || !AGENT_ID) {
    return res.status(503).json({ error: "ERC-8004 agent not configured" });
  }
  res.setHeader("Content-Type", "application/json");
  res.json(agentRegistrationJson());
});

app.get("/agent-registration.json", (req: express.Request, res: express.Response) => {
  if (!AGENT_REGISTRY || !AGENT_ID) {
    return res.status(503).json({ error: "ERC-8004 agent not configured" });
  }
  res.setHeader("Content-Type", "application/json");
  res.json(agentRegistrationJson());
});

// ============ Remittance Agent API ============
import { verifyRemittance, getRemittanceStatus } from "./remittance";
import { mcpServerInfo, mcpTools, mcpResources, executeMcpTool, readMcpResource } from "./remittance-mcp";

const REMITTANCE_AGENT_ID = process.env.REMITTANCE_AGENT_ID || "22721";
const REMITTANCE_AGENT_REGISTRY = process.env.REMITTANCE_AGENT_REGISTRY || "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

/**
 * POST /remittance/verify
 * Verify if user can perform remittance operation
 * Body: { address: string }
 */
app.post("/remittance/verify", async (req: express.Request, res: express.Response) => {
  const { address } = req.body;
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }
  
  const result = await verifyRemittance(address);
  return res.json(result);
});

/**
 * GET /remittance/status
 * Get current remittance progress
 */
app.get("/remittance/status", async (_req: express.Request, res: express.Response) => {
  const status = await getRemittanceStatus();
  return res.json(status);
});

// ============ Remittance MCP Endpoints ============

/**
 * GET /remittance/mcp
 * MCP Server info endpoint
 */
app.get("/remittance/mcp", (_req: express.Request, res: express.Response) => {
  res.json(mcpServerInfo);
});

/**
 * GET /remittance/mcp/tools
 * List available MCP tools
 */
app.get("/remittance/mcp/tools", (_req: express.Request, res: express.Response) => {
  res.json({ tools: mcpTools });
});

/**
 * POST /remittance/mcp/tools/:toolName
 * Execute an MCP tool
 */
app.post("/remittance/mcp/tools/:toolName", async (req: express.Request, res: express.Response) => {
  const toolName = req.params.toolName as string;
  const args = req.body.arguments || {};
  const result = await executeMcpTool(toolName, args);
  res.json(result);
});

/**
 * GET /remittance/mcp/resources
 * List available MCP resources
 */
app.get("/remittance/mcp/resources", (_req: express.Request, res: express.Response) => {
  res.json({ resources: mcpResources });
});

/**
 * POST /remittance/mcp/resources/read
 * Read an MCP resource
 */
app.post("/remittance/mcp/resources/read", async (req: express.Request, res: express.Response) => {
  const { uri } = req.body;
  if (!uri) {
    return res.status(400).json({ error: "Missing uri" });
  }
  try {
    const result = await readMcpResource(uri);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Resource not found" });
  }
});

/**
 * GET /.well-known/remittance-agent.json
 * ERC-8004 Agent registration for Remittance Agent
 * Note: This agent monitors remittance operations, no signature required for contract interaction
 */
const remittanceAgentJson = () => ({
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Remittance",
  description: "The first ERC8004 agent to verify payment stability, Deployed by @8004mint",
  image: `${API_BASE_PUBLIC}/remit-logo.png`,
  services: [
    { name: "web", endpoint: API_BASE_PUBLIC },
    { 
      name: "MCP", 
      endpoint: `${API_BASE_PUBLIC}/remittance/mcp`, 
      version: "2025-06-18",
      mcpTools: ["check_remittance_status", "verify_user_eligibility", "get_contract_info"],
      capabilities: ["tools", "resources"],
    },
    {
      name: "A2A",
      endpoint: `${API_BASE_PUBLIC}/.well-known/agent-card.json`,
      version: "0.3.0",
      a2aSkills: ["analytical_skills/data_analysis/blockchain_analysis"],
    },
    { name: "verify", endpoint: `${API_BASE_PUBLIC}/remittance/verify`, version: "1", description: "Check if user can perform remittance" },
    { name: "status", endpoint: `${API_BASE_PUBLIC}/remittance/status`, version: "1", description: "Get remittance progress stats" },
  ],
  x402Support: false,
  active: true,
  updatedAt: Math.floor(Date.now() / 1000),
  registrations: [
    { agentId: parseInt(REMITTANCE_AGENT_ID, 10), agentRegistry: REMITTANCE_AGENT_REGISTRY }
  ],
  supportedTrust: ["reputation"],
});

app.get("/.well-known/remittance-agent.json", (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(remittanceAgentJson());
});

app.get("/remittance-agent.json", (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(remittanceAgentJson());
});

/**
 * GET /.well-known/agent-card.json (A2A Protocol)
 * A2A Agent Card for Remittance Agent
 * Spec: https://a2a.to/
 */
app.get("/.well-known/agent-card.json", (_req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    name: "Remittance",
    description: "The first ERC8004 agent to verify payment stability, Deployed by @8004mint",
    url: API_BASE_PUBLIC,
    provider: {
      organization: "8004Mint",
      url: API_BASE_PUBLIC,
    },
    version: "1.0.0",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    authentication: {
      schemes: [],
    },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [
      {
        id: "check_status",
        name: "Check Remittance Status",
        description: "Get current remittance progress and REMIT token statistics",
        tags: ["defi", "token", "status"],
        examples: [
          "What is the current remittance progress?",
          "How many REMIT tokens have been minted?",
        ],
      },
      {
        id: "verify_eligibility",
        name: "Verify User Eligibility",
        description: "Check if a wallet can perform remittance operation",
        tags: ["defi", "verification", "wallet"],
        examples: [
          "Can wallet 0x123... perform remittance?",
          "Check eligibility for 0xABC...",
        ],
      },
    ],
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log("Backend running on port", port);
});
