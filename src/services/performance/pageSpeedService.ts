/**
 * Google PageSpeed Insights API Integration
 * Fetches Core Web Vitals and performance metrics
 */

import axios from 'axios';

export interface PageSpeedMetrics {
  // Performance Score
  performanceScore: number; // 0-100

  // Core Web Vitals (Field Data - Real User Metrics)
  fieldData?: {
    fcp?: { value: number; category: 'FAST' | 'AVERAGE' | 'SLOW' };
    lcp?: { value: number; category: 'FAST' | 'AVERAGE' | 'SLOW' };
    fid?: { value: number; category: 'FAST' | 'AVERAGE' | 'SLOW' };
    cls?: { value: number; category: 'FAST' | 'AVERAGE' | 'SLOW' };
    inp?: { value: number; category: 'FAST' | 'AVERAGE' | 'SLOW' };
  };

  // Lab Data (Lighthouse Metrics)
  labData: {
    fcp: number; // First Contentful Paint (ms)
    speedIndex: number; // Speed Index (ms)
    lcp: number; // Largest Contentful Paint (ms)
    tti: number; // Time to Interactive (ms)
    tbt: number; // Total Blocking Time (ms)
    cls: number; // Cumulative Layout Shift (score)
  };

  // Opportunities (Performance Improvements)
  opportunities: Array<{
    title: string;
    description: string;
    potentialSavings: number; // milliseconds
  }>;

  // Diagnostics
  diagnostics: Array<{
    title: string;
    description: string;
    value: number | string;
  }>;

  // Metadata
  strategy: 'mobile' | 'desktop';
  fetchTime: Date;
}

export interface PageSpeedResult {
  mobile?: PageSpeedMetrics;
  desktop?: PageSpeedMetrics;
  error?: string;
}

export class PageSpeedService {
  private baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  /**
   * Get API key from environment (lazy loading)
   */
  private getApiKey(): string {
    return process.env.GOOGLE_PAGESPEED_API_KEY || '';
  }

  /**
   * Analyze a URL with PageSpeed Insights
   */
  async analyze(url: string, options: { 
    mobile?: boolean; 
    desktop?: boolean;
  } = { mobile: true, desktop: true }): Promise<PageSpeedResult> {
    
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      return { error: 'No PageSpeed API key configured' };
    }

    const result: PageSpeedResult = {};

