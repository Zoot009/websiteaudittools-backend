/**
 * Simple test to verify new rules are registered
 */

import { ruleRegistry } from './ruleRegistry';

console.log('🧪 Checking if new SEOptimizer rules are registered...\n');

const allRules = ruleRegistry.getAllRules();

console.log(`Total rules registered: ${allRules.length}`);

const newRuleCodes = [
  'KEYWORD_CONSISTENCY',
  'HEADING_STRUCTURE',
  'WORD_COUNT',
  'LINK_STRUCTURE',
  'MOBILE_VIEWPORT',
  'ROBOTS_TXT',
  'XML_SITEMAP',
  'FAVICON',
  'HTTP2_PROTOCOL',
];

console.log('\n✅ Checking for new rules:');
newRuleCodes.forEach(code => {
  const found = allRules.find(r => r.code === code);
  if (found) {
    console.log(`  ✓ ${code} - ${found.name}`);
  } else {
    console.log(`  ✗ ${code} - NOT FOUND`);
  }
});

console.log('\n📊 Rules by category:');
const byCategory = allRules.reduce((acc, rule) => {
  acc[rule.category] = (acc[rule.category] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

Object.entries(byCategory).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} rules`);
});

console.log('\n✅ Rule registration check complete!');
