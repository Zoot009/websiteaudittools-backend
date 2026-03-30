# SEO Audit Rule Engine

A production-minded, modular SEO audit engine implementing 20+ core rules based on industry best practices.

## Architecture

The rule engine follows a **separation of concerns** design:

```
services/analyzer/
├── types.ts                    # Core type definitions
├── SeoAnalyzer.ts             # Main entry point (refactored)
├── ruleEngine.ts              # Rule execution engine
├── ruleRegistry.ts            # Rule registration and management
├── siteContextBuilder.ts      # Cross-page analysis context
└── rules/                     # Individual rule modules
    ├── crawlability/
    ├── titles/
    ├── meta-descriptions/
    ├── headings/
    ├── content/
    ├── links/
    ├── images/
    ├── technical/
    ├── structured-data/
    └── security/
```

## Key Design Principles

### 1. **Detection Separated from Recommendation**

Each rule performs pure detection logic and optionally provides actionable fix recommendations:

```typescript
interface AuditRule {
  code: string;                    // Unique identifier (e.g., "TITLE_MISSING")
  name: string;                    // Human-readable name
  category: IssueCategory;         // TECHNICAL | ON_PAGE | etc.
  severity: Severity;              // CRITICAL | HIGH | MEDIUM | LOW
  run: (context) => SeoIssue[];   // Pure detection logic
  getRecommendation?: (issue, context) => FixRecommendation;  // Optional fix guide
}
```

### 2. **Independent, Testable Modules**

Each rule is a self-contained module that can be:
- Added or removed independently
- Tested in isolation
- Versioned separately
- Enabled/disabled dynamically

### 3. **Site-Wide Context**

Rules have access to both **single-page data** and **cross-page context**:

```typescript
interface RuleContext {
  page: PageData;           // Current page being analyzed
  siteContext: SiteContext; // Aggregate site-wide data
}

interface SiteContext {
  baseUrl: string;
  allPages: PageData[];
  titleMap: Map<string, string[]>;        // Duplicate detection
  descriptionMap: Map<string, string[]>;
  canonicalMap: Map<string, string[]>;
  internalLinkGraph: Map<string, Set<string>>;
  inboundLinkCount: Map<string, number>;
}
```

This enables detection of:
- Duplicate titles/descriptions across pages
- Broken internal links
- Orphan pages
- Canonical conflicts

## Implemented Rules (20 Core Rules)

### 🔴 **Critical Severity**

#### Crawlability & Indexability
1. **PAGE_NON_200_STATUS** - Page returns 4xx/5xx error
2. **PAGE_NOINDEX** - Page marked with noindex
3. **CANONICAL_POINTS_ELSEWHERE** - Canonical points to different page
4. **NO_HTTPS** - Site not using HTTPS

#### On-Page SEO
5. **TITLE_MISSING** - No title tag
6. **TITLE_DUPLICATE** - Multiple pages share same title

---

### 🟠 **High Severity**

7. **PAGE_REDIRECTS** - Important page redirects
8. **H1_MISSING** - No H1 heading
9. **MISSING_VIEWPORT** - No mobile viewport meta tag
10. **BROKEN_INTERNAL_LINKS** - Links to error pages

---

### 🟡 **Medium Severity**

#### Content & Structure
11. **CANONICAL_MISSING** - No canonical tag
12. **TITLE_TOO_SHORT** - Title under 20 characters
13. **TITLE_TOO_LONG** - Title over 60 characters
14. **META_DESCRIPTION_MISSING** - No meta description
15. **META_DESCRIPTION_DUPLICATE** - Duplicate descriptions
16. **H1_MULTIPLE** - Multiple H1 tags
17. **H1_EMPTY_OR_GENERIC** - Generic/empty H1 content
18. **THIN_CONTENT** - Page under 300 words
19. **MISSING_ALT_TEXT** - Images without alt text

