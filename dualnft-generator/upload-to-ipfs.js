const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Pinata credentials
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzOTBhODYyZC1mOWZkLTRkNzYtYjM0Ni1hODdmMWM1ZGY1NjMiLCJlbWFpbCI6Imhvd2UuZ2poQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIxNDQ1ZDVlOTE4MGY5MDBkMmJkNyIsInNjb3BlZEtleVNlY3JldCI6ImNlZTY4OWYyNGU1YjA1MzhmYjQ2ZTk2NzVhMmUyYzM4ZWJhNTExOGZhZTA3NDhiNDZmNTliMWNkZGQxYTk4NmYiLCJleHAiOjE4MDIyNDg3MTF9.krtQKC8-eNmZw6vzrHfiECLsvcQY1XGeZFBloZzzp0k';

const CONFIG = {
  imagesDir: './output/images',
  metadataDir: './output/metadata',
};

/**
 * Upload a folder to Pinata IPFS
 */
async function uploadFolder(folderPath, folderName) {
  console.log(`\n📁 Uploading ${folderName}...`);
  
  const files = fs.readdirSync(folderPath);
  console.log(`   Files to upload: ${files.length}`);
  
  const formData = new FormData();
  
  // Add all files to form data
  let count = 0;
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, {
      filepath: `${folderName}/${file}`,
    });
    count++;
    if (count % 1000 === 0) {
      process.stdout.write(`\r   Preparing: ${count}/${files.length}`);
    }
  }
  console.log(`\r   Prepared ${count} files for upload`);
  
  // Add metadata
  const pinataMetadata = JSON.stringify({
    name: folderName,
  });
  formData.append('pinataMetadata', pinataMetadata);
  
  const pinataOptions = JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false,
  });
  formData.append('pinataOptions', pinataOptions);
  
  console.log(`   Uploading to Pinata... (this may take a few minutes)`);
  
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          ...formData.getHeaders(),
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          process.stdout.write(`\r   Upload progress: ${percent}%`);
        },
      }
    );
    
    console.log(`\n   ✅ Upload complete!`);
    console.log(`   CID: ${response.data.IpfsHash}`);
    console.log(`   Size: ${(response.data.PinSize / 1024 / 1024).toFixed(2)} MB`);
    
    return response.data.IpfsHash;
  } catch (error) {
    console.error(`\n   ❌ Upload failed:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update metadata files with correct IPFS image URIs
 */
function updateMetadata(imagesCID) {
  console.log(`\n📝 Updating metadata with image CID: ${imagesCID}`);
  
  const files = fs.readdirSync(CONFIG.metadataDir);
  let count = 0;
  
  for (const file of files) {
    const filePath = path.join(CONFIG.metadataDir, file);
    const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update image URI
    const tokenId = path.basename(file, '.json');
    metadata.image = `ipfs://${imagesCID}/${tokenId}.svg`;
    
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    count++;
    
    if (count % 1000 === 0) {
      process.stdout.write(`\r   Updated: ${count}/${files.length}`);
    }
  }
  
  console.log(`\r   ✅ Updated ${count} metadata files`);
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           DualNFT IPFS Uploader (Pinata)                          ║
╚══════════════════════════════════════════════════════════════════╝
  `);
  
  try {
    // Step 1: Upload images
    console.log('Step 1/3: Upload images to IPFS');
    const imagesCID = await uploadFolder(CONFIG.imagesDir, 'dualnft-images');
    
    // Step 2: Update metadata
    console.log('\nStep 2/3: Update metadata with image URIs');
    updateMetadata(imagesCID);
    
    // Step 3: Upload metadata
    console.log('\nStep 3/3: Upload metadata to IPFS');
    const metadataCID = await uploadFolder(CONFIG.metadataDir, 'dualnft-metadata');
    
    // Summary
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    UPLOAD COMPLETE! 🎉                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Images CID:    ${imagesCID}
║   Metadata CID:  ${metadataCID}
║                                                                   ║
║   Image URL:     ipfs://${imagesCID}/0.svg
║   Metadata URL:  ipfs://${metadataCID}/0.json
║                                                                   ║
║   Gateway URLs:                                                   ║
║   https://gateway.pinata.cloud/ipfs/${imagesCID}/0.svg
║   https://gateway.pinata.cloud/ipfs/${metadataCID}/0.json
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝

For DualNFT contract deployment, use:
  Base URI: ipfs://${metadataCID}/
    `);
    
    // Save CIDs to file
    fs.writeFileSync('./ipfs-cids.json', JSON.stringify({
      imagesCID,
      metadataCID,
      timestamp: new Date().toISOString(),
    }, null, 2));
    
    console.log('CIDs saved to ipfs-cids.json');
    
  } catch (error) {
    console.error('Upload failed:', error.message);
    process.exit(1);
  }
}

main();
