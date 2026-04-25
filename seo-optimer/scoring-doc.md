# SEO Audit Scoring System Documentation

## 1. Overview

An SEO audit scoring system evaluates a website based on multiple SEO checks and produces a final score (usually 0–100). This score helps users understand the overall health of their website and prioritize improvements.

This document explains how to design and implement a scoring system similar to tools like SEOptimer.

---

## 2. Core Concept

Each SEO audit consists of multiple **checks**. Every check:

* Evaluates a specific SEO factor
* Produces a score
* Has a maximum possible score
* Has a priority (importance level)

The final score is calculated by combining all individual check scores.

---

## 3. Check Structure

Each check should follow a standard structure:

```ts
type SEOCheckResult = {
  id: string;
  section: string; // seo, performance, ui, links, etc
  score: number;
  maxScore: number;
  priority: 1 | 2 | 3;
  passed: boolean | null;
};
```

---

## 4. Types of Checks

### 4.1 Boolean Checks

Example: HTTPS enabled

```ts
score = hasHttps ? 1 : 0;
maxScore = 1;
```

---

### 4.2 Range-Based Checks

Example: Title length

```ts
if (length >= 50 && length <= 60) score = 6;
else if (length >= 30) score = 3;
else score = 1;
```

---

### 4.3 Count-Based Checks

Example: Broken links

```ts
if (count === 0) score = 5;
else if (count <= 5) score = 3;
else score = 1;
```

---

### 4.4 Informational Checks

These checks do not affect scoring:

```ts
maxScore = 0;
```

Examples:

* Screenshot
* Server IP
* DNS info

---

## 5. Normalization

Each check is normalized to a value between 0 and 1:

```ts
normalizedScore = score / maxScore;
```

---

## 6. Priority Weighting

Each check has a priority:

| Priority | Meaning  | Weight |
| -------- | -------- | ------ |
| 1        | Critical | 1.0    |
| 2        | Medium   | 0.7    |
| 3        | Low      | 0.4    |

Apply weight:

```ts
weightedScore = normalizedScore * priorityWeight;
```

---

## 7. Final Score Calculation

### Step-by-step:

1. Ignore checks where `maxScore === 0`
2. Normalize each check
3. Apply priority weight
4. Average all weighted scores

```ts
function calculateFinalScore(checks) {
  let total = 0;
  let count = 0;

  for (const check of checks) {
    if (check.maxScore === 0) continue;

    const normalized = check.score / check.maxScore;

    const weightMap = { 1: 1.0, 2: 0.7, 3: 0.4 };
    const weight = weightMap[check.priority] || 0.5;

    total += normalized * weight;
    count++;
  }

  return (total / count) * 100;
}
```

---

## 8. Category-Based Scoring (Optional)

Checks can be grouped into categories:

* Technical SEO
* On-page SEO
* Content
* UX / Performance
* Links

### Example:

```ts
categoryScore = sum(weightedChecks) / sum(weights);
```

Final score:

```ts
finalScore = (
  technical * 0.35 +
  onpage * 0.25 +
  content * 0.2 +
  ux * 0.1 +
  links * 0.1
);
```

---

## 9. Penalty System (Advanced)

Critical issues can cap the score:

```ts
if (!isCrawlable) finalScore = Math.min(finalScore, 30);
if (hasNoindex) finalScore = Math.min(finalScore, 50);
```

---

## 10. Impact Scoring (Recommended)

Calculate how much each issue affects the score:

```ts
impact = (maxScore * priorityWeight);
```

Display to user:

> Fixing this issue can improve your score by +X

---

## 11. Difficulty Estimation

Use estimated fix time:

| Time       | Difficulty |
| ---------- | ---------- |
| < 30 min   | Easy       |
| 30–120 min | Medium     |
| > 2 hours  | Hard       |

---

## 12. Output Format

Final response should include:

```json
{
  "score": 78,
  "grade": "B",
  "categories": {
    "technical": 82,
    "onpage": 75,
    "content": 70
  },
  "issues": [
    {
      "id": "title_length",
      "impact": 8,
      "priority": "high",
      "recommendation": "Increase title length"
    }
  ]
}
```

---

## 13. Best Practices

* Keep scoring simple (small integers like 0–6)
* Always normalize scores
* Use priority-based weighting
* Exclude informational checks
* Provide clear recommendations
* Show impact and difficulty

---

## 14. Summary

A good SEO scoring system:

* Is transparent
* Is explainable
* Uses weighted scoring
* Prioritizes critical issues
* Helps users take action

---

This system can be extended with:

