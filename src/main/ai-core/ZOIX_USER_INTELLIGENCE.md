# ZOIX User Intelligence Layer

## What is ZOIX?

ZOIX is the self-improving AI intelligence layer for Flowrider. It learns from every interaction to become more helpful and personalized over time.

The User Intelligence Layer is one of ZOIX's core capabilities - it understands **WHO the user is**.

## Philosophy

> "Like looking at someone's bookshelf to understand what they know and care about."

Traditional systems treat all users the same. ZOIX learns:
- What topics you work on most
- What you're currently learning vs what you've mastered
- Where you excel and where you struggle
- How your skills evolve over time

## Components

### 1. UserProfiler Service (`UserProfiler.ts`)

**Purpose**: Tracks user interests, domains, and learning trajectory.

**Key Features**:
- 🎯 Interest tracking with time-based decay
- 📊 Domain detection (frontend, backend, AI/ML, etc.)
- 📈 Learning trajectory analysis
- 💪 Strength and growth area identification

**Database**: `zoix.db` (SQLite)

**Location**: `/Users/zacharykramer/flowrider2/src/main/ai-core/UserProfiler.ts`

### 2. How It Works

```
User Activity → Topic Detection → Interest Update → Skill Progression
                                ↓
                          Interest Decay
                                ↓
                    Profile Generation → Insights
```

#### Activity Flow

1. **Record Activity**
   ```typescript
   profiler.recordActivity(sessionId, 'code', context, outcome, duration)
   ```

2. **Topic Detection**
   - Analyzes context text
   - Matches against keyword patterns
   - Detects 20+ topics (React, Python, Docker, etc.)
   - Calculates confidence scores

3. **Interest Update**
   - Applies time-based decay to existing interests
   - Increments weight for detected topics
   - Tracks first/last seen timestamps
   - Updates occurrence counts

4. **Skill Progression**
   - Tracks error/success rates per topic
   - Monitors completion time trends
   - Analyzes code complexity
   - Infers skill level (learning → intermediate → mastery)
   - Detects trajectory (improving, stable, declining)

5. **Profile Generation**
   - Aggregates all data
   - Infers domains from topics
   - Identifies learning goals
   - Highlights strengths
   - Flags growth areas

## Interest Decay Algorithm

Interests naturally fade over time to reflect changing focus:

```
newWeight = oldWeight × (0.95 ^ weeksSinceLastSeen)
```

**Example Decay**:
- Week 0: 100 (active work)
- Week 1: 95 (5% decay)
- Week 2: 90.25
- Week 4: 81.45
- Week 8: 66.34 (still remembered!)

**Why decay?**
- Reflects real-world skill degradation
- Prioritizes recent work
- Never deletes - interests can resurface
- Creates natural evolution of profile

## Skill Level Classification

### Learning (🌱)
- High error rate (>40%) or low success rate (<40%)
- Early exploration phase
- Seeking documentation frequently
- Simple implementations

**Example**: Started learning Kubernetes last week, lots of config errors

### Intermediate (📚)
- Moderate error rate (<40%) and success rate (>40%)
- Building competency
- Can complete tasks with some struggle
- Increasing complexity

**Example**: Can write React components, occasionally hits TypeScript issues

### Mastery (⭐)
- Low error rate (<20%) and high success rate (>70%)
- Complex implementations (complexity > 60)
- Fast completion times
- Consistent expert performance

**Example**: Senior frontend dev, writes complex React apps without errors

## Domain Detection

Detects 11 major domains:

1. **Frontend**: React, Vue, Angular, HTML, CSS
2. **Backend**: Node.js, Express, Flask, Django, APIs
3. **DevOps**: Docker, Kubernetes, CI/CD, pipelines
4. **Cloud**: AWS, GCP, Azure services
5. **Data Science**: Pandas, NumPy, Jupyter, ML
6. **Data Engineering**: Spark, Kafka, Airflow, ETL
7. **Database**: SQL, NoSQL, PostgreSQL, MongoDB
8. **Mobile**: iOS, Android, React Native
9. **AI/ML**: TensorFlow, PyTorch, LLMs, RAG
10. **Security**: Auth, encryption, vulnerabilities
11. **Quality**: Testing frameworks, TDD, E2E

Each domain has:
- **Type**: Primary, Secondary, or Emerging
- **Confidence**: How sure we are (0-1)
- **Topics**: Specific technologies in this domain
- **Last Activity**: When last worked on

## Use Cases

### 1. Personalized Recommendations

```typescript
const profile = profiler.getProfile();

// Recommend docs for what user is learning
recommendDocs(profile.learningGoals);

// Suggest advanced tutorials for strengths
suggestAdvancedContent(profile.strengths);

// Provide beginner resources for growth areas
offerBeginnerHelp(profile.growthAreas);
```