    try {
      // Run mobile analysis
      if (options.mobile) {
        console.log(`[PageSpeedService] Analyzing ${url} (mobile)...`);
        result.mobile = await this.runAnalysis(url, 'mobile');
      }

      // Run desktop analysis
      if (options.desktop) {
        console.log(`[PageSpeedService] Analyzing ${url} (desktop)...`);
        result.desktop = await this.runAnalysis(url, 'desktop');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PageSpeedService] Error analyzing ${url}:`, errorMsg);
      return { error: errorMsg };
    }
  }

  /**
   * Run a single PageSpeed analysis
   */
  private async runAnalysis(url: string, strategy: 'mobile' | 'desktop'): Promise<PageSpeedMetrics> {
    const params = {
      url: url,
      key: this.getApiKey(),
      strategy: strategy,
      category: 'performance',
      // Request specific metrics
      fields: 'lighthouseResult,loadingExperience',
    };

    try {
      const response = await axios.get(this.baseUrl, { 
        params,
        timeout: 60000, // 60 second timeout (PageSpeed can be slow)
      });

      const data = response.data;
      const lighthouse = data.lighthouseResult;
      const loadingExperience = data.loadingExperience;

      // Extract performance score
      const performanceScore = Math.round(
        (lighthouse.categories?.performance?.score || 0) * 100
      );

      // Extract field data (real user metrics from CrUX)
      const fieldData = this.extractFieldData(loadingExperience);

      // Extract lab data (Lighthouse metrics)
      const labData = this.extractLabData(lighthouse);

      // Extract opportunities
      const opportunities = this.extractOpportunities(lighthouse);

      // Extract diagnostics
      const diagnostics = this.extractDiagnostics(lighthouse);

      const result: PageSpeedMetrics = {
        performanceScore,
        labData,
        opportunities,
        diagnostics,
        strategy,
        fetchTime: new Date(),
      };

      // Only add fieldData if it exists
      if (fieldData) {
        result.fieldData = fieldData;
      }

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('PageSpeed API rate limit exceeded. Please try again later.');
        }
        if (error.response?.status === 400) {
          throw new Error(`Invalid URL or API request: ${error.response.data?.error?.message || 'Unknown error'}`);
        }
      }
      throw error;
    }
  }

  /**
   * Extract field data (real user metrics)
   */
  private extractFieldData(loadingExperience: any): PageSpeedMetrics['fieldData'] {
    if (!loadingExperience?.metrics) {
      return undefined;
    }

    const metrics = loadingExperience.metrics;
    const fieldData: any = {};

    // Helper to extract metric
    const extractMetric = (key: string) => {
      if (!metrics[key]) return undefined;
      return {
        value: metrics[key].percentile || 0,
        category: metrics[key].category as 'FAST' | 'AVERAGE' | 'SLOW',
      };
    };

    fieldData.fcp = extractMetric('FIRST_CONTENTFUL_PAINT_MS');
    fieldData.lcp = extractMetric('LARGEST_CONTENTFUL_PAINT_MS');
    fieldData.fid = extractMetric('FIRST_INPUT_DELAY_MS');
    fieldData.cls = extractMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE');
    fieldData.inp = extractMetric('INTERACTION_TO_NEXT_PAINT');

    return Object.keys(fieldData).length > 0 ? fieldData : undefined;
  }

  /**
   * Extract lab data (Lighthouse metrics)
   */
  private extractLabData(lighthouse: any): PageSpeedMetrics['labData'] {
    const audits = lighthouse.audits || {};

    return {
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      speedIndex: audits['speed-index']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      tti: audits['interactive']?.numericValue || 0,
      tbt: audits['total-blocking-time']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
    };
  }

  /**
   * Extract performance opportunities
   */
  private extractOpportunities(lighthouse: any): PageSpeedMetrics['opportunities'] {
    const audits = lighthouse.audits || {};
    const opportunities: PageSpeedMetrics['opportunities'] = [];

    // List of key optimization opportunities
    const opportunityAudits = [
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'offscreen-images',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'efficient-animated-content',
      'uses-text-compression',
      'uses-responsive-images',
      'uses-optimized-images',
      'uses-webp-images',
      'uses-long-cache-ttl',
      'total-byte-weight',
    ];

    for (const auditKey of opportunityAudits) {
      const audit = audits[auditKey];
      
      // Only include audits with potential savings
      if (audit && audit.details?.overallSavingsMs > 0) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          potentialSavings: Math.round(audit.details.overallSavingsMs),
        });
      }
    }

    // Sort by potential savings (highest first)
    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Extract diagnostics
   */
  private extractDiagnostics(lighthouse: any): PageSpeedMetrics['diagnostics'] {
    const audits = lighthouse.audits || {};
    const diagnostics: PageSpeedMetrics['diagnostics'] = [];

    // Key diagnostic audits
    const diagnosticAudits = [
      'network-requests',
      'network-rtt',
      'network-server-latency',
      'main-thread-tasks',
      'bootup-time',
      'mainthread-work-breakdown',
      'dom-size',
      'duplicated-javascript',
      'legacy-javascript',
      'third-party-summary',
    ];

    for (const auditKey of diagnosticAudits) {
      const audit = audits[auditKey];
      
      if (audit && audit.numericValue !== undefined) {
        diagnostics.push({
          title: audit.title,
          description: audit.description,
          value: audit.displayValue || audit.numericValue,
        });
      }
    }

    return diagnostics;
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Get API usage info (helpful for monitoring)
   */
  getApiInfo(): { configured: boolean; quotaInfo: string } {
    return {
      configured: this.isConfigured(),
      quotaInfo: 'PageSpeed Insights API: 25,000 requests/day (free tier)',
    };
  }
}

// Export singleton instance
export const pageSpeedService = new PageSpeedService();
