# Service ownership verified via .well-known

If a platform only accepts **IPFS or Data URI** as Agent URI and you cannot set `https://8004mint.com/.well-known/agent-registration.json` directly, use one of the approaches below.

---

## Option 1: Use HTTPS .well-known on your own Identity Registry (recommended)

Your deployed **Identity Registry** (agentId=1) accepts any URI. Set agentURI to the HTTPS .well-known URL so your on-chain identity points at your domain.

1. In `.env`:
   - `API_BASE_PUBLIC=https://8004mint.com`
   - `IDENTITY_REGISTRY_ADDRESS` = your Identity Registry address
2. Run:
   ```bash
   npx hardhat run scripts/set-agent-uri.ts --network mainnet
   ```
3. On-chain agentId=1 agentURI becomes `https://8004mint.com/.well-known/agent-registration.json`.  
   Any client that supports HTTPS agentURI (e.g. 8004scan if it indexes your contract) will fetch metadata from that URL and may show "verified via .well-known".

**Note**: The Agent registered on the "platform" (e.g. agentId 14645) uses a different registry and may still be subject to platform URI rules; this option only affects your own Identity Registry.

---

## Option 2: Ask the platform to support HTTPS agentURI

To show **"Service ownership verified via .well-known"** on the platform:

- Contact the platform (e.g. 8004scan GitHub, Discord).
- Ask that **Agent URI** support `https://domain/.well-known/agent-registration.json` for .well-known ownership verification.
- Or ask that for "Service ownership" they also fetch `https://<mcp-domain>/.well-known/agent-registration.json` by MCP Service URL domain; if it declares the same MCP endpoint, treat as verified.

If the platform adopts this, you can keep your current setup and still get verified.

---

## Option 3: Use IPFS for Agent URI (when platform only accepts IPFS/Data)

When the platform only accepts `ipfs://` or `https://ipfs.io/ipfs/`, upload the **same** metadata to IPFS and use that URI as the Agent URI on the platform.  
Some platforms also check .well-known on the MCP domain for "Service ownership" regardless of agentURI type, so you may still get verified.

### Steps

1. **Fetch current metadata**  
   On server or locally:
   ```bash
   curl -s https://8004mint.com/.well-known/agent-registration.json -o agent-registration.json
   ```

2. **Upload to IPFS**  
   - Use [Pinata](https://pinata.cloud), [web3.storage](https://web3.storage), etc.: upload `agent-registration.json`, get CID.  
   - Or with local IPFS: `ipfs add agent-registration.json` → get `Qm...`.

3. **URI to use on the platform**  
   - `ipfs://QmYourCID`  
   - or `https://ipfs.io/ipfs/QmYourCID`

4. **Keep .well-known and IPFS in sync**  
   When you change metadata, update both:
   - Server `/.well-known/agent-registration.json`
   - Re-upload to IPFS and update Agent URI on the platform if you want them to match.

---

## Summary

| Goal | Approach |
|------|----------|
| Your on-chain Agent (agentId=1) uses .well-known | Run **Option 1** `set-agent-uri.ts` |
| Show verified on the platform | **Option 2** ask platform; and/or **Option 3** try IPFS and see if they verify by domain .well-known |

`https://8004mint.com/.well-known/agent-registration.json` already declares the MCP endpoint; if the platform supports HTTPS agentURI or fetches .well-known by domain, you can get "Service ownership verified via .well-known".
