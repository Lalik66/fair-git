const fs = require('fs');
const path = require('path');
// Create a 6MB file (larger than the 5MB limit)
const data = Buffer.alloc(6 * 1024 * 1024, 0xFF);
const outputPath = path.join(__dirname, 'test-images', 'large-test.png');
fs.writeFileSync(outputPath, data);
console.log('Created large test file at:', outputPath);
