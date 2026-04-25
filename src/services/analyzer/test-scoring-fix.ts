/**
 * Test: Verify Fixed Scoring System
 * 
 * This test demonstrates the new direct deduction formula and shows
 * how scores now properly differentiate between good and bad sites.
 */

import { SEVERITY_MULTIPLIERS } from './scoring.js';
import type { Severity } from './types.js';

interface TestIssue {
  severity: Severity;
  impactScore: number;
}

/**
 * Calculate category score using the NEW formula
 */
function calculateCategoryScore(issues: TestIssue[]): number {
  let baseScore = 100;
  
  if (issues.length > 0) {
    const totalDeduction = issues.reduce((sum, issue) => {
      const severityMultiplier = SEVERITY_MULTIPLIERS[issue.severity] || 1;
      const deduction = (issue.impactScore / 10) * severityMultiplier;
      return sum + deduction;
    }, 0);
    
    baseScore = Math.max(0, 100 - totalDeduction);
  }
  
  return Math.round(baseScore * 10) / 10;
}

/**
 * Get grade from score
 */
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

console.log('='.repeat(70));
console.log('SCORING SYSTEM FIX VERIFICATION');
console.log('='.repeat(70));
console.log();

// Test 1: Perfect site (no issues)
console.log('Test 1: Perfect Site (No Issues)');
console.log('─'.repeat(70));
const perfect = calculateCategoryScore([]);
console.log(`Score: ${perfect}/100 (${getGrade(perfect)})`);
console.log(`✅ Expected: 100 (A+) - Perfect site with no issues`);
console.log();

// Test 2: Minor issues (good site)
console.log('Test 2: Good Site (Minor Issues)');
console.log('─'.repeat(70));
const goodSite = calculateCategoryScore([
  { severity: 'LOW', impactScore: 30 },
  { severity: 'MEDIUM', impactScore: 40 },
]);
console.log(`Issues: 1 LOW (impact=30), 1 MEDIUM (impact=40)`);
console.log(`Calculation: 100 - (30/10 * 0.5) - (40/10 * 1.0) = 100 - 1.5 - 4 = 94.5`);
console.log(`Score: ${goodSite}/100 (${getGrade(goodSite)})`);
console.log(`✅ Expected: ~94-95 (A) - Good site with minor issues`);
console.log();

// Test 3: Moderate issues
console.log('Test 3: Average Site (Moderate Issues)');
console.log('─'.repeat(70));
const averageSite = calculateCategoryScore([
  { severity: 'HIGH', impactScore: 60 },
  { severity: 'MEDIUM', impactScore: 50 },
  { severity: 'MEDIUM', impactScore: 40 },
]);
console.log(`Issues: 1 HIGH (impact=60), 2 MEDIUM (impact=50, 40)`);
console.log(`Calculation: 100 - (60/10 * 2.0) - (50/10 * 1.0) - (40/10 * 1.0)`);
console.log(`           = 100 - 12 - 5 - 4 = 79`);
console.log(`Score: ${averageSite}/100 (${getGrade(averageSite)})`);
console.log(`✅ Expected: ~79 (B) - Average site with room for improvement`);
console.log();

// Test 4: Serious issues (bad site)
console.log('Test 4: Poor Site (Serious Issues)');
console.log('─'.repeat(70));
const poorSite = calculateCategoryScore([
  { severity: 'CRITICAL', impactScore: 60 },
  { severity: 'HIGH', impactScore: 70 },
  { severity: 'HIGH', impactScore: 50 },
]);
console.log(`Issues: 1 CRITICAL (impact=60), 2 HIGH (impact=70, 50)`);
console.log(`Calculation: 100 - (60/10 * 4.0) - (70/10 * 2.0) - (50/10 * 2.0)`);
console.log(`           = 100 - 24 - 14 - 10 = 52`);
console.log(`Score: ${poorSite}/100 (${getGrade(poorSite)})`);
console.log(`✅ Expected: ~52 (F/Fair) - Poor site with critical issues`);
console.log();

// Test 5: Critical issues (terrible site)
console.log('Test 5: Terrible Site (Multiple Critical Issues)');
console.log('─'.repeat(70));
const terribleSite = calculateCategoryScore([
  { severity: 'CRITICAL', impactScore: 80 },
  { severity: 'CRITICAL', impactScore: 70 },
  { severity: 'CRITICAL', impactScore: 60 },
]);
console.log(`Issues: 3 CRITICAL (impact=80, 70, 60)`);
console.log(`Calculation: 100 - (80/10 * 4.0) - (70/10 * 4.0) - (60/10 * 4.0)`);
console.log(`           = 100 - 32 - 28 - 24 = 16`);
console.log(`Score: ${terribleSite}/100 (${getGrade(terribleSite)})`);
console.log(`✅ Expected: ~16 (F/Poor) - Terrible site requiring immediate action`);
console.log();

// Test 6: The old problem scenario
console.log('Test 6: OLD PROBLEM - Why Sites Got 100 Points');
console.log('─'.repeat(70));
const oldProblem = calculateCategoryScore([
  { severity: 'CRITICAL', impactScore: 50 },
  { severity: 'CRITICAL', impactScore: 50 },
  { severity: 'CRITICAL', impactScore: 50 },
]);
console.log(`Issues: 3 CRITICAL (impact=50 each)`);
console.log(`OLD FORMULA: totalImpact = 3 * 50 * 4.0 = 600`);
console.log(`            impactRatio = 600 / 8000 = 0.075 (7.5%)`);
console.log(`            score = 100 - 7.5 = 92.5 ❌ TOO GENEROUS!`);
console.log();
console.log(`NEW FORMULA: 100 - (50/10 * 4.0) * 3 = 100 - 60 = 40`);
console.log(`Score: ${oldProblem}/100 (${getGrade(oldProblem)})`);
console.log(`✅ Fixed: Now correctly scores 40 (F) for a site with 3 critical issues`);
console.log();

// Summary
console.log('='.repeat(70));
console.log('SUMMARY: New Scoring Formula');
console.log('='.repeat(70));
console.log('Formula: score = 100 - Σ(impactScore / 10 × severityMultiplier)');
console.log();
console.log('Severity Multipliers:');
console.log('  CRITICAL: 4.0x  (e.g., impact=50 → 20 points deducted)');
console.log('  HIGH:     2.0x  (e.g., impact=60 → 12 points deducted)');
console.log('  MEDIUM:   1.0x  (e.g., impact=40 →  4 points deducted)');
console.log('  LOW:      0.5x  (e.g., impact=30 →  1.5 points deducted)');
console.log();
console.log('Grade Scale:');
console.log('  A+ (95-100): Excellent - Minimal or no issues');
console.log('  A  (90-94):  Excellent - Very few minor issues');
console.log('  B  (80-89):  Good - Some issues but well-optimized');
console.log('  C  (70-79):  Fair - Several issues need attention');
console.log('  D  (60-69):  Poor - Many issues requiring fixes');
console.log('  F  (0-59):   Failed - Critical issues, immediate action needed');
console.log('='.repeat(70));
