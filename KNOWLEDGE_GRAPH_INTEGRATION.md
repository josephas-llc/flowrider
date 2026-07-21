# Knowledge Graph Integration for ZOIX

## Overview
Built a comprehensive KnowledgeGraph service that maps connections between concepts the user works with.

## Files Created

### 1. `/Users/zacharykramer/flowrider2/src/main/ai-core/KnowledgeGraph.ts`
Main service implementing:
- **Concept Extraction**: Automatically extracts tech concepts from code, prompts, and terminal output
- **Relationship Detection**: Tracks which concepts appear together (co-occurrence)
- **Cluster Formation**: Groups related concepts into knowledge clusters
- **Connection Strength**: Weights relationships by frequency (0-1 scale)
- **Gap Detection**: Identifies missing connections in user's knowledge
- **Built-in Knowledge Base**: 100+ known tech concepts (React, Docker, TypeScript, etc.)

## Database Schema

### SQLite Tables Created:
```sql
concepts:
- id, name, type, category, first_seen, last_seen, occurrences
- description, aliases, metadata

concept_relations:
- concept1_id, concept2_id, strength, co_occurrences
- contexts, last_seen

knowledge_clusters:
- id, name, concept_ids, description, category
- coherence, created_at, updated_at

knowledge_gaps:
- id, description, missing_concept, related_concepts
- confidence, suggestions, detected_at, dismissed
```

## Integration Points

### Memory.ts Integration
- Auto-extracts concepts from every interaction
- Added methods:
  - `getKnowledgeGraph()`
  - `getRelatedConcepts(conceptName, limit?)`
  - `getKnowledgeClusters()`
  - `getKnowledgeGaps(includeDismissed?)`
  - `dismissKnowledgeGap(gapId)`
  - `getKnowledgeGraphStats()`
  - `formKnowledgeClusters()`
  - `detectKnowledgeGaps()`
  - `extractConceptsFromText(text, context?)`

### AICore.ts Integration (PENDING)
Methods need to be added to AICore class:
- `getKnowledgeGraph()`
- `getRelatedConcepts(conceptName, limit?)`
- `getKnowledgeClusters()`
- `getKnowledgeGaps(includeDismissed?)`
- `dismissKnowledgeGap(gapId)`
- `getKnowledgeGraphStats()`
- `formKnowledgeClusters()`
- `detectKnowledgeGaps()`
- `extractConceptsFromText(text, context?)`

**Note**: File was being auto-modified by linter. These methods proxy to `this.memory.*` methods.

### IPC Handlers (PENDING)
See `KNOWLEDGE_GRAPH_IPC_HANDLERS.txt` for the handlers to add to `src/main/main.ts`:
- `zoix:getKnowledgeGraph`
- `zoix:getRelatedConcepts`
- `zoix:getKnowledgeClusters`
- `zoix:getKnowledgeGaps`
- `zoix:dismissKnowledgeGap`
- `zoix:getKnowledgeGraphStats`
- `zoix:formKnowledgeClusters`
- `zoix:detectKnowledgeGaps`
- `zoix:extractConcepts`

## Features

### 1. Concept Extraction
Automatically detects 100+ tech concepts including:
- **Languages**: JavaScript, TypeScript, Python, Rust, Go, etc.
- **Frontend**: React, Vue, Angular, Next.js, Three.js, etc.
- **Backend**: Express, NestJS, Django, FastAPI, etc.
- **Databases**: PostgreSQL, MongoDB, Redis, etc.
- **DevOps**: Docker, Kubernetes, Terraform, GitHub Actions, etc.
- **Cloud**: AWS, Azure, GCP, Vercel, etc.
- **Testing**: Jest, Vitest, Cypress, Playwright, etc.
- **Patterns**: Microservices, REST, GraphQL, Event-driven, etc.
- **AI/ML**: TensorFlow, PyTorch, Langchain, Ollama, etc.

### 2. Relationship Tracking
- Tracks co-occurrence of concepts
- Builds strength scores (0-1) based on frequency
- Records context where concepts appeared together
- Automatically detects common tech stacks

### 3. Cluster Formation
- Groups concepts by category
- Calculates coherence scores for clusters
- Creates named clusters ("Frontend Stack", "Backend Stack", etc.)
- Updates clusters as new concepts are learned

### 4. Gap Detection
- Identifies missing tools in user's stack
- Suggests complementary technologies
- Example: "You use React but haven't used testing tools"
- Provides learning suggestions for each gap
- Can be dismissed by user

### 5. Statistics
Returns comprehensive stats:
- Total concepts, relations, clusters
- Top concepts by usage
- Strongest relationships
- Category distribution
- Knowledge gaps count

## Known Tech Relationships

Predefined common pairs:
- React → TypeScript, Next.js, Vite, Jest
- Docker → Kubernetes, Docker Compose, Nginx
- PostgreSQL → SQL, Prisma, TypeORM
- AWS → S3, EC2, Lambda, CloudFront
- TypeScript → JavaScript, Node, NPM

## Concept Categories
- `frontend`, `backend`, `database`, `devops`
- `testing`, `architecture`, `language`, `infrastructure`
- `ai-ml`, `security`, `general`

## Concept Types
- `library`, `framework`, `language`, `tool`, `pattern`
- `architecture`, `algorithm`, `protocol`, `platform`
- `database`, `cloud`, `testing`, `devops`, `concept`, `other`

## Usage Flow

1. **Automatic Extraction**: Every interaction automatically extracts concepts
2. **Relationship Building**: Co-occurrences strengthen connections
3. **Cluster Formation**: Call `formKnowledgeClusters()` to group concepts
4. **Gap Detection**: Call `detectKnowledgeGaps()` to find missing knowledge
5. **Query Graph**: Use `getKnowledgeGraph()` to visualize connections

## Next Steps

1. **Complete AICore Integration**: Add knowledge graph methods to AICore.ts (avoiding linter conflicts)
2. **Add IPC Handlers**: Copy handlers from KNOWLEDGE_GRAPH_IPC_HANDLERS.txt to main.ts
3. **Update preload.ts**: Expose zoix namespace to renderer
4. **Build UI**: Create knowledge graph visualization in renderer
5. **Test Build**: Run `npm run build` to verify TypeScript compilation

## Example Use Cases

1. **Tech Stack Analysis**: See what technologies user works with most
2. **Learning Recommendations**: Get personalized suggestions for what to learn next
3. **Project Context**: Understand the full tech stack of a project
4. **Skill Gap Identification**: Find missing tools/knowledge areas
5. **Knowledge Visualization**: Build interactive graph of user's tech knowledge

## Performance

- Concept extraction uses regex with word boundaries
- Relations stored with bidirectional edges
- Indexes on key fields for fast queries
- Coherence calculated on-demand
- Gap detection runs periodically, not on every interaction
