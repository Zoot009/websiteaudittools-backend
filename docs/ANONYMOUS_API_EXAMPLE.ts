/**
 * Example: Using the Enhanced Anonymous Audit API
 * 
 * This demonstrates how to use the updated /api/audits/anonymous endpoint
 * with the new scoring system including grades, tiers, and bonus points.
 */

// Step 1: Start an anonymous audit
// POST /api/audits/anonymous
const startAudit = async (url: string) => {
  const response = await fetch('http://localhost:3000/api/audits/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  
  const data = await response.json();
  console.log('Audit started:', data);
  // Returns: { jobId: "123", message: "...", url: "...", mode: "single", anonymous: true }
  
  return data.jobId;
};

// Step 2: Poll job status (basic - shows returnvalue with enhanced scoring)
// GET /api/audits/jobs/:jobId
const checkJobStatus = async (jobId: string) => {
  const response = await fetch(`http://localhost:3000/api/audits/jobs/${jobId}`);
  const data = await response.json();
  
  console.log('Job status:', data.state);
  console.log('Progress:', data.progress);
  
  if (data.state === 'completed' && data.returnvalue) {
    console.log('Enhanced Scoring Summary:');
    console.log('- Overall Score:', data.returnvalue.overallScore, data.returnvalue.overallGrade, data.returnvalue.overallTier);
    console.log('- Issues Found:', data.returnvalue.issuesFound);
    console.log('- Passing Checks:', data.returnvalue.passingChecks);
    console.log('- Category Scores:', data.returnvalue.categoryScores);
    
    // returnvalue includes:
    // {
    //   success: true,
    //   auditReportId: "abc123",
    //   overallScore: 87.3,
    //   overallGrade: "B+",
    //   overallTier: "Good",
    //   issuesFound: 12,
    //   passingChecks: 45,
    //   pagesAnalyzed: 5,
    //   categoryScores: [
    //     {
    //       category: "TECHNICAL",
    //       score: 95.5,
    //       grade: "A+",
    //       tier: "Excellent",
    //       issueCount: 2,
    //       passingCount: 8,
    //       bonus: 12.3
    //     },
    //     // ... other categories
    //   ],
    //   scoreSummary: {
    //     overall: { score: 87.3, grade: "B+", tier: "Good" },
    //     categories: [...],
    //     statistics: {
    //       totalIssues: 12,
    //       totalPassing: 45,
    //       penaltyPoints: 34.2,
    //       bonusPoints: 67.5,
    //       pagesAnalyzed: 5
    //     },
    //     insights: {
    //       overall: "Good work! Your site has a solid SEO foundation...",
    //       categories: [...],
    //       recommendations: [...]
    //     }
    //   }
    // }
  }
  
  return data;
};

// Step 3: Get full results with enhanced scoring (NEW ENDPOINT!)
// GET /api/audits/anonymous/:jobId/results
const getFullResults = async (jobId: string) => {
  const response = await fetch(`http://localhost:3000/api/audits/anonymous/${jobId}/results`);
  
  if (response.status === 202) {
    // Job still in progress
    const data = await response.json();
    console.log('Status:', data.status, '-', data.message);
    console.log('Progress:', data.progress);
    return null;
  }
  
  const results = await response.json();
  
  // Full results structure:
  console.log('=== AUDIT RESULTS ===');
  console.log('URL:', results.url);
  console.log('Pages Analyzed:', results.pagesAnalyzed);
  
  // Enhanced scoring with grades and tiers
  console.log('\n=== OVERALL SCORING ===');
  console.log('Score:', results.scoring.overall.score);
  console.log('Grade:', results.scoring.overall.grade);
  console.log('Tier:', results.scoring.overall.tier);
  
  console.log('\n=== CATEGORY SCORES ===');
  Object.entries(results.scoring.categories).forEach(([category, score]: [string, any]) => {
    console.log(`${category}:`, score.score, score.grade, score.tier);
  });
  
  // Detailed category breakdown with bonuses
  console.log('\n=== CATEGORY DETAILS (with bonuses) ===');
  results.categoryDetails.forEach((cat: any) => {
    console.log(`${cat.category}:`);
    console.log(`  Score: ${cat.score} (Grade: ${cat.grade})`);
    console.log(`  Issues: ${cat.issueCount}, Passing: ${cat.passingCount}`);
    console.log(`  Bonus Points: +${cat.bonus}`);
  });
  
  // Score summary with insights
  if (results.summary) {
    console.log('\n=== INSIGHTS ===');
    console.log('Overall:', results.summary.insights.overall);
    console.log('\nCategory Insights:');
    results.summary.insights.categories.forEach((c: any) => {
      console.log(`- ${c.category}: ${c.insight}`);
    });
    
    if (results.summary.insights.recommendations?.length) {
      console.log('\nRecommendations:');
      results.summary.insights.recommendations.forEach((rec: string) => {
        console.log(`  • ${rec}`);
      });
    }
  }
  
  // Issues found
  console.log(`\n=== ISSUES (${results.issues.length}) ===`);
  results.issues.slice(0, 5).forEach((issue: any) => {
    console.log(`[${issue.severity}] ${issue.title}`);
    console.log(`  ${issue.description}`);
  });
  
  // Passing checks (what's working well!)
  console.log(`\n=== PASSING CHECKS (${results.passingChecks.length}) ===`);
  results.passingChecks.slice(0, 5).forEach((check: any) => {
    console.log(`✓ ${check.title}`);
    console.log(`  ${check.description}`);
  });
  
  return results;
};

// Example usage flow
const runExample = async () => {
  try {
    // 1. Start audit
    const jobId = await startAudit('https://example.com');
    
    // 2. Poll for completion (in real app, use setInterval or similar)
    let completed = false;
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      
      const status = await checkJobStatus(jobId);
      
      if (status.state === 'completed') {
        completed = true;
      } else if (status.state === 'failed') {
        console.error('Audit failed:', status.failedReason);
        return;
      }
    }
    
    // 3. Get full results with enhanced scoring
    const results = await getFullResults(jobId);
    
    if (results) {
      console.log('\n✅ Audit complete!');
      console.log(`View full report at: /api/reports/${results.id}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

// Key differences from old API:
// 
// OLD: Only numeric scores (0-100)
// NEW: Scores + Grades (A+ to F) + Tiers (Excellent/Good/Fair/Poor)
// 
// OLD: Only penalties for issues
// NEW: Bonuses for passing checks (up to +15 pts per category)
// 
// OLD: Basic score breakdown
// NEW: Comprehensive scoreSummary with insights, recommendations, statistics
// 
// OLD: Single endpoint flow (job status)
// NEW: Dedicated /api/audits/anonymous/:jobId/results endpoint for clean, formatted results

export { startAudit, checkJobStatus, getFullResults, runExample };
