# UserProfiler - ZOIX User Intelligence Layer

## Overview

The UserProfiler service is a core component of ZOIX's intelligence system that understands **WHO the user is** - their interests, domains, learning trajectory, and skill progression.

Think of it as looking at someone's bookshelf to understand what they know and care about.

## Features

### 1. Interest Tracking
- Automatically detects topics from user activities (React, Python, DevOps, AI, etc.)
- Weights interests by **recency** and **frequency**
- **Time-based decay**: Old interests naturally fade (but are never deleted)
- Interests can resurface when user returns to a topic

### 2. Domain Detection
- Identifies primary domains (frontend, backend, data science, security, etc.)
- Distinguishes between:
  - **Primary domains**: Main areas of work
  - **Secondary domains**: Regular but not primary focus
  - **Emerging domains**: New areas being explored
- Confidence scores for each domain

### 3. Learning Trajectory
- Tracks skill progression over time (learning → intermediate → mastery)
- Identifies when user is **learning** something new vs **using** existing skills
- Detects mastery patterns:
  - Fewer errors over time
  - Faster completion
  - Higher complexity work
  - Consistent success

### 4. Profile Insights
- **Learning Goals**: Topics the user is actively learning (improving trajectory)
- **Strengths**: Areas with high success rate and low errors
- **Growth Areas**: Topics with high error rates (needs improvement)

## Database Schema

Uses SQLite (`zoix.db`) with the following tables:

```sql
-- User profile metadata
CREATE TABLE user_profile (
  user_id TEXT PRIMARY KEY,
  last_updated INTEGER NOT NULL,
  total_activities INTEGER DEFAULT 0
);

-- Interests with time-based decay
CREATE TABLE interests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  weight REAL DEFAULT 0,           -- 0-100 score
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  occurrences INTEGER DEFAULT 1,
  decay_factor REAL DEFAULT 1.0,
  UNIQUE(user_id, topic)
);

-- Activity log
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,     -- 'interaction', 'code', 'error', 'success', 'search', 'documentation'
  context TEXT,                     -- Full context of the activity
  topics TEXT DEFAULT '[]',         -- Detected topics (JSON array)
  outcome TEXT DEFAULT 'unknown',   -- 'success', 'failure', 'partial', 'unknown'
  duration INTEGER DEFAULT 0,       -- milliseconds
  complexity REAL DEFAULT 0,        -- 0-100 complexity score
  timestamp INTEGER NOT NULL
);

-- Skill progressions
CREATE TABLE skill_progressions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  level TEXT DEFAULT 'learning',    -- 'learning', 'intermediate', 'mastery'
  trajectory TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'
  error_rate REAL DEFAULT 0,
  success_rate REAL DEFAULT 0,
  avg_completion_time INTEGER DEFAULT 0,
  complexity REAL DEFAULT 0,
  last_updated INTEGER NOT NULL,
  UNIQUE(user_id, topic)
);
```

## API Reference

### Get Instance

```typescript
import { getUserProfiler } from './UserProfiler.integration';

const profiler = getUserProfiler();
// or with specific user ID:
const profiler = getUserProfiler('user-123');
```

### Core Methods

#### `recordActivity(sessionId, activityType, context, outcome?, duration?)`

Records a user activity and automatically updates interests and skill progressions.

```typescript
profiler.recordActivity(
  'session-123',
  'code',
  'import React from "react"; // React component code...',
  'success',
  5000 // 5 seconds
);
```

**Activity Types:**
- `'interaction'`: General interaction
- `'code'`: Writing/editing code
- `'error'`: Encountered an error
- `'success'`: Successfully completed task
- `'search'`: Searching for information
- `'documentation'`: Reading documentation

**Outcomes:**
- `'success'`: Task completed successfully
- `'failure'`: Task failed
- `'partial'`: Partial success
- `'unknown'`: Outcome not determined

#### `updateInterest(topic, weightIncrement)`

Manually update interest weight for a topic.

```typescript
profiler.updateInterest('docker', 15);
profiler.updateInterest('kubernetes', 5);
```

#### `getProfile(): UserProfile`

