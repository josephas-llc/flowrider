/**
 * UserProfiler Usage Examples
 *
 * This file demonstrates how to use the UserProfiler service
 * in ZOIX's User Intelligence Layer.
 */

import { getUserProfiler } from './UserProfiler.integration';

// ============================================
// Example 1: Record User Activity
// ============================================

export function exampleRecordActivity() {
  const profiler = getUserProfiler();

  // Record a coding session with React
  profiler.recordActivity(
    'session-123',
    'code',
    `
      import React, { useState, useEffect } from 'react';

      function MyComponent() {
        const [data, setData] = useState([]);

        useEffect(() => {
          fetchData();
        }, []);

        return <div>{data.map(item => <p key={item.id}>{item.name}</p>)}</div>;
      }
    `,
    'success',
    5000 // 5 seconds duration
  );

  // Record an error with Python
  profiler.recordActivity(
    'session-124',
    'error',
    `
      import pandas as pd

      df = pd.read_csv('data.csv')
      df.groupby('category').sum()  # TypeError: unsupported operand
    `,
    'failure',
    15000 // 15 seconds trying to fix
  );

  // Record successful documentation search
  profiler.recordActivity(
    'session-124',
    'documentation',
    'Searched for pandas groupby documentation, learned about agg() function',
    'success',
    3000
  );
}

// ============================================
// Example 2: Update Interests Manually
// ============================================

export function exampleUpdateInterests() {
  const profiler = getUserProfiler();

  // User is working heavily with Docker
  profiler.updateInterest('docker', 15);

  // User mentions Kubernetes in passing
  profiler.updateInterest('kubernetes', 5);

  // User deep-dives into React performance
  profiler.updateInterest('react', 20);
}

// ============================================
// Example 3: Get User Profile
// ============================================

export function exampleGetProfile() {
  const profiler = getUserProfiler();
  const profile = profiler.getProfile();

  console.log('User Profile:');
  console.log('Total Activities:', profile.totalActivities);
  console.log('Primary Domains:', profile.domains.map(d => d.name));
  console.log('Learning Goals:', profile.learningGoals);
  console.log('Strengths:', profile.strengths);
  console.log('Growth Areas:', profile.growthAreas);

  // Access detailed interests
  profile.interests.forEach(interest => {
    console.log(`${interest.topic}: weight=${interest.weight.toFixed(2)}, occurrences=${interest.occurrences}`);
  });
}

// ============================================
// Example 4: Get Top Interests
// ============================================

export function exampleGetTopInterests() {
  const profiler = getUserProfiler();
  const topInterests = profiler.getTopInterests(5);

  console.log('Top 5 Interests:');
  topInterests.forEach((interest, idx) => {
    console.log(`${idx + 1}. ${interest.topic} (weight: ${interest.weight.toFixed(2)})`);
  });
}

// ============================================
// Example 5: Get Learning Trajectory
// ============================================

export function exampleGetLearningTrajectory() {
  const profiler = getUserProfiler();
  const trajectory = profiler.getLearningTrajectory();

  console.log('Learning Trajectory:');
  trajectory.forEach(progression => {
    console.log(`${progression.topic}:`);
    console.log(`  Level: ${progression.level}`);
    console.log(`  Trajectory: ${progression.trajectory}`);
    console.log(`  Success Rate: ${(progression.successRate * 100).toFixed(1)}%`);
    console.log(`  Error Rate: ${(progression.errorRate * 100).toFixed(1)}%`);
    console.log(`  Complexity: ${progression.complexity.toFixed(1)}/100`);
  });
}

// ============================================
// Example 6: Get Domains
// ============================================

export function exampleGetDomains() {
  const profiler = getUserProfiler();
  const domains = profiler.getDomains();

  console.log('User Domains:');
  domains.forEach(domain => {
    console.log(`${domain.name} (${domain.type}):`);
    console.log(`  Confidence: ${(domain.confidence * 100).toFixed(1)}%`);
    console.log(`  Topics: ${domain.topics.join(', ')}`);
  });
}

// ============================================
// Example 7: Track a Complete Session
// ============================================

export function exampleTrackSession() {
  const profiler = getUserProfiler();
  const sessionId = 'session-' + Date.now();

  // User starts with React
  profiler.recordActivity(
    sessionId,
    'code',
    'Created new React component with useState and useEffect hooks',
    'success',
    8000
  );

  // Encounters a TypeScript error
  profiler.recordActivity(
    sessionId,
    'error',
    'Type error: Property does not exist on type {}',
    'failure',
    12000
  );

  // Searches documentation
  profiler.recordActivity(
    sessionId,
    'documentation',
    'Looked up TypeScript interface definitions',
    'success',
    5000
  );

  // Fixes the error
  profiler.recordActivity(
    sessionId,
    'code',
    'Added proper TypeScript interface for component props',
    'success',
    6000
  );

  // Get session activities
  const activities = profiler.getActivitiesBySession(sessionId);
  console.log(`Session ${sessionId} had ${activities.length} activities`);
}

// ============================================
// Example 8: Analyze Strengths and Growth Areas
// ============================================

export function exampleAnalyzeSkills() {
  const profiler = getUserProfiler();

  const strengths = profiler.getStrengths();
  const growthAreas = profiler.getGrowthAreas();
  const learningGoals = profiler.getLearningGoals();

  console.log('Skill Analysis:');
  console.log('\nStrengths (high success, low errors):');
  strengths.forEach(topic => console.log(`  - ${topic}`));

  console.log('\nGrowth Areas (high error rate):');
  growthAreas.forEach(topic => console.log(`  - ${topic}`));

  console.log('\nCurrent Learning Goals:');
  learningGoals.forEach(topic => console.log(`  - ${topic}`));
}

// ============================================
// Example 9: Simulate Interest Decay
// ============================================

export function exampleInterestDecay() {
  const profiler = getUserProfiler();

  console.log('Before decay:');
  const beforeInterests = profiler.getTopInterests(3);
  beforeInterests.forEach(i => console.log(`${i.topic}: ${i.weight.toFixed(2)}`));

  // Manually trigger decay (normally happens automatically)
  profiler.applyInterestDecay();

  console.log('\nAfter decay:');
  const afterInterests = profiler.getTopInterests(3);
  afterInterests.forEach(i => console.log(`${i.topic}: ${i.weight.toFixed(2)}`));
}

// ============================================
// Run all examples
// ============================================

export function runAllExamples() {
  console.log('='.repeat(50));
  console.log('UserProfiler Examples');
  console.log('='.repeat(50));

  exampleRecordActivity();
  exampleUpdateInterests();
  exampleGetProfile();
  exampleGetTopInterests();
  exampleGetLearningTrajectory();
  exampleGetDomains();
  exampleTrackSession();
  exampleAnalyzeSkills();
  exampleInterestDecay();
}
