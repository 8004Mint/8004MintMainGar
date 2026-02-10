# DualNFT Pixel Art Generator

Generate 10,000 unique pixel art NFTs for the DualNFT collection.

## Features

- **24x24 pixel grid** upscaled to 480x480 for display
- **8 body shapes**: Square, Circle, Diamond, Cross, Heart, Star, Ghost, Skull
- **8 eye patterns**: Normal, Wide, Sleepy, Angry, Surprised, Cyclops, X Eyes, Heart Eyes
- **8 accessories**: None, Hat, Crown, Horns, Halo, Antenna, Bow, Headphones
- **6 background patterns**: Solid, Grid, Dots, Stripes, Checker, Diagonal
- **Multiple color palettes**: 25 backgrounds, 20 body colors, 15 accents, 10 eye colors

## Rarity Calculation

Total possible combinations:
```
25 × 20 × 10 × 8 × 8 × 8 × 6 × 15 = 230,400,000 combinations
```

With 10,000 NFTs, each is extremely rare (~0.004% of possible combinations).

## Quick Start

```bash
# Install dependencies
npm install

# Generate 10 samples for preview
npm run generate:sample

# Generate all 10,000 NFTs
npm run generate:all
```

## Output

```
output/
├── images/
│   ├── 0.png
│   ├── 1.png
│   └── ...
└── metadata/
    ├── 0.json
    ├── 1.json
    └── ...
```

## Metadata Format

```json
{
  "name": "DualNFT #0",
  "description": "Image-Token Duality NFT - Each NFT bound to 100 NFT tokens",
  "image": "ipfs://YOUR_IPFS_CID/images/0.png",
  "external_url": "https://8004mint.com/dualnft/0",
  "attributes": [
    { "trait_type": "Background", "value": "Midnight" },
    { "trait_type": "Background Pattern", "value": "Grid" },
    { "trait_type": "Body", "value": "Circle" },
    { "trait_type": "Body Color", "value": "Turquoise" },
    { "trait_type": "Eyes", "value": "Normal" },
    { "trait_type": "Eye Color", "value": "White" },
    { "trait_type": "Accessory", "value": "Crown" },
    { "trait_type": "Accent Color", "value": "Golden" },
    { "trait_type": "Bound Tokens", "value": "100" }
  ]
}
```

## Customization

Edit `generate.js` to modify:

```javascript
const CONFIG = {
  pixelSize: 24,        // Pixel grid size
  scale: 20,            // Upscale factor
  outputSize: 480,      // Final image size
  totalSupply: 10000,   // Max NFTs
  baseImageUri: 'ipfs://YOUR_CID/images/',
};
```

## Deployment Steps

1. **Generate images**
   ```bash
   npm run generate:all
   ```

2. **Upload to IPFS**
   - Use [Pinata](https://pinata.cloud) or [NFT.Storage](https://nft.storage)
   - Upload `output/images/` folder
   - Get CID (e.g., `QmXxx...`)

3. **Update metadata**
   - Edit `CONFIG.baseImageUri` in `generate.js`
   - Re-run `npm run generate:all`

4. **Upload metadata to IPFS**
   - Upload `output/metadata/` folder
   - Get CID for metadata

5. **Deploy contract**
   ```bash
   cd ..
   npx hardhat run scripts/deploy-dualnft.ts --network mainnet
   ```

## Sample Output

```
┌────────────────────┐
│  ████████████████  │  Body: Circle
│  ██            ██  │  Eyes: Normal (White)
│  ██  ██    ██  ██  │  Accessory: Crown
│  ██            ██  │  Background: Grid pattern
│  ██████████████████│  
│      ▲▲▲▲▲▲        │  Bound Tokens: 100
└────────────────────┘
```

## License

MIT
