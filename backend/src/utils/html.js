/**
 * Strip HTML tags from a string and decode common HTML entities
 * @param {string} str - The HTML string to strip
 * @returns {string} - Plain text without HTML tags
 */
export function stripHtml(str) {
  if (!str || typeof str !== 'string') return str;
  
  return str
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&times;/g, '\u00d7') // Replace multiplication sign
    .replace(/&amp;/g, '&') // Replace ampersand
    .replace(/&lt;/g, '<') // Replace less than
    .replace(/&gt;/g, '>') // Replace greater than
    .replace(/&quot;/g, '"') // Replace quote
    .replace(/&#39;/g, "'") // Replace apostrophe
    .replace(/&hellip;/g, '…') // Replace ellipsis
    .replace(/&rdquo;/g, '"') // Replace right double quote
    .replace(/&ldquo;/g, '"') // Replace left double quote
    .replace(/&rsquo;/g, '') // Replace right single quote
    .replace(/&lsquo;/g, '') // Replace left single quote
    .replace(/&mdash;/g, '—') // Replace em dash
    .replace(/&ndash;/g, '–') // Replace en dash
    .replace(/&bull;/g, '•') // Replace bullet
    .replace(/&reg;/g, '®') // Replace registered trademark
    .replace(/&copy;/g, '©') // Replace copyright
    .replace(/&trade;/g, '™') // Replace trademark
    .replace(/&euro;/g, '€') // Replace euro
    .replace(/&pound;/g, '£') // Replace pound
    .replace(/&yen;/g, '¥') // Replace yen
    .replace(/&cent;/g, '¢') // Replace cent
    .replace(/&deg;/g, '°') // Replace degree
    .replace(/&plusmn;/g, '±') // Replace plus-minus
    .replace(/&micro;/g, 'µ') // Replace micro
    .replace(/&para;/g, '¶') // Replace paragraph
    .replace(/&sect;/g, '§') // Replace section
    .trim();
}

/**
 * Recursively strip HTML from all string properties in an object
 * @param {any} obj - Object to process
 * @param {string[]} fields - Array of field names to strip HTML from
 * @returns {any} - Object with HTML stripped from specified fields
 */
export function stripHtmlFromFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => stripHtmlFromFields(item, fields));
  }
  
  const result = { ...obj };
  
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = stripHtml(result[field]);
    }
  }
  
  return result;
}

/**
 * Sanitizes and fixes malformed HTML returned from the Java doc-generation service
 * 
 * Issues addressed:
 * 1. Malformed HTML tags with spaces before closing angle brackets (e.g., '<i >' instead of '<i>')
 * 2. HTML entities that need to be properly preserved for browser rendering
 * 3. Malformed closing tags with spaces (e.g., '</i >' instead of '</i>')
 * 4. Extracts body content from full HTML documents and removes problematic body margin styles
 * 5. Removes Microsoft Word-specific styles and attributes
 * 6. Cleans up unnecessary span tags with inline styles
 * 7. Fixes nested and unclosed italic/emphasis tags
 * 
 * @param {string} html - Raw HTML string from the Java service
 * @returns {string} Sanitized HTML string ready for rendering
 */
