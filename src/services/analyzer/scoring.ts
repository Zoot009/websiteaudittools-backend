/**
 * Scoring Utilities for SEO Analysis
 * 
 * Provides grade calculation, tier assignment, and passing check bonus logic
 * to enhance the existing 0-100 scoring system with positive reinforcement.
 * 
 * SCORING FORMULA (Fixed v2.3.0):
 * ================================
 * Category Score = 100 - Σ(impactScore / 10 × severityMultiplier) + bonus
 * 
 * Each issue directly deducts points based on:
 * - CRITICAL: (impactScore / 10) × 4.0  (e.g., impact=50 → 20 points deducted)
 * - HIGH:     (impactScore / 10) × 2.0  (e.g., impact=60 → 12 points deducted)
 * - MEDIUM:   (impactScore / 10) × 1.0  (e.g., impact=40 → 4 points deducted)
 * - LOW:      (impactScore / 10) × 0.5  (e.g., impact=30 → 1.5 points deducted)
 * 
 * Bonus: +0 to +5 points per category from passing checks (reduced from 15 in v2.3.0)
 * 
 * Overall Score = Weighted average of all category scores
 */

import type {
  AuditSection,
  IssueCategory,
  PassingCheck,
  SEOAuditCheck,
  SectionScore,
  Severity,
} from './types';

/**
 * Letter grade assigned based on score
 */
export type ScoreGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

/**
 * Performance tier for easier understanding
 */
export type ScoreTier = 'Excellent' | 'Good' | 'Fair' | 'Poor';

/**
 * Severity multipliers for issue impact calculation
 */
export const SEVERITY_MULTIPLIERS: Record<Severity, number> = {
  CRITICAL: 4.0,
  HIGH: 2.0,
  MEDIUM: 1.0,
  LOW: 0.5,
};

/**
 * Category weights for overall score calculation
 * Higher weight = more important to overall SEO score
 */
export const CATEGORY_WEIGHTS: Record<IssueCategory, number> = {
  ON_PAGE: 0.30,        // Most important - title, meta, headings, keywords
  TECHNICAL: 0.20,      // HTTPS, SSL, canonical, robots, sitemap
  PERFORMANCE: 0.20,    // Core Web Vitals, load time, optimization
  SECURITY: 0.10,       // SSL, security headers
  LINKS: 0.10,          // Internal linking structure
  ACCESSIBILITY: 0.05,  // Usability, viewport, fonts
  STRUCTURED_DATA: 0.05, // Schema.org markup
};

/**
 * Maximum bonus points per category from passing checks
 * Keeps bonuses as rewards, not penalties offsetters
 * 
 * Reduced from 15 to 5 in v2.3.0 to prevent bonus inflation.
 * With 7 categories × 5 points = 35 max total bonus (reasonable reward)
 * vs old 7 × 15 = 105 max (too generous, masked real issues)
 */
export const MAX_BONUS_PER_CATEGORY = 5;

/**
 * Priority weights for normalized check scoring.
 */
export const PRIORITY_WEIGHTS: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 0.7,
  3: 0.4,
};

/**
 * Point values for passing checks based on their importance
 * These are used to calculate bonus points
 */
export interface PassingCheckWeight {
  category: IssueCategory;
  code: string;
  weight: number; // Points awarded for passing this check
}

/**
 * Predefined weights for common passing checks
 * Critical rules = 1.0 pt, Important = 0.5 pt, Nice-to-have = 0.3 pt
 */
