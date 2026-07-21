/**
 * UserProfiler Integration Module
 *
 * Provides integration methods for UserProfiler with AICore
 */

import getUserProfilerInstance, { UserProfiler, UserProfile, Interest, Domain, SkillProgression } from './UserProfiler';

export function getUserProfiler(userId?: string): ReturnType<typeof getUserProfilerInstance> {
  return getUserProfilerInstance(userId);
}

export function shutdownUserProfiler(): void {
  UserProfiler.shutdown();
}

// Export types for IPC
export type { UserProfile, Interest, Domain, SkillProgression } from './UserProfiler';
