import { ethers } from "ethers";

const EIP712_DOMAIN = (chainId: number, verifyingContract: string, name: string) => ({
  name,
  version: "1",
  chainId,
  verifyingContract,
});

const CLAIM_TYPES = {
  Claim: [
    { name: "recipient", type: "address" },
    { name: "textHash", type: "bytes32" },
    { name: "score", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "campaignId", type: "uint256" },
  ],
};

export interface ClaimPayload {
  recipient: string;
  textHash: string;
  score: bigint;
  nonce: bigint;
  deadline: bigint;
  campaignId: bigint;
}

/**
 * Sign EIP-712 Claim with issuer private key for contract claim() verification.
 */
export async function signClaim(
  issuerPrivateKey: string,
  chainId: number,
  verifyingContract: string,
  tokenName: string,
  payload: ClaimPayload
): Promise<string> {
  const wallet = new ethers.Wallet(issuerPrivateKey);
  const domain = EIP712_DOMAIN(chainId, verifyingContract, tokenName);
  const sig = await wallet.signTypedData(domain, CLAIM_TYPES, {
    recipient: payload.recipient,
    textHash: payload.textHash,
    score: payload.score,
    nonce: payload.nonce,
    deadline: payload.deadline,
    campaignId: payload.campaignId,
  });
  return sig;
}