export const PASSING_CHECK_WEIGHTS: PassingCheckWeight[] = [
  // TECHNICAL - Critical infrastructure (1.0 pts each)
  { category: 'TECHNICAL', code: 'HTTPS_CHECK', weight: 1.0 },
  { category: 'TECHNICAL', code: 'SSL_CERTIFICATE', weight: 1.0 },
  { category: 'TECHNICAL', code: 'CANONICAL_TAG', weight: 0.8 },
  { category: 'TECHNICAL', code: 'ROBOTS_TXT', weight: 0.8 },
  { category: 'TECHNICAL', code: 'SITEMAP', weight: 0.8 },
  { category: 'TECHNICAL', code: 'CHARSET', weight: 0.5 },
  { category: 'TECHNICAL', code: 'HTTP2_CHECK', weight: 0.3 },

  // ON_PAGE - Critical SEO elements (1.0 pts for core elements)
  { category: 'ON_PAGE', code: 'TITLE_TAG', weight: 1.0 },
  { category: 'ON_PAGE', code: 'META_DESCRIPTION', weight: 1.0 },
  { category: 'ON_PAGE', code: 'H1_TAG', weight: 1.0 },
  { category: 'ON_PAGE', code: 'HEADING_HIERARCHY', weight: 0.8 },
  { category: 'ON_PAGE', code: 'KEYWORD_CONSISTENCY', weight: 0.8 },
  { category: 'ON_PAGE', code: 'IMAGE_ALT', weight: 0.5 },
  { category: 'ON_PAGE', code: 'HREFLANG', weight: 0.5 },
  { category: 'ON_PAGE', code: 'FRIENDLY_URLS', weight: 0.3 },

  // PERFORMANCE - Core Web Vitals are critical (1.0 pts)
  { category: 'PERFORMANCE', code: 'CORE_WEB_VITALS', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'LCP_CHECK', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'CLS_CHECK', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'FID_CHECK', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'LOAD_TIME', weight: 0.8 },
  { category: 'PERFORMANCE', code: 'PAGE_SIZE', weight: 0.5 },
  { category: 'PERFORMANCE', code: 'IMAGE_OPTIMIZATION', weight: 0.5 },
  { category: 'PERFORMANCE', code: 'MINIFICATION', weight: 0.3 },
  { category: 'PERFORMANCE', code: 'COMPRESSION', weight: 0.3 },

  // SECURITY - SSL is critical
  { category: 'SECURITY', code: 'SSL_VALID', weight: 1.0 },
  { category: 'SECURITY', code: 'HTTPS_REDIRECT', weight: 0.8 },
  { category: 'SECURITY', code: 'SECURITY_HEADERS', weight: 0.5 },

  // LINKS - Link structure
  { category: 'LINKS', code: 'INTERNAL_LINKS', weight: 0.8 },
  { category: 'LINKS', code: 'LINK_STRUCTURE', weight: 0.8 },
  { category: 'LINKS', code: 'NO_BROKEN_LINKS', weight: 0.5 },

  // ACCESSIBILITY - User experience
  { category: 'ACCESSIBILITY', code: 'VIEWPORT', weight: 0.8 },
  { category: 'ACCESSIBILITY', code: 'FAVICON', weight: 0.3 },
  { category: 'ACCESSIBILITY', code: 'FONT_SIZE', weight: 0.5 },
  { category: 'ACCESSIBILITY', code: 'TAP_TARGETS', weight: 0.5 },

  // STRUCTURED_DATA - Rich snippets
  { category: 'STRUCTURED_DATA', code: 'ORGANIZATION_SCHEMA', weight: 0.8 },
  { category: 'STRUCTURED_DATA', code: 'LOCAL_BUSINESS_SCHEMA', weight: 0.8 },
  { category: 'STRUCTURED_DATA', code: 'PRODUCT_SCHEMA', weight: 0.5 },
];

/**
 * Convert a 0-100 score to a letter grade
 */
export function calculateGrade(score: number): ScoreGrade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Convert a 0-100 score to a performance tier
 */
