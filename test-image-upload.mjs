import { createReadStream } from 'fs';
import { readFileSync } from 'fs';
import FormData from 'form-data';

// Test image upload endpoint

const BACKEND_URL = 'http://localhost:3000';
const ADMIN_ID = 'd0240c2d-5f70-4331-83ee-466908f177ca';

async function testImageUpload() {
  console.log('🚀 Testing Image Upload Endpoint\n');
  console.log('━'.repeat(50));

  // Test 1: Missing admin ID
  console.log('\n1️⃣  Test: Missing X-Customer-ID header (should fail)');
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/images/upload`, {
      method: 'POST',
      body: new FormData(),
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (err) {
    console.log(`   Error: ${err.message}\n`);
  }

  // Test 2: No file
  console.log('2️⃣  Test: No file uploaded with admin ID (should fail)');
  try {
    const form = new FormData();
    const response = await fetch(`${BACKEND_URL}/api/admin/images/upload`, {
      method: 'POST',
      headers: {
        'X-Customer-ID': ADMIN_ID,
      },
      body: form,
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (err) {
    console.log(`   Error: ${err.message}\n`);
  }

  // Test 3: Create a test image and upload
  console.log('3️⃣  Test: Upload valid image file with admin ID (should succeed)');
  try {
    // Create a minimal valid PNG image (1x1 transparent)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const form = new FormData();
    // Use a simple text file for testing since Node doesn't easily create Blob
    form.append('file', Buffer.from('test image data'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    const response = await fetch(`${BACKEND_URL}/api/admin/images/upload`, {
      method: 'POST',
      headers: {
        'X-Customer-ID': ADMIN_ID,
      },
      body: form,
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      console.log(`   ✅ Success!`);
      console.log(`   Message: ${data.message}`);
      console.log(`   URL: ${data.url}\n`);
    } else {
      console.log(`   Error: ${JSON.stringify(data, null, 2)}\n`);
    }
  } catch (err) {
    console.log(`   Error: ${err.message}\n`);
  }

  console.log('━'.repeat(50));
  console.log('\n✅ Endpoint testing complete\n');
}

testImageUpload();
