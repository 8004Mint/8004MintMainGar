const fs = require('fs');
const path = require('path');

/**
 * DualNFT Pixel Art Generator (SVG Version)
 * Generates 10,000 unique pixel art NFTs as SVG files
 * No external dependencies required!
 */

// ============================================
// Configuration
// ============================================

const CONFIG = {
  pixelSize: 24,        // 24x24 pixel grid
  outputSize: 480,      // Final image size
  totalSupply: 10000,
  imagesDir: './output/images',
  metadataDir: './output/metadata',
  name: 'DualNFT',
  description: 'Image-Token Duality NFT - Each NFT bound to 100 NFT tokens',
  externalUrl: 'https://8004mint.com/dualnft',
  baseImageUri: 'ipfs://YOUR_IPFS_CID/images/',
};

// ============================================
// Color Palettes
// ============================================

const PALETTES = {
  backgrounds: [
    '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
    '#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7',
    '#1abc9c', '#16a085', '#2ecc71', '#27ae60', '#3498db',
    '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b', '#f39c12',
    '#f1c40f', '#e67e22', '#d35400', '#ecf0f1', '#192a56',
  ],
  
  bodies: [
    '#3498db', '#2980b9', '#1abc9c', '#16a085', '#27ae60',
    '#e74c3c', '#c0392b', '#e67e22', '#d35400', '#f39c12',
    '#9b59b6', '#8e44ad', '#34495e', '#2c3e50', '#7f8c8d',
    '#ecf0f1', '#bdc3c7', '#95a5a6', '#ffffff', '#f5f5f5',
  ],
  
  accents: [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#ff9f43', '#ee5a24', '#a29bfe',
    '#fd79a8', '#fdcb6e', '#00cec9', '#6c5ce7', '#74b9ff',
  ],
  
  eyes: [
    '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#ff6600', '#6600ff', '#000000',
  ],
};

// ============================================
// Shape Definitions
// ============================================

const BODY_SHAPES = [
  { name: 'Square', type: 'square' },
  { name: 'Circle', type: 'circle' },
  { name: 'Diamond', type: 'diamond' },
  { name: 'Hexagon', type: 'hexagon' },
  { name: 'Triangle', type: 'triangle' },
  { name: 'Star', type: 'star' },
  { name: 'Heart', type: 'heart' },
  { name: 'Ghost', type: 'ghost' },
];

const EYE_PATTERNS = [
  { name: 'Normal', size: 2, spacing: 6 },
  { name: 'Wide', size: 3, spacing: 8 },
  { name: 'Sleepy', size: 1, spacing: 6 },
  { name: 'Big', size: 4, spacing: 8 },
  { name: 'Tiny', size: 1, spacing: 4 },
  { name: 'Cyclops', size: 3, spacing: 0, single: true },
  { name: 'Alien', size: 2, spacing: 10 },
  { name: 'Robot', size: 2, spacing: 6, square: true },
];

const ACCESSORIES = [
  { name: 'None', type: null },
  { name: 'Hat', type: 'hat' },
  { name: 'Crown', type: 'crown' },
  { name: 'Horns', type: 'horns' },
  { name: 'Halo', type: 'halo' },
  { name: 'Antenna', type: 'antenna' },
  { name: 'Mohawk', type: 'mohawk' },
  { name: 'Bow', type: 'bow' },
];

const BG_PATTERNS = [
  { name: 'Solid', type: null },
  { name: 'Grid', type: 'grid' },
  { name: 'Dots', type: 'dots' },
  { name: 'Stripes', type: 'stripes' },
  { name: 'Diagonal', type: 'diagonal' },
  { name: 'Checker', type: 'checker' },
];

// ============================================
// SVG Generation Functions
// ============================================