export function calculateTier(score: number): ScoreTier {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

/**
 * Get the weight for a specific passing check
 * Returns default based on category if not found in predefined weights
 */
export function getPassingCheckWeight(category: IssueCategory, code: string): number {
  const predefined = PASSING_CHECK_WEIGHTS.find(
    (w) => w.category === category && w.code === code
  );
  
  if (predefined) {
    return predefined.weight;
  }

  // Default weights by category if not explicitly defined
  const defaultWeights: Record<IssueCategory, number> = {
    TECHNICAL: 0.5,
    ON_PAGE: 0.5,
    PERFORMANCE: 0.5,
    SECURITY: 0.5,
    LINKS: 0.4,
    ACCESSIBILITY: 0.3,
    STRUCTURED_DATA: 0.3,
  };

  return defaultWeights[category] || 0.3;
}

/**
 * Calculate bonus points from passing checks for a category
 * 
 * @param passingChecks - Array of passing checks for this category
 * @param totalApplicableChecks - Total number of rules that could apply to this category
 * @returns Bonus points (0 to MAX_BONUS_PER_CATEGORY)
 */
export function calculatePassingCheckBonus(
  passingChecks: PassingCheck[],
  totalApplicableChecks: number = 10 // Default estimate per category
): number {
  if (passingChecks.length === 0) {
    return 0;
  }

  // Calculate weighted sum of passing checks
  const weightedSum = passingChecks.reduce((sum, check) => {
    const weight = getPassingCheckWeight(check.category, check.code);
    return sum + weight;
  }, 0);

  // Maximum possible points if all checks passed
  // Estimate: average weight of 0.6 per check
  const maxPossiblePoints = totalApplicableChecks * 0.6;

  // Calculate bonus as percentage of max possible, scaled to MAX_BONUS_PER_CATEGORY
  const bonusPercentage = Math.min(1.0, weightedSum / maxPossiblePoints);
  const bonus = bonusPercentage * MAX_BONUS_PER_CATEGORY;

  // Round to 1 decimal place
  return Math.round(bonus * 10) / 10;
}

/**
 * Get a human-readable insight message based on score and grade
 */
export function getScoreInsight(
  score: number,
  grade: ScoreGrade,
  category: IssueCategory
): string {
  const categoryName = category.replace('_', ' ').toLowerCase();

  if (score >= 90) {
    return `Excellent ${categoryName} SEO! Your site follows best practices.`;
  } else if (score >= 70) {
    return `Good ${categoryName} SEO with room for improvement.`;
  } else if (score >= 50) {
    return `Fair ${categoryName} SEO. Several issues need attention.`;
  } else {
    return `Poor ${categoryName} SEO. Critical issues require immediate action.`;
  }
}

/**
 * Calculate the overall score from category scores using weighted average
 */
export function calculateOverallScore(
  categoryScores: Array<{ category: IssueCategory; score: number }>
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { category, score } of categoryScores) {
    const weight = CATEGORY_WEIGHTS[category] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  const overallScore = weightedSum / totalWeight;
  return Math.round(overallScore * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate normalized weighted score from canonical checks.
 * Informational checks (maxScore=0) are excluded.
 */
export function calculateFinalScoreFromChecks(checks: SEOAuditCheck[]): number {
  let total = 0;
  let count = 0;

  for (const check of checks) {
    if (check.maxScore <= 0) {
      continue;
    }

    const normalized = Math.max(0, Math.min(1, check.score / check.maxScore));
    const weight = PRIORITY_WEIGHTS[check.priority] ?? 0.7;

    total += normalized * weight;
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return Math.round(((total / count) * 100) * 10) / 10;
}

/**
 * Calculate normalized weighted scores for each section from canonical checks.
 */
export function calculateSectionScoresFromChecks(checks: SEOAuditCheck[]): SectionScore[] {
  const sections: AuditSection[] = ['seo', 'performance', 'ui', 'links', 'technology', 'social', 'geo'];

  return sections.map((section) => {
    const sectionChecks = checks.filter((check) => check.section === section && check.maxScore > 0);

    if (sectionChecks.length === 0) {
      return {
        section,
        score: 0,
        checks: 0,
      };
    }

    let total = 0;
    for (const check of sectionChecks) {
      const normalized = Math.max(0, Math.min(1, check.score / check.maxScore));
      const weight = PRIORITY_WEIGHTS[check.priority] ?? 0.7;
      total += normalized * weight;
    }

    return {
      section,
      score: Math.round(((total / sectionChecks.length) * 100) * 10) / 10,
      checks: sectionChecks.length,
    };
  });
}

/**
 * Get emoji indicator for grade (optional, for visual appeal)
 */
export function getGradeEmoji(grade: ScoreGrade): string {
  const emojiMap: Record<ScoreGrade, string> = {
    'A+': '🏆',
    'A': '⭐',
    'B+': '✅',
    'B': '👍',
    'C+': '⚠️',
    'C': '⚠️',
    'D': '⚠️',
    'F': '❌',
  };
  return emojiMap[grade] || '';
}

/**
 * Get color indicator for tier (for UI/display purposes)
 */
export function getTierColor(tier: ScoreTier): string {
  const colorMap: Record<ScoreTier, string> = {
    'Excellent': 'green',
    'Good': 'blue',
    'Fair': 'yellow',
    'Poor': 'red',
  };
  return colorMap[tier];
}
