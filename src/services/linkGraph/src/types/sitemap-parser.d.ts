/**
 * Type declarations for sitemap-parser module
 */

declare module 'sitemap-parser' {
  class SitemapParser {
    constructor(url: string);
    
    on(event: 'url', callback: (url: string) => void): void;
    on(event: 'end', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    
    parseString(xml: string): void;
  }
  
  export default SitemapParser;
}
