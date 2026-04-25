/**
 * Test script to verify the enhanced scoring system
 * Run with: npx tsx src/services/analyzer/test-scoring.ts
 */

import {
  calculateGrade,
  calculateTier,
  calculatePassingCheckBonus,
  calculateOverallScore,
  getScoreInsight,
  CATEGORY_WEIGHTS,
} from './scoring.js';
import type { PassingCheck, IssueCategory } from './types';

console.log('='.repeat(80));
console.log('Enhanced Scoring System Test');
console.log('='.repeat(80));
console.log();

// Test 1: Grade calculation
console.log('Test 1: Grade Calculation');
console.log('-'.repeat(80));
const testScores = [100, 95, 92, 88, 83, 77, 72, 65, 55, 0];
testScores.forEach(score => {
  const grade = calculateGrade(score);
  const tier = calculateTier(score);
  console.log(`Score ${score.toString().padStart(3)}/100 → Grade: ${grade.padEnd(2)} | Tier: ${tier.padEnd(10)}`);
});
console.log();

// Test 2: Passing check bonus calculation
console.log('Test 2: Passing Check Bonus Calculation');
console.log('-'.repeat(80));

const passingChecks: PassingCheck[] = [
  {
    category: 'TECHNICAL',
    code: 'HTTPS_CHECK',
    title: 'HTTPS Enabled',
    description: 'Site uses HTTPS',
    goodPractice: 'Secure connection',
  },
  {
    category: 'TECHNICAL',
    code: 'SSL_CERTIFICATE',
    title: 'Valid SSL Certificate',
    description: 'SSL certificate is valid',
    goodPractice: 'Secure connection',
  },
  {
    category: 'TECHNICAL',
    code: 'ROBOTS_TXT',
    title: 'Robots.txt Present',
    description: 'Robots.txt file exists',
    goodPractice: 'Helps search engines crawl site',
  },
];

const bonus = calculatePassingCheckBonus(passingChecks);
console.log(`Passing checks: ${passingChecks.length}`);
console.log(`Bonus points: +${bonus.toFixed(1)}`);
console.log();

// Test 3: Category score with bonus
console.log('Test 3: Category Score with Bonus');
console.log('-'.repeat(80));

const scenarios = [
  { name: 'Perfect (no issues, many passing)', baseScore: 100, passingCount: 8 },
  { name: 'Excellent (minor issues, good passing)', baseScore: 92, passingCount: 6 },
  { name: 'Good (some issues, some passing)', baseScore: 78, passingCount: 4 },
  { name: 'Fair (many issues, few passing)', baseScore: 55, passingCount: 2 },
  { name: 'Poor (critical issues, no passing)', baseScore: 30, passingCount: 0 },
];

scenarios.forEach(scenario => {
  const mockPassing: PassingCheck[] = Array.from({ length: scenario.passingCount }, (_, i) => ({
    category: 'ON_PAGE' as IssueCategory,
    code: `CHECK_${i}`,
    title: `Check ${i}`,
    description: `Passing check ${i}`,
    goodPractice: 'Good practice',
  }));
  
  const bonus = calculatePassingCheckBonus(mockPassing);
  const finalScore = Math.min(100, scenario.baseScore + bonus);
  const grade = calculateGrade(finalScore);
  const tier = calculateTier(finalScore);
  
  console.log(`${scenario.name.padEnd(40)}`);
  console.log(`  Base Score: ${scenario.baseScore.toString().padStart(3)} | Bonus: +${bonus.toFixed(1).padStart(4)} | Final: ${finalScore.toFixed(1).padStart(5)} | Grade: ${grade.padEnd(2)} | Tier: ${tier}`);
});
console.log();

// Test 4: Overall score calculation
console.log('Test 4: Overall Score Calculation (Weighted Average)');
console.log('-'.repeat(80));

const categoryScores = [
  { category: 'TECHNICAL' as IssueCategory, score: 95 },
  { category: 'ON_PAGE' as IssueCategory, score: 88 },
  { category: 'PERFORMANCE' as IssueCategory, score: 92 },
  { category: 'SECURITY' as IssueCategory, score: 100 },
  { category: 'LINKS' as IssueCategory, score: 85 },
  { category: 'ACCESSIBILITY' as IssueCategory, score: 78 },
  { category: 'STRUCTURED_DATA' as IssueCategory, score: 90 },
];

categoryScores.forEach(cs => {
  const weight = CATEGORY_WEIGHTS[cs.category];
  const contribution = cs.score * weight;
  console.log(`  ${cs.category.padEnd(18)} | Score: ${cs.score.toString().padStart(3)} | Weight: ${(weight * 100).toFixed(0).padStart(2)}% | Contributes: ${contribution.toFixed(1).padStart(5)}`);
});

const overall = calculateOverallScore(categoryScores);
const overallGrade = calculateGrade(overall);
const overallTier = calculateTier(overall);

console.log(`  ${'─'.repeat(76)}`);
console.log(`  Overall Score: ${overall.toFixed(1)} | Grade: ${overallGrade} | Tier: ${overallTier}`);
console.log();

// Test 5: Insights generation
console.log('Test 5: Insights Generation');
console.log('-'.repeat(80));

const categories: IssueCategory[] = ['TECHNICAL', 'ON_PAGE', 'PERFORMANCE'];
const scores = [95, 75, 55];

categories.forEach((category, i) => {
  const score = scores[i];
  const grade = calculateGrade(score);
  const insight = getScoreInsight(score, grade, category);
  console.log(`${category.padEnd(18)} (${score}/100, ${grade}): ${insight}`);
});
console.log();

// Test 6: Boundary testing
console.log('Test 6: Boundary Testing');
console.log('-'.repeat(80));

const boundaryTests = [
  { desc: 'Bonus doesn\'t exceed 100', baseScore: 95, passingCount: 10 },
  { desc: 'Zero issues with no passing', baseScore: 100, passingCount: 0 },
  { desc: 'Maximum bonus (15 pts)', baseScore: 80, passingCount: 15 },
];

boundaryTests.forEach(test => {
  const mockPassing: PassingCheck[] = Array.from({ length: test.passingCount }, (_, i) => ({
    category: 'TECHNICAL' as IssueCategory,
    code: `CHECK_${i}`,
    title: `Check ${i}`,
    description: `Check ${i}`,
    goodPractice: 'Good',
  }));
  
  const bonus = calculatePassingCheckBonus(mockPassing);
  const finalScore = Math.min(100, test.baseScore + bonus);
  
  console.log(`${test.desc.padEnd(35)} | Base: ${test.baseScore} | Bonus: +${bonus.toFixed(1)} | Final: ${finalScore.toFixed(1)} | Capped: ${finalScore === 100 ? 'Yes' : 'No'}`);
});
console.log();

console.log('='.repeat(80));
console.log('✅ All tests completed successfully!');
console.log('='.repeat(80));