#### Performance
20. **SLOW_LOAD_TIME** - Page loads > 3 seconds
21. **PAGE_TOO_HEAVY** - HTML > 1MB

---

### 🟢 **Low Severity**

22. **META_DESCRIPTION_TOO_SHORT** - Description under 70 characters
23. **META_DESCRIPTION_TOO_LONG** - Description over 160 characters
24. **NO_STRUCTURED_DATA** - No Schema.org markup
25. **MISSING_OPEN_GRAPH** - No OG tags for social

## Usage

### Basic Analysis

```typescript
import { SeoAnalyzer } from './services/analyzer/SeoAnalyzer';

const analyzer = new SeoAnalyzer();
const result = await analyzer.analyze(pages, baseUrl);

console.log(`Overall Score: ${result.overallScore}/100`);
console.log(`Total Issues: ${result.totalIssues}`);
console.log(`Critical Issues: ${result.criticalIssues}`);
```

### With Recommendations

```typescript
const result = await analyzer.analyze(pages, baseUrl);

// Issues with fix recommendations
result.issuesWithFixes.forEach(issue => {
  console.log(`Issue: ${issue.title}`);
  console.log(`Why it matters: ${issue.recommendation.whyItMatters}`);
  console.log(`How to fix:`);
  issue.recommendation.howToFix.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
});
```

### Adding Custom Rules

```typescript
import { ruleRegistry } from './services/analyzer/ruleRegistry';

const customRule: AuditRule = {
  code: 'CUSTOM_CHECK',
  name: 'My Custom Check',
  category: 'TECHNICAL',
  severity: 'MEDIUM',
  
  run: (context) => {
    const issues: SeoIssue[] = [];
    // Your custom logic here
    return issues;
  },
  
  getRecommendation: (issue, context) => ({
    title: 'Fix this custom issue',
    whyItMatters: 'Because...',
    howToFix: ['Step 1', 'Step 2'],
    estimatedEffort: 'low',
    priority: 5,
  }),
};

ruleRegistry.addRule(customRule);
```

### Rule Management

```typescript
import { ruleRegistry } from './services/analyzer/ruleRegistry';

// Get all rules
const allRules = ruleRegistry.getAllRules();

// Filter by category
const technicalRules = ruleRegistry.getRulesByCategory('TECHNICAL');

// Filter by severity
const criticalRules = ruleRegistry.getRulesBySeverity('CRITICAL');

// Get specific rule
const rule = ruleRegistry.getRuleByCode('TITLE_MISSING');

// Remove a rule
ruleRegistry.removeRule('SOME_RULE_CODE');
```

## Scoring Algorithm

### Category Scores

Each category score is calculated as:
```
score = 100 - (average impact score of issues in category)
```

### Overall Score

Weighted average of category scores:

| Category | Weight |
|----------|--------|
| Technical | 20% |
| On-Page | 25%  |
| Performance | 20% |
| Accessibility | 15% |
| Links | 10% |
| Structured Data | 5% |
| Security | 5% |

## Rule Severity Guide

### CRITICAL (Must fix ASAP)
- Prevents indexing entirely
- Major security issues
- Widespread site failures

**Examples:** noindex on important pages, no HTTPS, 5xx errors

### HIGH (Important, affects ranking)
- Directly impacts rankings
- Major UX issues
- Missing critical elements

**Examples:** missing titles, broken links, missing H1

### MEDIUM (Should fix, minor impact)
- Reduces effectiveness
- Missed optimization opportunities
- Minor structural issues

**Examples:** missing meta descriptions, duplicate titles, thin content

### LOW (Nice to have, minimal impact)
- Polish and completeness
- Advanced optimizations
- Social/sharing enhancements

**Examples:** missing OG tags, short descriptions, missing structured data

## Best Practices for Rule Development

### 1. **Keep Rules Simple**
Each rule should check ONE thing. Don't combine multiple checks.

❌ Bad:
```typescript
// Checks both title AND description
run: (context) => {
  if (!context.page.title) { /* ... */ }
  if (!context.page.description) { /* ... */ }
}
```