function generateSVG(traits, tokenId) {
  const size = CONFIG.outputSize;
  const pixelSize = size / CONFIG.pixelSize;
  const cx = CONFIG.pixelSize / 2;
  const cy = CONFIG.pixelSize / 2;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${CONFIG.pixelSize} ${CONFIG.pixelSize}">`;
  svg += `<style>rect{shape-rendering:crispEdges;}</style>`;
  
  // Background
  svg += `<rect width="${CONFIG.pixelSize}" height="${CONFIG.pixelSize}" fill="${traits.bgColor}"/>`;
  
  // Background pattern
  svg += generateBgPattern(traits.bgPattern, traits.accentColor);
  
  // Body
  svg += generateBody(traits.bodyShape, cx, cy, traits.bodyColor);
  
  // Eyes
  svg += generateEyes(traits.eyePattern, cx, cy - 1, traits.eyeColor);
  
  // Accessory
  svg += generateAccessory(traits.accessory, cx, cy, traits.accentColor);
  
  // Token ID watermark (very subtle)
  svg += `<text x="${CONFIG.pixelSize - 1}" y="${CONFIG.pixelSize - 0.5}" font-size="1.5" fill="${traits.bgColor}" opacity="0.3" text-anchor="end">#${tokenId}</text>`;
  
  svg += '</svg>';
  return svg;
}

function generateBgPattern(pattern, color) {
  let svg = '';
  const opacity = '0.15';
  
  switch (pattern.type) {
    case 'grid':
      for (let i = 0; i < CONFIG.pixelSize; i += 4) {
        svg += `<rect x="${i}" y="0" width="0.5" height="${CONFIG.pixelSize}" fill="${color}" opacity="${opacity}"/>`;
        svg += `<rect x="0" y="${i}" width="${CONFIG.pixelSize}" height="0.5" fill="${color}" opacity="${opacity}"/>`;
      }
      break;
    case 'dots':
      for (let x = 2; x < CONFIG.pixelSize; x += 4) {
        for (let y = 2; y < CONFIG.pixelSize; y += 4) {
          svg += `<circle cx="${x}" cy="${y}" r="0.5" fill="${color}" opacity="0.2"/>`;
        }
      }
      break;
    case 'stripes':
      for (let i = 0; i < CONFIG.pixelSize; i += 3) {
        svg += `<rect x="${i}" y="0" width="1" height="${CONFIG.pixelSize}" fill="${color}" opacity="${opacity}"/>`;
      }
      break;
    case 'diagonal':
      for (let i = -CONFIG.pixelSize; i < CONFIG.pixelSize * 2; i += 3) {
        svg += `<line x1="${i}" y1="0" x2="${i + CONFIG.pixelSize}" y2="${CONFIG.pixelSize}" stroke="${color}" stroke-width="0.5" opacity="${opacity}"/>`;
      }
      break;
    case 'checker':
      for (let x = 0; x < CONFIG.pixelSize; x += 4) {
        for (let y = 0; y < CONFIG.pixelSize; y += 4) {
          if ((x + y) % 8 === 0) {
            svg += `<rect x="${x}" y="${y}" width="2" height="2" fill="${color}" opacity="${opacity}"/>`;
          }
        }
      }
      break;
  }
  return svg;
}

