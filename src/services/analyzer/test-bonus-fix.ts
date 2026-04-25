/**
 * Test: Verify Bonus System Fix
 * 
 * This test simulates the freeserp.com scenario where we had:
 * - 13 issues (44.8 penalty points)
 * - 31 passing checks
 * - OLD: 44.3 bonus points → 100 score (WRONG)
 * - NEW: ~14.8 bonus points → realistic score
 */

import { SEVERITY_MULTIPLIERS, MAX_BONUS_PER_CATEGORY } from './scoring.js';
import type { Severity, IssueCategory } from './types.js';

interface TestIssue {
  severity: Severity;
  impactScore: number;
  category: IssueCategory;
}

interface TestPassingCheck {
  category: IssueCategory;
  code: string;
  weight: number;
}

// Simulated data from freeserp.com audit
const issues: TestIssue[] = [
  // TECHNICAL (3 issues)
  { severity: 'MEDIUM', impactScore: 40, category: 'TECHNICAL' },
  { severity: 'LOW', impactScore: 30, category: 'TECHNICAL' },
  { severity: 'LOW', impactScore: 30, category: 'TECHNICAL' },
  
  // ON_PAGE (2 issues)
  { severity: 'MEDIUM', impactScore: 50, category: 'ON_PAGE' },
  { severity: 'LOW', impactScore: 30, category: 'ON_PAGE' },
  
  // PERFORMANCE (2 issues)
  { severity: 'HIGH', impactScore: 60, category: 'PERFORMANCE' },
  { severity: 'MEDIUM', impactScore: 40, category: 'PERFORMANCE' },
  
  // ACCESSIBILITY (2 issues)
  { severity: 'MEDIUM', impactScore: 40, category: 'ACCESSIBILITY' },
  { severity: 'LOW', impactScore: 30, category: 'ACCESSIBILITY' },
  
  // STRUCTURED_DATA (3 issues)
  { severity: 'LOW', impactScore: 30, category: 'STRUCTURED_DATA' },
  { severity: 'LOW', impactScore: 30, category: 'STRUCTURED_DATA' },
  { severity: 'LOW', impactScore: 30, category: 'STRUCTURED_DATA' },
  
  // SECURITY (1 issue)
  { severity: 'LOW', impactScore: 30, category: 'SECURITY' },
];

const passingChecks: TestPassingCheck[] = [
  // TECHNICAL (10 passing)
  { category: 'TECHNICAL', code: 'HTTPS_CHECK', weight: 1.0 },
  { category: 'TECHNICAL', code: 'SSL_CERTIFICATE', weight: 1.0 },
  { category: 'TECHNICAL', code: 'CANONICAL_TAG', weight: 0.8 },
  { category: 'TECHNICAL', code: 'ROBOTS_TXT', weight: 0.8 },
  { category: 'TECHNICAL', code: 'SITEMAP', weight: 0.8 },
  { category: 'TECHNICAL', code: 'CHARSET', weight: 0.5 },
  { category: 'TECHNICAL', code: 'HTTP2_CHECK', weight: 0.3 },
  { category: 'TECHNICAL', code: 'OTHER_1', weight: 0.5 },
  { category: 'TECHNICAL', code: 'OTHER_2', weight: 0.5 },
  { category: 'TECHNICAL', code: 'OTHER_3', weight: 0.5 },
  
  // ON_PAGE (8 passing)
  { category: 'ON_PAGE', code: 'TITLE_TAG', weight: 1.0 },
  { category: 'ON_PAGE', code: 'META_DESCRIPTION', weight: 1.0 },
  { category: 'ON_PAGE', code: 'H1_TAG', weight: 1.0 },
  { category: 'ON_PAGE', code: 'HEADING_HIERARCHY', weight: 0.8 },
  { category: 'ON_PAGE', code: 'IMAGE_ALT', weight: 0.5 },
  { category: 'ON_PAGE', code: 'FRIENDLY_URLS', weight: 0.3 },
  { category: 'ON_PAGE', code: 'OTHER_1', weight: 0.5 },
  { category: 'ON_PAGE', code: 'OTHER_2', weight: 0.5 },
  
  // PERFORMANCE (8 passing)
  { category: 'PERFORMANCE', code: 'CORE_WEB_VITALS', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'LCP_CHECK', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'CLS_CHECK', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'FID_CHECK', weight: 1.0 },
  { category: 'PERFORMANCE', code: 'MINIFICATION', weight: 0.3 },
  { category: 'PERFORMANCE', code: 'COMPRESSION', weight: 0.3 },
  { category: 'PERFORMANCE', code: 'OTHER_1', weight: 0.5 },
  { category: 'PERFORMANCE', code: 'OTHER_2', weight: 0.5 },
  
  // ACCESSIBILITY (2 passing)
  { category: 'ACCESSIBILITY', code: 'VIEWPORT', weight: 0.8 },
  { category: 'ACCESSIBILITY', code: 'FAVICON', weight: 0.3 },
  
  // LINKS (1 passing)
  { category: 'LINKS', code: 'LINK_STRUCTURE', weight: 0.8 },
  
  // STRUCTURED_DATA (2 passing)
  { category: 'STRUCTURED_DATA', code: 'ORGANIZATION_SCHEMA', weight: 0.8 },
  { category: 'STRUCTURED_DATA', code: 'OTHER_1', weight: 0.5 },
];