✅ Good:
```typescript
// Separate rules
titleMissingRule
metaDescriptionMissingRule
```

### 2. **Provide Clear, Actionable Recommendations**

❌ Bad:
```typescript
howToFix: ['Fix your title tag']
```

✅ Good:
```typescript
howToFix: [
  'Write a unique title for this page.',
  'Keep it around 50-60 characters.',
  'Include the main topic or keyword naturally.',
  'Make it compelling to encourage clicks.'
]
```

### 3. **Use Appropriate Impact Scores**

- **90-100**: Critical issues that prevent indexing
- **70-89**: High-impact ranking factors
- **50-69**: Medium-impact optimizations
- **20-49**: Minor improvements
- **0-19**: Nice-to-have polish

### 4. **Handle Edge Cases**

Always validate input:
```typescript
run: (context) => {
  const issues: SeoIssue[] = [];
  
  // Guard clause
  if (!context.page.title) {
    issues.push(/* ... */);
    return issues;
  }
  
  // Further checks...
  if (context.page.title.length < 20) {
    issues.push(/* ... */);
  }
  
  return issues;
}
```

### 5. **Consider Site Context**

For duplicate detection:
```typescript
run: (context) => {
  const { page, siteContext } = context;
  
  if (page.title) {
    const pagesWithSameTitle = siteContext.titleMap.get(page.title) || [];
    
    if (pagesWithSameTitle.length > 1) {
      // Report duplicate
    }
  }
}
```

## Testing Rules

Each rule can be tested independently:

```typescript
import { titleMissingRule } from './rules/titles';

const mockContext: RuleContext = {
  page: {
    url: 'https://example.com',
    title: null,  // Test missing title
    // ... other fields
  },
  siteContext: {
    // ... mock site context
  },
};

const issues = titleMissingRule.run(mockContext);

expect(issues).toHaveLength(1);
expect(issues[0].type).toBe('title_missing');
expect(issues[0].severity).toBe('HIGH');
```

## Future Enhancements

### Planned Rules
- robots.txt blocking detection
- sitemap validation
- conflicting index signals
- mixed content detection
- raw vs rendered content gap
- URL parameter issues
- redirect chains
- orphan page detection

### Engine Improvements
- Rule versioning system
- A/B testing for rule effectiveness
- Machine learning for impact score calibration
- Real-time rule updates
- Performance profiling per rule
- Configurable rule weights

## Migration from Old System

The old monolithic `SeoAnalyzer` has been refactored:

### Before:
```typescript
async analyze(pages: PageData[]): Promise<AnalysisResult> {
  // 500 lines of checks in one method
  this.checkTechnicalSeo();
  this.checkOnPageSeo();
  // ...
}
```

### After:
```typescript
async analyze(pages: PageData[], baseUrl: string): Promise<AnalysisResult> {
  return await ruleEngine.runAnalysis(pages, baseUrl);
}
```

**Benefits:**
- ✅ Cleaner, more maintainable code
- ✅ Easy to add/remove rules
- ✅ Better testability
- ✅ Reusable rules
- ✅ Clear separation of concerns
- ✅ Site-wide analysis capabilities

## Contributing

To add a new rule:

1. Create a new file in the appropriate rules category
2. Define your rule following the `AuditRule` interface
3. Export the rule from your file
4. Register it in `ruleRegistry.ts`
5. Add tests
6. Update this documentation

Example PR checklist:
- [ ] Rule follows single responsibility principle
- [ ] Includes clear, actionable recommendations
- [ ] Has appropriate severity and impact score
- [ ] Includes unit tests
- [ ] Documentation updated
- [ ] Edge cases handled

## Support

For questions or issues with the rule engine, check:
- `types.ts` - Core interfaces
- `ruleRegistry.ts` - Rule management
- `ruleEngine.ts` - Execution logic

---

**Built with production SEO best practices in mind** 🚀
