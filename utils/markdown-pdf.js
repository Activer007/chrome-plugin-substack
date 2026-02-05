/**
 * Converts structured article data to PDFMake document definition
 * @param {Object} articleData - The article data extracted from the page
 * @param {Map} imageMap - Map of image URLs to Base64 strings
 * @param {Object} options - PDF Generation options
 * @param {boolean} options.showCover - Whether to include the cover image
 * @param {boolean} options.showFootnotes - Whether to include footnotes
 * @param {number} options.fontSize - Base font size (default 11)
 * @returns {Object} PDFMake document definition
 */
function generatePdfDefinition(articleData, imageMap, options = {}) {
  // Default options
  const config = {
    showCover: options.showCover !== false,
    showFootnotes: options.showFootnotes !== false,
    fontSize: parseInt(options.fontSize) || 11
  };

  // Determine if content is primarily English to apply smart quote cleanup
  // Simple heuristic: check if title contains CJK characters.
  // If NO CJK characters in title, assume English/Western content and clean up quotes.
  const hasCJK = /[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/.test(articleData.meta.title || '');
  const isEnglishContent = !hasCJK;

  /**
   * Helper to clean text based on language detection.
   * If English content is detected, replace smart quotes with straight quotes
   * to avoid spacing issues with CJK fonts.
   */
  const cleanText = (text) => {
    if (!text) return '';
    if (isEnglishContent) {
      return text.replace(/[\u2018\u2019]/g, "'") // ’ ‘ -> '
                 .replace(/[\u201C\u201D]/g, '"'); // “ ” -> "
    }
    return text;
  };

  const content = [];

  // 1. Title
  content.push({
    text: cleanText(articleData.meta.title || 'Untitled'),
    style: 'header'
  });

  // 2. Metadata (Author, Date, URL)
  const metaParts = [];
  if (articleData.meta.authors && articleData.meta.authors.length) {
    metaParts.push(cleanText(articleData.meta.authors.map(a => a.name).join(', ')));
  }
  if (articleData.meta.datePublished) {
    try {
      metaParts.push(new Date(articleData.meta.datePublished).toLocaleDateString());
    } catch(e) {}
  }

  content.push({
    text: metaParts.join(' • '),
    style: 'subheader'
  });

  content.push({
    text: articleData.meta.url || '',
    style: 'link',
    link: articleData.meta.url || ''
  });

  content.push({ text: '\n', fontSize: 10 }); // Spacer

  // 3. Cover Image
  if (config.showCover) {
    if (articleData.meta.image && imageMap.has(articleData.meta.image)) {
      content.push({
        image: imageMap.get(articleData.meta.image),
        width: 500,
        style: 'coverImage',
        alignment: 'center'
      });
      content.push({ text: '\n', fontSize: 10 });
    }
  }

  // 4. Content Sections
  articleData.content.sections.forEach(section => {
    switch(section.type) {
      case 'h2':
        content.push({ text: cleanText(section.content), style: 'h2', pageBreak: 'before' }); // Optional page break for H2
        break;
      case 'h3':
        content.push({ text: cleanText(section.content), style: 'h3' });
        break;
      case 'h4':
        content.push({ text: cleanText(section.content), style: 'h4' });
        break;

      case 'paragraph':
        if (section.content) {
          content.push({
            text: parseInlineMarkdown(section.content, isEnglishContent),
            style: 'text'
          });
        }
        break;

      case 'image':
        if (imageMap.has(section.content)) {
          content.push({
            image: imageMap.get(section.content),
            width: 480,
            style: 'image',
            alignment: 'center'
          });
          if (section.alt) {
            content.push({ text: cleanText(section.alt), style: 'caption', alignment: 'center' });
          }
        }
        break;

      case 'list':
        const listItems = section.content.map(item => ({
          text: parseInlineMarkdown(item, isEnglishContent),
          margin: [0, 4, 0, 4]
        }));

        if (section.ordered) {
          content.push({ ol: listItems, style: 'list' });
        } else {
          content.push({ ul: listItems, style: 'list' });
        }
        break;

      case 'blockquote':
        content.push({
          table: {
            widths: ['*'],
            body: [
              [{
                text: parseInlineMarkdown(section.content, isEnglishContent),
                italics: true,
                color: '#555555',
                fillColor: '#f9f9f9'
              }]
            ]
          },
          layout: {
             defaultBorder: false,
             paddingLeft: function(i, node) { return 10; },
             paddingRight: function(i, node) { return 10; },
             paddingTop: function(i, node) { return 10; },
             paddingBottom: function(i, node) { return 10; },
             hLineWidth: function (i, node) { return 0; },
             vLineWidth: function (i, node) { return i === 0 ? 3 : 0; },
             vLineColor: function (i, node) { return '#cccccc'; }
          },
          margin: [0, 10, 0, 10]
        });
        break;

      case 'code':
        content.push({
          table: {
            widths: ['*'],
            body: [
              [{
                text: section.content, // Code usually shouldn't be smart-quote replaced
                font: 'RobotoMono', // Fallback to monospace if available, or just regular
                fontSize: 10,
                preserveLeadingSpaces: true
              }]
            ]
          },
          layout: 'noBorders',
          fillColor: '#f5f5f5',
          margin: [0, 10, 0, 10]
        });
        break;
    }
  });

  // 5. Footnotes
  if (config.showFootnotes && articleData.footnotes && articleData.footnotes.length > 0) {
    content.push({ text: '\n\nFootnotes', style: 'h3', pageBreak: 'before' });
    articleData.footnotes.forEach(fn => {
      content.push({
        text: [
          { text: `${fn.id}. `, bold: true },
          parseInlineMarkdown(fn.content, isEnglishContent)
        ],
        style: 'footnote',
        margin: [0, 2, 0, 2]
      });
    });
  }

  // 6. Links (optional: separate section if desired, but they are clickable inline)

  // 7. Attribution
  content.push({ text: '\n\n', fontSize: 10 }); // Spacer
  content.push({
    text: [
      { text: 'Generated by ', color: '#888888', italics: true, fontSize: 9 },
      { text: 'Substack to Markdown', color: '#007bff', decoration: 'underline', italics: true, fontSize: 9, link: 'https://github.com/Activer007/chrome-plugin-substack' },
      { text: ' • Powered by Activer', color: '#888888', italics: true, fontSize: 9 }
    ],
    alignment: 'center',
    margin: [0, 20, 0, 10]
  });

  return {
    info: {
      title: articleData.meta.title,
      author: articleData.meta.authors.map(a => a.name).join(', '),
      subject: 'Substack Article',
      keywords: 'substack, pdf, export'
    },
    content: content,
    defaultStyle: {
      font: 'NotoSerifSC',
      fontSize: config.fontSize,
      lineHeight: 1.5
    },
    styles: {
      header: { fontSize: config.fontSize * 2.2, bold: true, margin: [0, 0, 0, 10], color: '#333333' },
      subheader: { fontSize: config.fontSize + 1, color: '#666666', margin: [0, 0, 0, 5] },
      link: { fontSize: config.fontSize - 1, color: '#007bff', decoration: 'underline', margin: [0, 0, 0, 20] },
      h2: { fontSize: config.fontSize * 1.6, bold: true, margin: [0, 20, 0, 10], color: '#333333' },
      h3: { fontSize: config.fontSize * 1.35, bold: true, margin: [0, 15, 0, 8], color: '#333333' },
      h4: { fontSize: config.fontSize * 1.2, bold: true, margin: [0, 10, 0, 5], color: '#333333' },
      text: { margin: [0, 0, 0, 10] },
      list: { margin: [0, 0, 0, 10] },
      caption: { fontSize: 9, color: '#666666', margin: [0, 5, 0, 15], italics: true },
      image: { margin: [0, 10, 0, 5] },
      footnote: { fontSize: 10, color: '#444444' }
    }
  };
}

/**
 * Parses inline markdown (bold, italic, links, code) into PDFMake text objects
 * using a custom regex parser for better control and reliability.
 * Also cleans up characters like smart quotes.
 * @param {string} text - The text string
 * @param {boolean} isEnglishContent - Whether to apply aggressive quote replacement
 * @returns {Array} - Array of text objects
 */
function parseInlineMarkdown(text, isEnglishContent = false) {
  if (!text) return { text: '' };

  // 1. Clean up characters if English content
  if (isEnglishContent) {
    text = text.replace(/[\u2018\u2019]/g, "'") // ’ ‘ -> '
               .replace(/[\u201C\u201D]/g, '"'); // “ ” -> "
  }

  // 2. Simple Recursive Parser
  // We use a simple regex approach to find the first matching token,
  // process it, and recurse on the rest.

  const tokens = [];
  let remaining = text;

  // Regex patterns
  // Bold: **text**
  const boldRegex = /^\*\*([\s\S]+?)\*\*/;
  // Italic: *text* (simplified, assuming no * inside)
  const italicRegex = /^\*([^\*]+)\*/;
  // Code: `text`
  const codeRegex = /^`([^`]+)`/;
  // Link: [text](url)
  const linkRegex = /^\[([^\]]+)\]\(([^)]+)\)/;

  while (remaining.length > 0) {
    // Try to match start of string
    let match = null;
    let type = '';

    // Check for Bold
    if ((match = remaining.match(boldRegex))) {
      type = 'bold';
    }
    // Check for Italic
    else if ((match = remaining.match(italicRegex))) {
      type = 'italic';
    }
    // Check for Code
    else if ((match = remaining.match(codeRegex))) {
      type = 'code';
    }
    // Check for Link
    else if ((match = remaining.match(linkRegex))) {
      type = 'link';
    }

    if (match && match.index === 0) {
      // Found a token at the start
      const fullMatch = match[0];
      const content = match[1];
      const url = match[2]; // For links

      switch (type) {
        case 'bold':
          tokens.push({ text: content, bold: true });
          break;
        case 'italic':
          tokens.push({ text: content, italics: true });
          break;
        case 'code':
          tokens.push({
            text: content,
            background: '#f5f5f5',
            font: 'RobotoMono',
            fontSize: 10
          });
          break;
        case 'link':
          tokens.push({
            text: content,
            color: '#007bff',
            decoration: 'underline',
            bold: true,
            link: url
          });
          break;
      }
      remaining = remaining.substring(fullMatch.length);
    } else {
      // No token at start, find the nearest next special char
      // Find index of next *, `, or [
      const nextSpecial = remaining.search(/[\*`\[]/);

      if (nextSpecial === -1) {
        // No more special chars
        tokens.push({ text: remaining });
        remaining = '';
      } else if (nextSpecial > 0) {
        // Push text up to the special char
        tokens.push({ text: remaining.substring(0, nextSpecial) });
        remaining = remaining.substring(nextSpecial);
      } else {
        // Special char at start but didn't match regex (e.g. single *)
        // Treat as literal
        tokens.push({ text: remaining[0] });
        remaining = remaining.substring(1);
      }
    }
  }

  return tokens;
}

// Deprecated: Removed mapTokenToPdfMake as we use custom parser now
function mapTokenToPdfMake(token) { return {}; }


// Export functions for use in popup.js
// In a non-module environment (Chrome Extension popup), these will be available globally
// if included via <script>, or we can attach to window.
if (typeof window !== 'undefined') {
  window.generatePdfDefinition = generatePdfDefinition;
}
