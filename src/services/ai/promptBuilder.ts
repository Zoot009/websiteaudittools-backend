/**
 * Prompt Builder for SEO Audit Chat
 * 
 * Formats audit report data into optimized prompts for DeepSeek
 */

interface AuditReport {
  id: string;
  url: string;
  mode: string;
  pagesAnalyzed: number;
  overallScore: number;
  technicalScore: number;
  onPageScore: number;
  performanceScore: number;
  accessibilityScore: number;
  linkScore: number | null;
  structuredDataScore: number | null;
  securityScore: number;
  passingChecks?: any[];
  pages: any[];
  issues: any[];
  recommendations: any[];
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Build system prompt with audit report context
 */
export function buildSystemPrompt(report: AuditReport): string {
  const { 
    url, 
    mode, 
    pagesAnalyzed,
    overallScore,
    technicalScore,
    onPageScore,
    performanceScore,
    accessibilityScore,
    linkScore,
    structuredDataScore,
    securityScore,
    issues,
    recommendations,
    pages,
    passingChecks = []
  } = report;

  // Categorize issues by severity
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const highIssues = issues.filter(i => i.severity === 'HIGH');
  const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
  const lowIssues = issues.filter(i => i.severity === 'LOW');

  // Get top priority recommendations
  const topRecommendations = recommendations
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 10);

  // Format recommendations section (only if we have recommendations)
  const recommendationsSection = recommendations.length > 0 
    ? `## TOP RECOMMENDATIONS (${recommendations.length} total)\n\n${formatRecommendations(topRecommendations)}\n\n`
    : '// TODO: Recommendations will appear here once the recommendations system is reimplemented\n\n';

