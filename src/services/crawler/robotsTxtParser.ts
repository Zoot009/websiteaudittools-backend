/**
 * Robots.txt Parser
 * Parses robots.txt content and determines if URLs are allowed/blocked
 */

interface RobotsRule {
  userAgent: string;
  disallowed: string[];
  allowed: string[];
}

export class RobotsTxtParser {
  private rules: RobotsRule[] = [];
  private rawContent: string = '';

  /**
   * Parse robots.txt content
   */
  parse(content: string): void {
    this.rawContent = content;
    this.rules = [];

    const lines = content.split('\n');
    let currentUserAgent: string | null = null;
    let currentDisallowed: string[] = [];
    let currentAllowed: string[] = [];

    for (let line of lines) {
      // Remove comments and trim
      const commentSplit = line.split('#');
      line = (commentSplit[0] || '').trim();
      if (!line) continue;

      // Parse directives
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      if (directive === 'user-agent') {
        // Save previous user-agent rules
        if (currentUserAgent) {
          this.rules.push({
            userAgent: currentUserAgent,
            disallowed: [...currentDisallowed],
            allowed: [...currentAllowed],
          });
        }

        // Start new user-agent
        currentUserAgent = value.toLowerCase();
        currentDisallowed = [];
        currentAllowed = [];
      } else if (directive === 'disallow' && currentUserAgent) {
        if (value) {
          currentDisallowed.push(value);
        }
      } else if (directive === 'allow' && currentUserAgent) {
        if (value) {
          currentAllowed.push(value);
        }
      }
    }

    // Save last user-agent rules
    if (currentUserAgent) {
      this.rules.push({
        userAgent: currentUserAgent,
        disallowed: [...currentDisallowed],
        allowed: [...currentAllowed],
      });
    }
  }

  /**
   * Check if a URL is allowed for a given user agent
   */
  isAllowed(url: string, userAgent: string = 'Googlebot'): boolean {
    // Get applicable rules (specific user-agent or wildcard)
    const specificRules = this.rules.find(
      r => r.userAgent === userAgent.toLowerCase()
    );
    const wildcardRules = this.rules.find(r => r.userAgent === '*');

    // Use specific rules if available, otherwise use wildcard
    const applicableRules = specificRules || wildcardRules;

    if (!applicableRules) {
      // No rules found - allow by default
      return true;
    }

    // Extract path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;

    // Check Allow rules first (they take precedence)
    for (const allowPattern of applicableRules.allowed) {
      if (this.matches(path, allowPattern)) {
        return true;
      }
    }

    // Check Disallow rules
    for (const disallowPattern of applicableRules.disallowed) {
      if (this.matches(path, disallowPattern)) {
        return false;
      }
    }

    // No matching rules - allow by default
    return true;
  }

  /**
   * Check if path matches a robots.txt pattern
   */
  private matches(path: string, pattern: string): boolean {
    // Exact match
    if (path === pattern) {
      return true;
    }

    // Prefix match (most common in robots.txt)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }

    // Pattern ends with $ (exact match required)
    if (pattern.endsWith('$')) {
      return path === pattern.slice(0, -1);
    }

    // Wildcard in middle
    if (pattern.includes('*')) {
      const parts = pattern.split('*');
      let currentIndex = 0;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        const foundIndex = path.indexOf(part, currentIndex);
        if (foundIndex === -1) {
          return false;
        }

        if (i === 0 && foundIndex !== 0) {
          // First part must match at start
          return false;
        }

        currentIndex = foundIndex + part.length;
      }

      return true;
    }

    // Default prefix match
    return path.startsWith(pattern);
  }

  /**
   * Get all disallowed patterns for a user agent
   */
  getDisallowedPatterns(userAgent: string = 'Googlebot'): string[] {
    const specificRules = this.rules.find(
      r => r.userAgent === userAgent.toLowerCase()
    );
    const wildcardRules = this.rules.find(r => r.userAgent === '*');

    const applicableRules = specificRules || wildcardRules;
    return applicableRules?.disallowed || [];
  }

  /**
   * Check if robots.txt blocks entire site
   */
  blocksEntireSite(userAgent: string = 'Googlebot'): boolean {
    const disallowed = this.getDisallowedPatterns(userAgent);
    return disallowed.includes('/') || disallowed.includes('/*');
  }

  /**
   * Get raw robots.txt content
   */
  getRawContent(): string {
    return this.rawContent;
  }
}