function generateBody(shape, cx, cy, color) {
  let svg = '';
  const darkColor = darkenColor(color, 20);
  
  switch (shape.type) {
    case 'square':
      svg += `<rect x="${cx - 5}" y="${cy - 5}" width="10" height="10" fill="${color}"/>`;
      svg += `<rect x="${cx - 5}" y="${cy - 5}" width="10" height="1" fill="${darkColor}"/>`;
      svg += `<rect x="${cx - 5}" y="${cy - 5}" width="1" height="10" fill="${darkColor}"/>`;
      break;
    case 'circle':
      svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${darkColor}" stroke-width="0.5"/>`;
      break;
    case 'diamond':
      svg += `<polygon points="${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}" fill="${color}"/>`;
      svg += `<polygon points="${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}" fill="none" stroke="${darkColor}" stroke-width="0.5"/>`;
      break;
    case 'hexagon':
      const hex = generateHexagonPoints(cx, cy, 5);
      svg += `<polygon points="${hex}" fill="${color}"/>`;
      svg += `<polygon points="${hex}" fill="none" stroke="${darkColor}" stroke-width="0.5"/>`;
      break;
    case 'triangle':
      svg += `<polygon points="${cx},${cy - 6} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}" fill="${color}"/>`;
      svg += `<polygon points="${cx},${cy - 6} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}" fill="none" stroke="${darkColor}" stroke-width="0.5"/>`;
      break;
    case 'star':
      const star = generateStarPoints(cx, cy, 6, 3);
      svg += `<polygon points="${star}" fill="${color}"/>`;
      svg += `<polygon points="${star}" fill="none" stroke="${darkColor}" stroke-width="0.5"/>`;
      break;
    case 'heart':
      svg += `<path d="M${cx} ${cy + 4} C${cx - 6} ${cy} ${cx - 6} ${cy - 4} ${cx} ${cy - 2} C${cx + 6} ${cy - 4} ${cx + 6} ${cy} ${cx} ${cy + 4}" fill="${color}"/>`;
      break;
    case 'ghost':
      svg += `<path d="M${cx - 5} ${cy + 5} L${cx - 5} ${cy - 2} A5 5 0 0 1 ${cx + 5} ${cy - 2} L${cx + 5} ${cy + 5} L${cx + 3} ${cy + 3} L${cx + 1} ${cy + 5} L${cx - 1} ${cy + 3} L${cx - 3} ${cy + 5} Z" fill="${color}"/>`;
      break;
  }
  return svg;
}

