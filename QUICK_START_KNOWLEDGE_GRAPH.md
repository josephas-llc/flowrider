# Knowledge Graph Quick Start

## ✅ What's Been Built

A comprehensive Knowledge Graph service that automatically maps connections between tech concepts you use.

## 📁 Files Created

1. `/src/main/ai-core/KnowledgeGraph.ts` - Main service (1163 lines)
2. `KNOWLEDGE_GRAPH_IPC_HANDLERS.txt` - IPC handlers to add
3. `KNOWLEDGE_GRAPH_INTEGRATION.md` - Full technical docs
4. `ZOIX_KNOWLEDGE_GRAPH_SUMMARY.md` - Complete summary

## 🚀 3 Steps to Complete Integration

### Step 1: Add Methods to AICore.ts

**File**: `src/main/ai-core/AICore.ts`
**Location**: Before the "Cleanup" section (around line 400)

```typescript
// ============================================
// Knowledge Graph (ZOIX)
// ============================================

getKnowledgeGraph() {
  return this.memory.getKnowledgeGraph();
}

getRelatedConcepts(conceptName: string, limit?: number) {
  return this.memory.getRelatedConcepts(conceptName, limit);
}

getKnowledgeClusters() {
  return this.memory.getKnowledgeClusters();
}

getKnowledgeGaps(includeDismissed?: boolean) {
  return this.memory.getKnowledgeGaps(includeDismissed);
}

dismissKnowledgeGap(gapId: string) {
  return this.memory.dismissKnowledgeGap(gapId);
}

getKnowledgeGraphStats() {
  return this.memory.getKnowledgeGraphStats();
}

formKnowledgeClusters() {
  return this.memory.formKnowledgeClusters();
}

detectKnowledgeGaps() {
  return this.memory.detectKnowledgeGaps();
}

extractConceptsFromText(text: string, context?: string) {
  return this.memory.extractConceptsFromText(text, context);
}
```

### Step 2: Add IPC Handlers to main.ts

**File**: `src/main/main.ts`
**Location**: After `leoai:clearDismissedSuggestions` handler (around line 660)

Copy the entire content from `KNOWLEDGE_GRAPH_IPC_HANDLERS.txt`

**Quick version** (full version in KNOWLEDGE_GRAPH_IPC_HANDLERS.txt):
```typescript
// ========================================
// Knowledge Graph IPC (ZOIX)
// ========================================

ipcMain.handle('zoix:getKnowledgeGraph', async () => {
  try {
    const graph = aiCore.getKnowledgeGraph();
    return { success: true, data: graph };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// ... 8 more handlers (see KNOWLEDGE_GRAPH_IPC_HANDLERS.txt)
```

### Step 3: Add to preload.ts

**File**: `src/main/preload.ts`
**Location**: Inside `contextBridge.exposeInMainWorld('flowrider', { ... })`

```typescript
zoix: {
  getKnowledgeGraph: () => ipcRenderer.invoke('zoix:getKnowledgeGraph'),
  getRelatedConcepts: (conceptName: string, limit?: number) =>
    ipcRenderer.invoke('zoix:getRelatedConcepts', conceptName, limit),
  getKnowledgeClusters: () => ipcRenderer.invoke('zoix:getKnowledgeClusters'),
  getKnowledgeGaps: (includeDismissed?: boolean) =>
    ipcRenderer.invoke('zoix:getKnowledgeGaps', includeDismissed),
  dismissKnowledgeGap: (gapId: string) =>
    ipcRenderer.invoke('zoix:dismissKnowledgeGap', gapId),
  getKnowledgeGraphStats: () => ipcRenderer.invoke('zoix:getKnowledgeGraphStats'),
  formKnowledgeClusters: () => ipcRenderer.invoke('zoix:formKnowledgeClusters'),
  detectKnowledgeGaps: () => ipcRenderer.invoke('zoix:detectKnowledgeGaps'),
  extractConcepts: (text: string, context?: string) =>
    ipcRenderer.invoke('zoix:extractConcepts', text, context),
},
```

## ✅ Verify Integration

After completing the 3 steps:

```bash
npm run build
```

Should compile without errors.

## 🎮 Usage Examples

### Get Full Knowledge Graph
```typescript
const { data } = await window.flowrider.zoix.getKnowledgeGraph();
console.log(data.concepts); // All tech concepts
console.log(data.relations); // All connections
console.log(data.clusters); // All clusters
```

### Get Related Concepts
```typescript
const { data } = await window.flowrider.zoix.getRelatedConcepts('react', 5);
// Returns top 5 concepts related to React with strength scores
```

### Get Knowledge Gaps
```typescript
const { data } = await window.flowrider.zoix.getKnowledgeGaps();
// Returns: [{ description, missingConcept, suggestions }, ...]
```

### Get Statistics
```typescript
const { data } = await window.flowrider.zoix.getKnowledgeGraphStats();
// Returns: { totalConcepts, topConcepts, strongestRelations, ... }
```

### Detect Gaps and Form Clusters
```typescript
// Run analysis
await window.flowrider.zoix.formKnowledgeClusters();
await window.flowrider.zoix.detectKnowledgeGaps();

// Get results
const clusters = await window.flowrider.zoix.getKnowledgeClusters();
const gaps = await window.flowrider.zoix.getKnowledgeGaps();
```

## 🎯 What It Does Automatically

✅ Extracts concepts from every AI interaction
✅ Tracks concept co-occurrences
✅ Builds relationship strengths
✅ Creates knowledge clusters
✅ Detects learning gaps
✅ Suggests next steps

## 📊 Supported Concepts (100+)

- **Languages**: JavaScript, TypeScript, Python, Rust, Go, Java, C++, Ruby, PHP, Swift, Kotlin, SQL
- **Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt, Gatsby, Three.js
- **Backend**: Express, Fastify, NestJS, Django, Flask, FastAPI, Rails, Spring
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, SQLite, Cassandra, Elasticsearch, DynamoDB
- **DevOps**: Docker, Kubernetes, Terraform, Ansible, Jenkins, GitHub Actions, GitLab CI, CircleCI
- **Cloud**: AWS, Azure, GCP, Vercel, Netlify, Heroku
- **Testing**: Jest, Vitest, Mocha, Pytest, Cypress, Playwright, Selenium
- **Build Tools**: Webpack, Vite, Rollup, esbuild, Turbopack
- **Patterns**: Microservices, Monorepo, Serverless, Event-driven, REST, GraphQL, gRPC, WebSocket
- **AI/ML**: TensorFlow, PyTorch, Scikit-learn, Transformers, Langchain, Ollama

## 🔍 How It Works

1. **Extraction**: Every interaction → extracts tech keywords
2. **Relations**: Co-occurring concepts → create/strengthen connections
3. **Clusters**: Related concepts → group into clusters (Frontend Stack, etc.)
4. **Gaps**: Known patterns → detect missing knowledge
5. **Suggestions**: Gaps → provide learning recommendations

## 📈 Metrics

- **Occurrence Count**: How often user mentions a concept
- **Relationship Strength**: 0-1 scale based on co-occurrence frequency
- **Cluster Coherence**: 0-1 scale of how related concepts are
- **Gap Confidence**: 0-1 scale of how likely gap is real

## 🎨 UI Ideas

1. **Interactive Graph**: D3.js force-directed graph of concepts
2. **Cluster View**: Cards showing related tech stacks
3. **Gap Alerts**: Suggestions for what to learn next
4. **Stats Dashboard**: Charts of concept usage over time
5. **Learning Path**: Suggested progression based on gaps

---

**Status**: ✅ Core complete, 3 manual steps to integrate, then ready to use!