Get complete user profile with all data.

```typescript
const profile = profiler.getProfile();

console.log(profile.interests);        // All interests
console.log(profile.domains);          // Detected domains
console.log(profile.skillProgressions); // Skill levels
console.log(profile.learningGoals);    // Topics being learned
console.log(profile.strengths);        // Strong areas
console.log(profile.growthAreas);      // Areas needing work
```

#### `getTopInterests(n: number): Interest[]`

Get top N interests by weight.

```typescript
const top5 = profiler.getTopInterests(5);
top5.forEach(interest => {
  console.log(`${interest.topic}: ${interest.weight}`);
});
```

#### `getLearningGoals(): string[]`

Get topics the user is actively learning.

```typescript
const goals = profiler.getLearningGoals();
// ['kubernetes', 'typescript', 'machine-learning']
```

#### `getStrengths(): string[]`

Get areas where user excels (high success, low errors).

```typescript
const strengths = profiler.getStrengths();
// ['react', 'javascript', 'frontend']
```

#### `getGrowthAreas(): string[]`

Get areas with high error rates.

```typescript
const growthAreas = profiler.getGrowthAreas();
// ['kubernetes', 'rust', 'systems-programming']
```

#### `getLearningTrajectory(): SkillProgression[]`

Get detailed skill progression data.

```typescript
const trajectory = profiler.getLearningTrajectory();
trajectory.forEach(skill => {
  console.log(`${skill.topic}: ${skill.level} (${skill.trajectory})`);
  console.log(`  Success: ${skill.successRate}, Errors: ${skill.errorRate}`);
});
```

#### `getDomains(): Domain[]`

Get detected domains with confidence scores.

```typescript
const domains = profiler.getDomains();
domains.forEach(domain => {
  console.log(`${domain.name} (${domain.type}): ${domain.confidence}`);
  console.log(`  Topics: ${domain.topics.join(', ')}`);
});
```

### Activity Queries

#### `getRecentActivities(limit: number): Activity[]`

Get recent activities.

```typescript
const recent = profiler.getRecentActivities(100);
```

#### `getActivitiesBySession(sessionId: string): Activity[]`

Get all activities for a specific session.

```typescript
const sessionActivities = profiler.getActivitiesBySession('session-123');
```

### Utility Methods

#### `applyInterestDecay()`

Manually apply time-based decay to all interests. This is automatically called by `getProfile()` and similar methods.

```typescript
profiler.applyInterestDecay();
```

## Interest Decay Algorithm

Interests naturally decay over time to reflect changing focus:

- **Decay Rate**: 5% per week (configurable via `DECAY_RATE`)
- **Decay Interval**: 7 days (configurable via `DECAY_INTERVAL`)
- **Formula**: `newWeight = oldWeight × (0.95 ^ weeksSinceLastSeen)`

**Example:**
- Week 0: Interest weight = 100
- Week 1: Weight = 95 (5% decay)
- Week 2: Weight = 90.25 (5% decay)
- Week 4: Weight = 81.45
- Week 8: Weight = 66.34

When user returns to a topic, the weight increases again from the decayed value.

## Topic Detection

The system automatically detects topics from text using keyword matching:

### Supported Topics

#### AI/ML
- Keywords: machine learning, tensorflow, pytorch, llm, gpt, claude, transformers, rag

#### Frontend
- React, Vue, Angular, HTML, CSS, Webpack, Vite, Tailwind

#### Backend
- Node.js, Express, Flask, Django, FastAPI, REST, GraphQL

#### DevOps
- Docker, Kubernetes, CI/CD, GitHub Actions, Terraform

#### Cloud
- AWS, GCP, Azure (with service-specific detection)

#### Data
- Data Science: pandas, numpy, matplotlib, jupyter
- Data Engineering: Spark, Kafka, Airflow, ETL

#### Databases
- SQL: PostgreSQL, MySQL, SQLite
- NoSQL: MongoDB, Redis, Elasticsearch

#### Mobile
- iOS: Swift, SwiftUI, UIKit
- Android: Kotlin, Jetpack Compose
- Cross-platform: React Native, Flutter