function generateHexagonPoints(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

function generateStarPoints(cx, cy, outerR, innerR) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

function generateEyes(eyePattern, cx, cy, color) {
  let svg = '';
  
  if (eyePattern.single) {
    // Cyclops
    if (eyePattern.square) {
      svg += `<rect x="${cx - eyePattern.size / 2}" y="${cy - eyePattern.size / 2}" width="${eyePattern.size}" height="${eyePattern.size}" fill="${color}"/>`;
    } else {
      svg += `<circle cx="${cx}" cy="${cy}" r="${eyePattern.size / 2}" fill="${color}"/>`;
    }
    // Pupil
    svg += `<circle cx="${cx}" cy="${cy}" r="${eyePattern.size / 4}" fill="#000"/>`;
  } else {
    // Two eyes
    const leftX = cx - eyePattern.spacing / 2;
    const rightX = cx + eyePattern.spacing / 2;
    
    if (eyePattern.square) {
      svg += `<rect x="${leftX - eyePattern.size / 2}" y="${cy - eyePattern.size / 2}" width="${eyePattern.size}" height="${eyePattern.size}" fill="${color}"/>`;
      svg += `<rect x="${rightX - eyePattern.size / 2}" y="${cy - eyePattern.size / 2}" width="${eyePattern.size}" height="${eyePattern.size}" fill="${color}"/>`;
    } else {
      svg += `<circle cx="${leftX}" cy="${cy}" r="${eyePattern.size / 2}" fill="${color}"/>`;
      svg += `<circle cx="${rightX}" cy="${cy}" r="${eyePattern.size / 2}" fill="${color}"/>`;
    }
    // Pupils
    svg += `<circle cx="${leftX}" cy="${cy}" r="${Math.max(0.3, eyePattern.size / 4)}" fill="#000"/>`;
    svg += `<circle cx="${rightX}" cy="${cy}" r="${Math.max(0.3, eyePattern.size / 4)}" fill="#000"/>`;
  }
  
  return svg;
}

function generateAccessory(accessory, cx, cy, color) {
  let svg = '';
  
  switch (accessory.type) {
    case 'hat':
      svg += `<rect x="${cx - 6}" y="${cy - 8}" width="12" height="1" fill="${color}"/>`;
      svg += `<rect x="${cx - 4}" y="${cy - 12}" width="8" height="4" fill="${color}"/>`;
      break;
    case 'crown':
      svg += `<rect x="${cx - 5}" y="${cy - 8}" width="10" height="2" fill="${color}"/>`;
      svg += `<polygon points="${cx - 4},${cy - 8} ${cx - 4},${cy - 11} ${cx - 2},${cy - 9} ${cx},${cy - 12} ${cx + 2},${cy - 9} ${cx + 4},${cy - 11} ${cx + 4},${cy - 8}" fill="${color}"/>`;
      break;
    case 'horns':
      svg += `<polygon points="${cx - 6},${cy - 5} ${cx - 9},${cy - 10} ${cx - 5},${cy - 7}" fill="${color}"/>`;
      svg += `<polygon points="${cx + 6},${cy - 5} ${cx + 9},${cy - 10} ${cx + 5},${cy - 7}" fill="${color}"/>`;
      break;
    case 'halo':
      svg += `<ellipse cx="${cx}" cy="${cy - 9}" rx="5" ry="1.5" fill="none" stroke="${color}" stroke-width="1"/>`;
      break;
    case 'antenna':
      svg += `<line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy - 11}" stroke="${color}" stroke-width="0.8"/>`;
      svg += `<circle cx="${cx}" cy="${cy - 12}" r="1.5" fill="${color}"/>`;
      break;
    case 'mohawk':
      for (let i = 0; i < 5; i++) {
        const h = 3 + Math.sin(i * 0.8) * 2;
        svg += `<rect x="${cx - 2 + i}" y="${cy - 6 - h}" width="1" height="${h}" fill="${color}"/>`;
      }
      break;
    case 'bow':
      svg += `<ellipse cx="${cx - 3}" cy="${cy - 7}" rx="2" ry="1.5" fill="${color}"/>`;
      svg += `<ellipse cx="${cx + 3}" cy="${cy - 7}" rx="2" ry="1.5" fill="${color}"/>`;
      svg += `<circle cx="${cx}" cy="${cy - 7}" r="1" fill="${color}"/>`;
      break;
  }
  
  return svg;
}

// ============================================
// Utility Functions
// ============================================

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function getColorName(hex) {
  const names = {
    '#1a1a2e': 'Midnight', '#16213e': 'Navy', '#0f3460': 'Deep Blue', '#533483': 'Purple Night',
    '#e94560': 'Coral', '#2c3e50': 'Charcoal', '#34495e': 'Storm', '#7f8c8d': 'Concrete',
    '#95a5a6': 'Silver', '#bdc3c7': 'Cloud', '#1abc9c': 'Turquoise', '#16a085': 'Green Sea',
    '#2ecc71': 'Emerald', '#27ae60': 'Nephritis', '#3498db': 'River Blue', '#9b59b6': 'Amethyst',
    '#8e44ad': 'Wisteria', '#e74c3c': 'Alizarin', '#c0392b': 'Pomegranate', '#f39c12': 'Orange',
    '#f1c40f': 'Sunflower', '#e67e22': 'Carrot', '#d35400': 'Pumpkin', '#ecf0f1': 'Clouds',
    '#ffffff': 'White', '#ff0000': 'Red', '#00ff00': 'Lime', '#0000ff': 'Blue',
    '#ffff00': 'Yellow', '#ff00ff': 'Magenta', '#00ffff': 'Cyan', '#ff6600': 'Tangerine',
    '#6600ff': 'Violet', '#000000': 'Black', '#f5f5f5': 'Snow', '#192a56': 'Dark Navy',
    '#ff6b6b': 'Light Coral', '#feca57': 'Mustard', '#48dbfb': 'Sky', '#ff9ff3': 'Pink',
    '#54a0ff': 'Blue Sky', '#5f27cd': 'Deep Purple', '#00d2d3': 'Teal', '#ff9f43': 'Melon',
    '#ee5a24': 'Blazing', '#a29bfe': 'Lavender', '#fd79a8': 'Blush', '#fdcb6e': 'Golden',
    '#00cec9': 'Robin', '#6c5ce7': 'Indigo', '#74b9ff': 'Light Blue',
  };
  return names[hex.toLowerCase()] || hex;
}

// ============================================
// Main Generation
// ============================================

function generateNFT(tokenId) {
  const rng = seededRandom(tokenId * 12345 + 67890);
  
  const traits = {
    bgColor: PALETTES.backgrounds[Math.floor(rng() * PALETTES.backgrounds.length)],
    bodyColor: PALETTES.bodies[Math.floor(rng() * PALETTES.bodies.length)],
    accentColor: PALETTES.accents[Math.floor(rng() * PALETTES.accents.length)],
    eyeColor: PALETTES.eyes[Math.floor(rng() * PALETTES.eyes.length)],
    bodyShape: BODY_SHAPES[Math.floor(rng() * BODY_SHAPES.length)],
    eyePattern: EYE_PATTERNS[Math.floor(rng() * EYE_PATTERNS.length)],
    accessory: ACCESSORIES[Math.floor(rng() * ACCESSORIES.length)],
    bgPattern: BG_PATTERNS[Math.floor(rng() * BG_PATTERNS.length)],
  };
  
  const svg = generateSVG(traits, tokenId);
  
  const attributes = [
    { trait_type: 'Background', value: getColorName(traits.bgColor) },
    { trait_type: 'Pattern', value: traits.bgPattern.name },
    { trait_type: 'Body', value: traits.bodyShape.name },
    { trait_type: 'Body Color', value: getColorName(traits.bodyColor) },
    { trait_type: 'Eyes', value: traits.eyePattern.name },
    { trait_type: 'Eye Color', value: getColorName(traits.eyeColor) },
    { trait_type: 'Accessory', value: traits.accessory.name },
    { trait_type: 'Accent', value: getColorName(traits.accentColor) },
    { trait_type: 'Bound Tokens', value: '100' },
  ];
  
  return { svg, attributes, traits };
}

async function main() {
  const args = process.argv.slice(2);
  let count = CONFIG.totalSupply;
  let startId = 0;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sample') count = parseInt(args[i + 1]) || 10;
    if (args[i] === '--count') count = parseInt(args[i + 1]) || CONFIG.totalSupply;
    if (args[i] === '--start') startId = parseInt(args[i + 1]) || 0;
  }
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  DualNFT Generator (SVG)                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Generating ${count.toString().padStart(5)} pixel art NFTs (SVG format)               ║
║  Output: ${CONFIG.imagesDir}                                    ║
╚══════════════════════════════════════════════════════════════════╝
  `);
  
  // Create directories
  fs.mkdirSync(CONFIG.imagesDir, { recursive: true });
  fs.mkdirSync(CONFIG.metadataDir, { recursive: true });
  
  const usedCombos = new Set();
  
  for (let i = 0; i < count; i++) {
    const tokenId = startId + i;
    const { svg, attributes, traits } = generateNFT(tokenId);
    
    // Save SVG
    fs.writeFileSync(path.join(CONFIG.imagesDir, `${tokenId}.svg`), svg);
    
    // Save metadata
    const metadata = {
      name: `${CONFIG.name} #${tokenId}`,
      description: CONFIG.description,
      image: `${CONFIG.baseImageUri}${tokenId}.svg`,
      external_url: `${CONFIG.externalUrl}/${tokenId}`,
      attributes,
    };
    fs.writeFileSync(path.join(CONFIG.metadataDir, `${tokenId}.json`), JSON.stringify(metadata, null, 2));
    
    if ((i + 1) % 100 === 0 || i === count - 1) {
      process.stdout.write(`\r  Progress: ${i + 1}/${count} (${((i + 1) / count * 100).toFixed(1)}%)`);
    }
  }
  
  console.log(`\n
╔══════════════════════════════════════════════════════════════════╗
║                    Generation Complete!                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Images:   ${CONFIG.imagesDir}/*.svg                            ║
║  Metadata: ${CONFIG.metadataDir}/*.json                       ║
║  Total:    ${count} NFTs                                            ║
╚══════════════════════════════════════════════════════════════════╝

Next steps:
1. Upload images to IPFS
2. Update baseImageUri in this script
3. Re-generate metadata
4. Upload metadata to IPFS
5. Deploy DualNFT contract
  `);
}

main().catch(console.error);