* Competitor comparison
* AI-based content scoring
* Historical tracking
* Custom scoring rules
# SEO Audit Scoring System Documentation

## 1. Overview

An SEO audit scoring system evaluates a website based on multiple SEO checks and produces a final score (usually 0–100). This score helps users understand the overall health of their website and prioritize improvements.

This document explains how to design and implement a scoring system similar to tools like SEOptimer.

---

## 2. Core Concept

Each SEO audit consists of multiple **checks**. Every check:

* Evaluates a specific SEO factor
* Produces a score
* Has a maximum possible score
* Has a priority (importance level)

The final score is calculated by combining all individual check scores.

---

## 3. Check Structure

Each check should follow a standard structure:

```ts
type SEOCheckResult = {
  id: string;
  section: string; // seo, performance, ui, links, etc
  score: number;
  maxScore: number;
  priority: 1 | 2 | 3;
  passed: boolean | null;
};
```

---

## 4. Types of Checks

### 4.1 Boolean Checks

Example: HTTPS enabled

```ts
score = hasHttps ? 1 : 0;
maxScore = 1;
```

---

### 4.2 Range-Based Checks

Example: Title length

```ts
if (length >= 50 && length <= 60) score = 6;
else if (length >= 30) score = 3;
else score = 1;
```

---

### 4.3 Count-Based Checks

Example: Broken links

```ts
if (count === 0) score = 5;
else if (count <= 5) score = 3;
else score = 1;
```

---

### 4.4 Informational Checks

These checks do not affect scoring:

```ts
maxScore = 0;
```

Examples:

* Screenshot
* Server IP
* DNS info

---

## 5. Normalization

Each check is normalized to a value between 0 and 1:

```ts
normalizedScore = score / maxScore;
```

---

## 6. Priority Weighting

Each check has a priority:

| Priority | Meaning  | Weight |
| -------- | -------- | ------ |
| 1        | Critical | 1.0    |
| 2        | Medium   | 0.7    |
| 3        | Low      | 0.4    |

Apply weight:

```ts
weightedScore = normalizedScore * priorityWeight;
```

---

## 7. Final Score Calculation

### Step-by-step:

1. Ignore checks where `maxScore === 0`
2. Normalize each check
3. Apply priority weight
4. Average all weighted scores

```ts
function calculateFinalScore(checks) {
  let total = 0;
  let count = 0;

  for (const check of checks) {
    if (check.maxScore === 0) continue;

    const normalized = check.score / check.maxScore;

    const weightMap = { 1: 1.0, 2: 0.7, 3: 0.4 };
    const weight = weightMap[check.priority] || 0.5;

    total += normalized * weight;
    count++;
  }

  return (total / count) * 100;
}
```

---

## 8. Category-Based Scoring (Optional)

Checks can be grouped into categories:

* Technical SEO
* On-page SEO
* Content
* UX / Performance
* Links

### Example:

```ts
categoryScore = sum(weightedChecks) / sum(weights);
```

Final score:

```ts
finalScore = (
  technical * 0.35 +
  onpage * 0.25 +
  content * 0.2 +
  ux * 0.1 +
  links * 0.1
);
```

---

## 9. Penalty System (Advanced)

Critical issues can cap the score:

```ts
if (!isCrawlable) finalScore = Math.min(finalScore, 30);
if (hasNoindex) finalScore = Math.min(finalScore, 50);
```

---

## 10. Impact Scoring (Recommended)

Calculate how much each issue affects the score:

```ts
impact = (maxScore * priorityWeight);
```

Display to user:

> Fixing this issue can improve your score by +X

---

## 11. Difficulty Estimation

Use estimated fix time:

| Time       | Difficulty |
| ---------- | ---------- |
| < 30 min   | Easy       |
| 30–120 min | Medium     |
| > 2 hours  | Hard       |

---

## 12. Output Format

Final response should include:

```json
{
  "score": 78,
  "grade": "B",
  "categories": {
    "technical": 82,
    "onpage": 75,
    "content": 70
  },
  "issues": [
    {
      "id": "title_length",
      "impact": 8,
      "priority": "high",
      "recommendation": "Increase title length"
    }
  ]
}
```

---

## 13. Best Practices

* Keep scoring simple (small integers like 0–6)
* Always normalize scores
* Use priority-based weighting
* Exclude informational checks
* Provide clear recommendations
* Show impact and difficulty

---

## 14. Summary

A good SEO scoring system:

* Is transparent
* Is explainable
* Uses weighted scoring
* Prioritizes critical issues
* Helps users take action

---

This system can be extended with:

* Competitor comparison
* AI-based content scoring
* Historical tracking
* Custom scoring rules
