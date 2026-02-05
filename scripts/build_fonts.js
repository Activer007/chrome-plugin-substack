const fs = require('fs');
const path = require('path');

// Configuration
const FONT_FILE = 'SourceHanSerif.ttf'; // Source font in root
const OUTPUT_FILE = 'libs/vfs_fonts.js';              // Output destination

// Read and convert
try {
  const fontPath = path.resolve(__dirname, '..', FONT_FILE);
  if (!fs.existsSync(fontPath)) {
    console.error(`Font file not found at ${fontPath}`);
    process.exit(1);
  }

  console.log(`Reading font from ${fontPath}...`);
  const fontBuffer = fs.readFileSync(fontPath);
  const base64String = fontBuffer.toString('base64');

  // PDFMake VFS format
  const content = `window.pdfMake = window.pdfMake || {};
window.pdfMake.vfs = {
  "${FONT_FILE}": "${base64String}"
};`;

  // Write output
  const outputPath = path.resolve(__dirname, '..', OUTPUT_FILE);
  fs.writeFileSync(outputPath, content);
  console.log(`Success! Generated ${OUTPUT_FILE} (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}