#### Security
- Authentication, encryption, JWT, OAuth, SSL, vulnerabilities

#### Testing
- Jest, Mocha, Pytest, unit tests, e2e tests

## Skill Level Inference

Skills are automatically classified into three levels:

### Learning
- Error rate > 40% or Success rate < 40%
- Low complexity work
- Early stage of skill development

### Intermediate
- Error rate < 40% and Success rate > 40%
- Moderate complexity
- Developing competency

### Mastery
- Error rate < 20% and Success rate > 70%
- High complexity work (> 60/100)
- Consistent expert-level performance

## Complexity Scoring

Code complexity is scored 0-100 based on:

- **Lines of code**: More lines = higher complexity
- **Advanced patterns**:
  - Classes, interfaces, types
  - Functions and methods
  - Async/await usage
  - Error handling (try/catch)
  - Generics
  - Decorators
  - Type annotations
- **Nesting depth**: Deeper nesting = higher complexity

## Best Practices

### 1. Record Activities Consistently

```typescript
// Record every meaningful activity
profiler.recordActivity(sessionId, 'code', codeContext, 'success', duration);
profiler.recordActivity(sessionId, 'error', errorContext, 'failure', duration);
profiler.recordActivity(sessionId, 'documentation', docContext, 'success', duration);
```

### 2. Use Specific Context

Include enough context for accurate topic detection:

```typescript
// Good - specific context
profiler.recordActivity(
  sessionId,
  'code',
  'Created Express REST API endpoint with JWT authentication',
  'success'
);

// Less useful - vague context
profiler.recordActivity(sessionId, 'code', 'wrote some code', 'success');
```

### 3. Track Duration

Provide duration when possible to track completion time trends:

```typescript
const start = Date.now();
// ... user works on task ...
const duration = Date.now() - start;
profiler.recordActivity(sessionId, 'code', context, 'success', duration);
```

### 4. Query Regularly for Insights

```typescript
// Get insights for personalized recommendations
const learningGoals = profiler.getLearningGoals();
const growthAreas = profiler.getGrowthAreas();

// Use these to:
// - Recommend relevant documentation
// - Suggest learning resources
// - Provide contextual help
// - Personalize UI/UX
```

## Integration Example

```typescript
import { getUserProfiler } from './ai-core';

// Somewhere in your app initialization
const profiler = getUserProfiler();

// When user writes code
function onCodeChange(sessionId: string, code: string) {
  profiler.recordActivity(
    sessionId,
    'code',
    code,
    'unknown', // outcome not known yet
    0
  );
}

// When code runs successfully
function onCodeSuccess(sessionId: string, code: string, executionTime: number) {
  profiler.recordActivity(
    sessionId,
    'success',
    code,
    'success',
    executionTime
  );
}

// When error occurs
function onError(sessionId: string, errorContext: string, debugTime: number) {
  profiler.recordActivity(
    sessionId,
    'error',
    errorContext,
    'failure',
    debugTime
  );
}

// Get personalized insights
function getPersonalizedHelp() {
  const profile = profiler.getProfile();

  return {
    suggestedDocs: recommendDocsFor(profile.learningGoals),
    strengthsToLeverage: profile.strengths,
    areasToImprove: profile.growthAreas,
    recommendedLearningPath: buildPathFrom(profile.skillProgressions)
  };
}
```

## Shutdown

Always shutdown cleanly:

```typescript
import { shutdownUserProfiler } from './UserProfiler.integration';

// On app shutdown
shutdownUserProfiler();
```

## Performance Considerations

- **Database**: Uses SQLite with WAL mode for concurrent reads
- **Indexes**: Proper indexes on user_id, weight, timestamp for fast queries
- **Decay**: Decay is only applied when reading data (lazy evaluation)
- **Singleton**: Only one instance per application

## Future Enhancements

Potential future features:
- Cross-session learning patterns
- Collaboration detection (pair programming)
- Time-of-day productivity patterns
- Project-specific skill tracking
- Export/import profiles for sharing
- Machine learning for better topic detection
- Semantic similarity for topic clustering