export function sanitizeDocPreviewHtml(html) {
  if (!html || typeof html !== 'string') return html;

  let sanitized = html;

  // Remove Microsoft Word-specific styles and attributes
  // These cause rendering issues and are not needed in web browsers
  sanitized = sanitized.replace(/mso-[a-z-]+:[^;"']*;?/gi, '');
  sanitized = sanitized.replace(/style="[^"]*mso-[^"]*"/gi, 'style=""');
  
  // Remove empty style attributes
  sanitized = sanitized.replace(/\s+style=""\s*/gi, ' ');
  
  // Clean up excessive spans with only color/font styling
  // Replace spans that only contain basic formatting with simpler HTML
  sanitized = sanitized.replace(/<span style="color:\s*black;[^"]*">([^<]+)<\/span>/gi, '$1');
  
  // Fix common HTML entity issues in attributes
  sanitized = sanitized.replace(/&quot;/g, '"');
  
  // Fix nested or unclosed <em> tags by ensuring proper pairing
  // Count opening and closing em tags and balance them
  const emOpenCount = (sanitized.match(/<em>/gi) || []).length;
  const emCloseCount = (sanitized.match(/<\/em>/gi) || []).length;
  if (emOpenCount > emCloseCount) {
    // Add missing closing tags at the end
    for (let i = 0; i < emOpenCount - emCloseCount; i++) {
      sanitized += '</em>';
    }
  }

  // CRITICAL: Unescape HTML entities for common formatting tags
  // The Java service sometimes returns tags as &lt;em&gt; instead of <em>
  // We need to convert these back to actual HTML tags so browsers can render them
  sanitized = sanitized.replace(/&lt;em&gt;/gi, '<em>');
  sanitized = sanitized.replace(/&lt;\/em&gt;/gi, '</em>');
  sanitized = sanitized.replace(/&lt;i&gt;/gi, '<i>');
  sanitized = sanitized.replace(/&lt;\/i&gt;/gi, '</i>');
  sanitized = sanitized.replace(/&lt;b&gt;/gi, '<b>');
  sanitized = sanitized.replace(/&lt;\/b&gt;/gi, '</b>');
  sanitized = sanitized.replace(/&lt;strong&gt;/gi, '<strong>');
  sanitized = sanitized.replace(/&lt;\/strong&gt;/gi, '</strong>');
  sanitized = sanitized.replace(/&lt;u&gt;/gi, '<u>');
  sanitized = sanitized.replace(/&lt;\/u&gt;/gi, '</u>');
  sanitized = sanitized.replace(/&lt;sup&gt;/gi, '<sup>');
  sanitized = sanitized.replace(/&lt;\/sup&gt;/gi, '</sup>');
  sanitized = sanitized.replace(/&lt;sub&gt;/gi, '<sub>');
  sanitized = sanitized.replace(/&lt;\/sub&gt;/gi, '</sub>');
  
  // Fix malformed opening and self-closing tags with spaces before >
  // Examples: <i >, <br />, <meta charset='UTF-8' >
  // This handles both tags with and without attributes
  sanitized = sanitized.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)\s+>/g, '<$1$2>');
  
  // Fix &nbsp; entities that appear as literal text
  sanitized = sanitized.replace(/&amp;nbsp;/g, '&nbsp;');
  
  // Clean up excessive nested spans with complex Word styles
  // Remove spans that wrap simple text with only color/font styling
  sanitized = sanitized.replace(/<span[^>]*style="[^"]*font-family:[^"]*"[^>]*>([^<]*)<\/span>/gi, '$1');
  
  // More aggressive span removal - remove spans that only have color/font styles and contain simple content
  // This handles cases like: <span style="color: black; font-family: 'Arial',sans-serif; font-size: 9pt;">text</span>
  sanitized = sanitized.replace(/<span\s+style="[^"]*"\s*>([^<]+)<\/span>/gi, (match, content) => {
    // Keep the span if it contains nested tags, otherwise just return the content
    return content;
  });
  
  // Handle spans with nested em/i tags - preserve the inner formatting, remove the span wrapper
  sanitized = sanitized.replace(/<span[^>]*>(<(?:em|i|b|strong|u|sup|sub)>[^<]*<\/(?:em|i|b|strong|u|sup|sub)>)<\/span>/gi, '$1');
  
  // Fix improperly nested emphasis tags (common in Word exports)
  // Example: </em>x <em> should just be x
  sanitized = sanitized.replace(/<\/em>\s*([^<]+)\s*<em>/gi, '$1');
  
  // Remove zero-width spaces and other invisible characters
  sanitized = sanitized.replace(/\u200B/g, '');
  sanitized = sanitized.replace(/\u00A0{2,}/g, ' '); // Replace multiple non-breaking spaces with single space

  // Fix malformed closing tags with spaces before >
  // Examples: </i >, </span >, </div >
  sanitized = sanitized.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)\s+>/g, '</$1>');

  // Extract body content if this is a full HTML document
  // The Java service returns complete HTML documents with DOCTYPE, html, head, and body tags
  // We need to extract only the body content and the styles to render properly in our preview pane
  const bodyMatch = sanitized.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const styleMatch = sanitized.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  
  if (bodyMatch && bodyMatch[1]) {
    let bodyContent = bodyMatch[1];
    let styles = styleMatch ? styleMatch[1] : '';
    
    // Remove the problematic body margin that causes layout issues
    // The preview pane already has its own padding via .split-pane-body
    styles = styles.replace(/body\s*\{[^}]*margin:\s*40px;[^}]*\}/g, (match) => {
      // Remove margin but keep other body styles
      return match.replace(/margin:\s*40px;/g, 'margin: 0;');
    });
    
    // Reconstruct the HTML with cleaned styles and body content
    sanitized = styles ? `<style>${styles}</style>${bodyContent}` : bodyContent;
  }

  // Clean up table formatting issues from Word
  // Remove excessive table styles that cause rendering problems
  sanitized = sanitized.replace(/(<table[^>]*)style="[^"]*"/gi, '$1');
  sanitized = sanitized.replace(/(<td[^>]*)style="[^"]*"/gi, '$1');
  sanitized = sanitized.replace(/(<tr[^>]*)style="[^"]*"/gi, '$1');
  
  // Add basic table styling for better readability
  sanitized = sanitized.replace(/<table>/gi, '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">');
  sanitized = sanitized.replace(/<td>/gi, '<td style="padding: 8px; border: 1px solid #ddd;">');
  sanitized = sanitized.replace(/<th>/gi, '<th style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: 600;">');
  
  // Fix common typography issues
  // Replace smart quotes that might be double-encoded
  sanitized = sanitized.replace(/&amp;#8220;/g, '"');
  sanitized = sanitized.replace(/&amp;#8221;/g, '"');
  sanitized = sanitized.replace(/&amp;#8216;/g, "'");
  sanitized = sanitized.replace(/&amp;#8217;/g, "'");
  
  // Note: We do NOT decode HTML entities here because:
  // - The browser's HTML parser will handle them automatically when rendering via v-html
  // - Decoding them would break the HTML structure (e.g., &nbsp; would become a literal space character)
  // - Common entities like &aacute;, &nbsp;, &lt;, &gt; need to remain as entities

  return sanitized;
}