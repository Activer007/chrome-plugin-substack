const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../libs/vfs_fonts.js');
const ROOT_DIR = path.join(__dirname, '../');

// 字体文件映射
const FONTS = {
    'Roboto-Regular.ttf': 'Roboto-Regular.ttf',
    'Roboto-Bold.ttf': 'Roboto-Bold.ttf',
    'Roboto-Italic.ttf': 'Roboto-Italic.ttf',
    'Roboto-BoldItalic.ttf': 'Roboto-BoldItalic.ttf',
    'NotoSerifSC.subset.ttf': 'NotoSerifSC.subset.ttf'
};

async function build() {
    console.log('Starting font packaging...');
    const vfs = {};
    let count = 0;

    for (const [vfsName, fileName] of Object.entries(FONTS)) {
        const filePath = path.join(ROOT_DIR, fileName);
        if (fs.existsSync(filePath)) {
            console.log(`Adding ${fileName}...`);
            vfs[vfsName] = fs.readFileSync(filePath).toString('base64');
            count++;
        } else {
            console.warn(`WARNING: File not found: ${fileName}`);
        }
    }

    if (count === 0) {
        console.error('No fonts found! Please check file paths.');
        return;
    }

    const fileContent = `window.pdfMake = window.pdfMake || {}; window.pdfMake.vfs = ${JSON.stringify(vfs)};`;
    fs.writeFileSync(OUTPUT_FILE, fileContent);

    console.log(`\nSuccess! Updated ${OUTPUT_FILE}`);
    console.log(`Total fonts embedded: ${count}`);
}

build();