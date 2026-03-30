import { prisma } from "../../../lib/prisma";
import type { SeoIssue } from "../analyzer/types";
import type { Difficulty } from "../../generated/prisma/enums";

export interface RecommendationOutput {
  title: string;
  description: string;
  priority: number; // 1-10, lower is higher priority
  estimatedTimeMinutes: number;
  difficulty: Difficulty;
  category: string;
  fixGuideId: string | null;
  issueId: string; // Will be assigned when saving to DB
  steps: {
    stepNumber: number;
    instruction: string;
    codeExample: string | null;
    toolsNeeded: string[];
  }[];
}

export class RecommendationGenerator {
  /**
   * Generate recommendations for all issues
   */
  async generateRecommendations(issues: SeoIssue[]): Promise<RecommendationOutput[]> {
    console.log(`💡 Generating recommendations for ${issues.length} issues...`);

    const recommendations: RecommendationOutput[] = [];

    for (const issue of issues) {
      const recommendation = await this.generateRecommendation(issue);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Sort by priority (impact score * severity weight)
    recommendations.sort((a, b) => a.priority - b.priority);

    console.log(`✅ Generated ${recommendations.length} recommendations`);

    return recommendations;
  }

  /**
   * Generate a single recommendation for an issue
   */
  private async generateRecommendation(issue: SeoIssue): Promise<RecommendationOutput | null> {
    // Try to find a matching fix guide template
    const fixGuide = await prisma.fixGuide.findUnique({
      where: { issueType: issue.type },
    });

    if (fixGuide) {
      // Use template from database
      return {
        title: `Fix: ${issue.title}`,
        description: fixGuide.description,
        priority: this.calculatePriority(issue),
        estimatedTimeMinutes: this.estimateTime(issue, fixGuide.difficulty),
        difficulty: fixGuide.difficulty,
        category: issue.category,
        fixGuideId: fixGuide.id,
        issueId: '', // Will be set when saving
        steps: fixGuide.steps as any[], // JSON stored as array of steps
      };
    } else {
      // Generate generic recommendation
      return {
        title: `Fix: ${issue.title}`,
        description: issue.description,
        priority: this.calculatePriority(issue),
        estimatedTimeMinutes: this.estimateTime(issue, 'INTERMEDIATE'),
        difficulty: 'INTERMEDIATE',
        category: issue.category,
        fixGuideId: null,
        issueId: '',
        steps: this.generateGenericSteps(issue),
      };
    }
  }

  /**
   * Calculate priority (1-10, lower = higher priority)
   */
  private calculatePriority(issue: SeoIssue): number {
    const severityWeights = {
      CRITICAL: 1,
      HIGH: 3,
      MEDIUM: 6,
      LOW: 9,
    };

    const baseWeight = severityWeights[issue.severity];
    
    // Adjust by impact score (higher impact = higher priority)
    const impactAdjustment = Math.floor((100 - issue.impactScore) / 25);
    
    return Math.min(10, Math.max(1, baseWeight + impactAdjustment));
  }

  /**
   * Estimate time to fix based on issue type and difficulty
   */
  private estimateTime(issue: SeoIssue, difficulty: Difficulty): number {
    const baseMinutes: Record<Difficulty, number> = {
      BEGINNER: 10,
      INTERMEDIATE: 30,
      ADVANCED: 90,
    };

    let estimate = baseMinutes[difficulty];

    // Adjust based on issue category
    if (issue.category === 'PERFORMANCE') {
      estimate *= 2; // Performance fixes often take longer
    }

    return estimate;
  }

  /**
   * Generate generic fix steps (fallback when no template exists)
   */
  private generateGenericSteps(issue: SeoIssue): RecommendationOutput['steps'] {
    return [
      {
        stepNumber: 1,
        instruction: `Identify the issue: ${issue.description}`,
        codeExample: null,
        toolsNeeded: ['Browser DevTools'],
      },
      {
        stepNumber: 2,
        instruction: `Research best practices for fixing "${issue.type}" issues.`,
        codeExample: null,
        toolsNeeded: ['Google Search', 'SEO documentation'],
      },
      {
        stepNumber: 3,
        instruction: 'Implement the fix in your website code or CMS.',
        codeExample: null,
        toolsNeeded: ['Text editor or CMS'],
      },
      {
        stepNumber: 4,
        instruction: 'Test the fix and verify the issue is resolved.',
        codeExample: null,
        toolsNeeded: ['Browser', 'SEO testing tools'],
      },
    ];
  }
}