### 2. Smart Context Switching

```typescript
const domains = profiler.getDomains();

// User switches from frontend to backend
if (domains[0].name === 'frontend') {
  // Preload React docs, component patterns
} else if (domains[0].name === 'backend') {
  // Preload API design patterns, database schemas
}
```

### 3. Learning Path Generation

```typescript
const trajectory = profiler.getLearningTrajectory();

// Find topics user is improving in
const improving = trajectory.filter(t => t.trajectory === 'improving');

// Build personalized learning path
const path = buildPath(improving, profile.strengths);
```

### 4. Proactive Help

```typescript
const growthAreas = profiler.getGrowthAreas();

// User starts working on a growth area
if (currentTopic in growthAreas) {
  // Show helpful hints
  // Enable verbose error messages
  // Suggest pair programming
}
```

### 5. Skill Verification

```typescript
const strengths = profiler.getStrengths();

// Job application: "I'm an expert in React"
if (strengths.includes('react')) {
  const skill = trajectory.find(t => t.topic === 'react');
  console.log(`Success rate: ${skill.successRate * 100}%`);
  console.log(`Error rate: ${skill.errorRate * 100}%`);
  console.log(`Level: ${skill.level}`);
  // Verified: mastery level, 85% success rate, 12% error rate
}
```

## Integration Points

### With Memory (`Memory.ts`)
- UserProfiler can consume Memory's interactions
- Shared SQLite patterns
- Complementary data models

### With Analyzer (`Analyzer.ts`)
- Analyzer detects patterns → UserProfiler tracks skill progression
- Error patterns → Growth areas
- Success patterns → Strengths

### With ContextMemory (`ContextMemory.ts`)
- Session summaries → Activity records
- Learning events → Skill progression
- Daily digests → Interest updates

### With ResourceRecommender (`ResourceRecommender.ts`)
- Learning goals → Resource recommendations
- Growth areas → Tutorial suggestions
- Skill level → Content difficulty matching

## Privacy & Data

### What's Stored
- Topics and interests (anonymized)
- Skill progression metrics
- Activity metadata (no personal identifiers)
- Session patterns

### What's NOT Stored
- Actual code content (only complexity scores)
- Personal information
- Proprietary business logic
- Sensitive credentials

### Data Ownership
- All data stored locally in `zoix.db`
- User controls retention
- No external transmission
- Can be deleted anytime

## Performance

- **Database**: SQLite with WAL mode
- **Query Speed**: Indexed lookups (<1ms)
- **Memory**: Singleton pattern (single instance)
- **Decay**: Lazy evaluation (only when reading)
- **Concurrency**: Safe for multi-session use

## Future Roadmap

### Phase 1: ✅ Complete
- Basic interest tracking
- Domain detection
- Skill progression
- Learning trajectory

### Phase 2: 🚧 Planned
- Cross-session learning patterns
- Collaboration detection
- Time-of-day productivity analysis
- Project-specific profiles

### Phase 3: 💭 Ideas
- Export/import profiles
- Skill sharing between users
- ML-based topic detection
- Semantic clustering of interests
- Predictive learning path generation

## Quick Start

```typescript
import { getUserProfiler } from './ai-core';

const profiler = getUserProfiler();

// Record what user does
profiler.recordActivity(
  'session-1',
  'code',
  'Building React component with hooks',
  'success',
  5000
);

// Get insights
const profile = profiler.getProfile();
console.log('Learning:', profile.learningGoals);
console.log('Strengths:', profile.strengths);
console.log('Growing:', profile.growthAreas);

// Use for personalization
const help = getPersonalizedHelp(profile);
```

## Documentation

- **API Reference**: `UserProfiler.README.md`
- **Code Examples**: `UserProfiler.example.ts`
- **Source Code**: `UserProfiler.ts`
- **Integration**: `UserProfiler.integration.ts`

## Philosophy: The Bookshelf Analogy

Your skills are like books on a shelf:

- **Recently Read** (high weight): Fresh knowledge, easy to access
- **Collecting Dust** (decayed): Haven't used in months, need refresher
- **Well-Worn** (mastery): Read many times, know it by heart
- **Just Started** (learning): First few chapters, still learning plot
- **Reference Material** (strengths): Go-to books for specific topics

ZOIX doesn't just list the books - it understands:
- Which books you're currently reading (learning goals)
- Which books you've mastered (strengths)
- Which books confuse you (growth areas)
- How your reading habits change over time (trajectory)

This creates a **living, breathing profile** that evolves with you.

---

**Built with ❤️ for developers who want their tools to understand them.**