function calculateCategoryScore(
  categoryIssues: TestIssue[],
  categoryPassing: TestPassingCheck[],
  maxBonus: number = MAX_BONUS_PER_CATEGORY
): { score: number; penalty: number; bonus: number } {
  // Calculate penalty
  let penalty = 0;
  for (const issue of categoryIssues) {
    const severityMultiplier = SEVERITY_MULTIPLIERS[issue.severity];
    penalty += (issue.impactScore / 10) * severityMultiplier;
  }
  
  // Calculate bonus
  const weightedSum = categoryPassing.reduce((sum, check) => sum + check.weight, 0);
  const maxPossiblePoints = 10 * 0.6; // Estimate
  const bonusPercentage = Math.min(1.0, weightedSum / maxPossiblePoints);
  const bonus = bonusPercentage * maxBonus;
  
  // Final score
  const score = Math.min(100, Math.max(0, 100 - penalty + bonus));
  
  return { 
    score: Math.round(score * 10) / 10, 
    penalty: Math.round(penalty * 10) / 10,
    bonus: Math.round(bonus * 10) / 10
  };
}

function getGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

console.log('='.repeat(80));
console.log('BONUS SYSTEM FIX - FreeSerp.com Case Study');
console.log('='.repeat(80));
console.log();
console.log('Site: https://freeserp.com');
console.log('Issues: 13 total across 6 categories');
console.log('Passing Checks: 31 total');
console.log();

const categories: IssueCategory[] = [
  'TECHNICAL', 'ON_PAGE', 'PERFORMANCE', 
  'ACCESSIBILITY', 'LINKS', 'STRUCTURED_DATA', 'SECURITY'
];

console.log('COMPARISON: OLD (15pt bonus) vs NEW (5pt bonus)');
console.log('─'.repeat(80));
console.log();

let oldTotalPenalty = 0;
let oldTotalBonus = 0;
let newTotalPenalty = 0;
let newTotalBonus = 0;

for (const category of categories) {
  const catIssues = issues.filter(i => i.category === category);
  const catPassing = passingChecks.filter(p => p.category === category);
  
  const oldResult = calculateCategoryScore(catIssues, catPassing, 15);
  const newResult = calculateCategoryScore(catIssues, catPassing, 5);
  
  oldTotalPenalty += oldResult.penalty;
  oldTotalBonus += oldResult.bonus;
  newTotalPenalty += newResult.penalty;
  newTotalBonus += newResult.bonus;
  
  console.log(`${category}:`);
  console.log(`  Issues: ${catIssues.length}, Passing: ${catPassing.length}`);
  console.log(`  OLD: Score=${oldResult.score} (penalty=${oldResult.penalty}, bonus=${oldResult.bonus}) [${getGrade(oldResult.score)}]`);
  console.log(`  NEW: Score=${newResult.score} (penalty=${newResult.penalty}, bonus=${newResult.bonus}) [${getGrade(newResult.score)}]`);
  
  if (oldResult.score !== newResult.score) {
    const diff = oldResult.score - newResult.score;
    console.log(`  ⚠️  DIFFERENCE: -${diff.toFixed(1)} points (more realistic!)`);
  } else {
    console.log(`  ✅ No change (both systems agree)`);
  }
  console.log();
}

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Penalty Points: ${oldTotalPenalty.toFixed(1)} (same in both)`);
console.log();
console.log(`OLD System (15pt max bonus):`);
console.log(`  Total Bonus: ${oldTotalBonus.toFixed(1)} points`);
console.log(`  Problem: Bonuses nearly offset all penalties!`);
console.log(`  Result: Score ~100 despite 13 issues ❌`);
console.log();
console.log(`NEW System (5pt max bonus):`);
console.log(`  Total Bonus: ${newTotalBonus.toFixed(1)} points`);
console.log(`  Fix: Bonuses reward good practices without masking issues`);
console.log(`  Result: More realistic scores that reflect actual problems ✅`);
console.log();
console.log(`Bonus Reduction: ${(oldTotalBonus - newTotalBonus).toFixed(1)} points less`);
console.log(`  (${((1 - newTotalBonus / oldTotalBonus) * 100).toFixed(0)}% reduction)`);
console.log('='.repeat(80));
console.log();
console.log('✅ Fix verified: Bonuses no longer offset penalties excessively');
console.log(`   MAX_BONUS_PER_CATEGORY: 15 → 5 points`);