  // Build the prompt
  return `You are an expert SEO consultant analyzing a website audit report. Help the user understand their SEO performance and provide actionable advice.

# AUDIT REPORT SUMMARY

**Website**: ${url}
**Audit Type**: ${mode.toUpperCase()} page audit
**Pages Analyzed**: ${pagesAnalyzed}
**Completed**: ${report.completedAt?.toLocaleString() || 'In progress'}

## OVERALL SCORES (0-100)

- **Overall Score**: ${overallScore.toFixed(1)}/100 ${getScoreEmoji(overallScore)}
- **Technical SEO**: ${technicalScore.toFixed(1)}/100
- **On-Page SEO**: ${onPageScore.toFixed(1)}/100
- **Performance**: ${performanceScore.toFixed(1)}/100
- **Accessibility**: ${accessibilityScore.toFixed(1)}/100
- **Security**: ${securityScore.toFixed(1)}/100
${linkScore !== null ? `- **Link Structure**: ${linkScore.toFixed(1)}/100\n` : ''}${structuredDataScore !== null ? `- **Structured Data**: ${structuredDataScore.toFixed(1)}/100\n` : ''}

## ISSUES FOUND (${issues.length} total)

${criticalIssues.length > 0 ? `### 🔴 CRITICAL Issues (${criticalIssues.length})\n${formatIssues(criticalIssues.slice(0, 5))}\n` : ''}
${highIssues.length > 0 ? `### 🟠 HIGH Priority Issues (${highIssues.length})\n${formatIssues(highIssues.slice(0, 5))}\n` : ''}
${mediumIssues.length > 0 ? `### 🟡 MEDIUM Priority Issues (${mediumIssues.length})\n${formatIssues(mediumIssues.slice(0, 3))}\n` : ''}
${lowIssues.length > 0 ? `### 🟢 LOW Priority Issues (${lowIssues.length})\n` : ''}

${recommendationsSection}${passingChecks.length > 0 ? `## ✅ WHAT'S WORKING WELL (${passingChecks.length} passing checks)\n\n${formatPassingChecks(passingChecks.slice(0, 5))}\n` : ''}

## PAGE PERFORMANCE

${formatPageSummary(pages.slice(0, 5))}

---

**Instructions:**
1. Provide helpful, actionable SEO advice based on this audit data
2. Prioritize critical and high-severity issues in your recommendations
3. Explain SEO concepts in simple, non-technical language when possible
4. Reference specific issue IDs or page URLs when giving advice
5. Be encouraging and constructive - focus on improvements, not just problems
6. If the user asks about specific metrics or pages, use the data above
7. Keep responses concise (under 500 words) unless asked for detail`;
}

/**
 * Get emoji based on score
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return '🎉 Excellent';
  if (score >= 75) return '👍 Good';
  if (score >= 60) return '⚠️  Needs Improvement';
  return '🔴 Critical';
}

/**
 * Format issues for prompt
 */
function formatIssues(issues: any[]): string {
  return issues.map((issue, idx) => {
    return `${idx + 1}. **${issue.title}** (Impact: ${issue.impactScore}/100)
   - ${issue.description}
   - Page: ${issue.pageUrl || 'Site-wide'}
   - ID: ${issue.id}`;
  }).join('\n\n');
}

/**
 * Format recommendations for prompt
 */
function formatRecommendations(recommendations: any[]): string {
  return recommendations.map((rec, idx) => {
    const stepCount = rec.steps?.length || 0;
    return `${idx + 1}. **${rec.title}** (Priority: ${rec.priority}, ${rec.difficulty})
   - ${rec.description}
   - Estimated time: ${rec.estimatedTimeMinutes} minutes
   - ${stepCount} step${stepCount !== 1 ? 's' : ''} to fix
   - ID: ${rec.id}`;
  }).join('\n\n');
}

/**
 * Format passing checks
 */
function formatPassingChecks(checks: any[]): string {
  return checks.map((check, idx) => {
    return `${idx + 1}. **${check.title}** - ${check.description}`;
  }).join('\n');
}

/**
 * Format page performance summary
 */
function formatPageSummary(pages: any[]): string {
  if (pages.length === 0) return 'No page data available.';
  
  return pages.map((page, idx) => {
    const vitals = [];
    if (page.lcp) vitals.push(`LCP: ${page.lcp.toFixed(0)}ms`);
    if (page.cls !== null && page.cls !== undefined) vitals.push(`CLS: ${page.cls.toFixed(3)}`);
    
    return `${idx + 1}. **${page.url}**
   - Load Time: ${page.loadTime.toFixed(0)}ms
   - Status: ${page.statusCode}
   - ${vitals.join(', ')}
   - Word Count: ${page.wordCount || 0}, Images: ${page.imageCount || 0}, Links: ${page.linkCount || 0}`;
  }).join('\n\n');
}

/**
 * Build a condensed version for large reports (100+ pages)
 */
export function buildCondensedSystemPrompt(report: AuditReport): string {
  // For very large reports, only include summary stats and worst issues
  const criticalAndHighIssues = report.issues
    .filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
    .slice(0, 15);
  
  const topRecommendations = report.recommendations.length > 0
    ? report.recommendations
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 8)
    : [];
  
  // Only include worst performing pages
  const worstPages = report.pages
    .sort((a, b) => (b.loadTime || 0) - (a.loadTime || 0))
    .slice(0, 10);

  const condensedReport = {
    ...report,
    issues: criticalAndHighIssues,
    recommendations: topRecommendations,
    pages: worstPages,
  };

  return buildSystemPrompt(condensedReport);
}

/**
 * Decide which prompt builder to use based on report size
 */
export function buildOptimalSystemPrompt(report: AuditReport): string {
  const estimatedTokens = estimateTokenCount(report);
  
  // If report is huge (> 80K tokens), use condensed version
  if (estimatedTokens > 80000) {
    console.log(`📊 Large report detected (${estimatedTokens.toLocaleString()} tokens), using condensed prompt`);
    return buildCondensedSystemPrompt(report);
  }
  
  return buildSystemPrompt(report);
}

/**
 * Rough estimation of token count
 * Approximation: 1 token ≈ 4 characters
 */
function estimateTokenCount(report: AuditReport): number {
  const jsonString = JSON.stringify(report);
  return Math.ceil(jsonString.length / 4);
}

/**
 * Suggested questions for the user
 */
export const SUGGESTED_QUESTIONS = [
  "What should I fix first to improve my SEO score?",
  "Why is my performance score low?",
  "How can I improve my technical SEO?",
  "What are the most critical issues I should address?",
  "Can you explain the meta description issues?",
  "How do I improve my page load time?",
  "What are the easiest wins I can implement today?",
  "How does my site compare to SEO best practices?",
];
