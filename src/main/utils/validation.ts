import { z } from 'zod';

// ============================================
// Session Schemas
// ============================================

export const sessionNameSchema = z.string()
  .min(1, 'Session name is required')
  .max(100, 'Session name must be 100 characters or less')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Session name can only contain letters, numbers, dashes, and underscores');

export const faceIndexSchema = z.number()
  .int('Face index must be an integer')
  .min(0, 'Face index must be at least 0')
  .max(19, 'Face index must be at most 19');

export const workingDirSchema = z.string()
  .min(1, 'Working directory is required')
  .refine((path) => {
    // Basic path validation - no shell metacharacters
    return !/[;&|`$(){}]/.test(path);
  }, 'Working directory contains invalid characters');

export const createSessionSchema = z.object({
  name: sessionNameSchema,
  faceIndex: faceIndexSchema,
  workingDir: workingDirSchema,
});

export const sendInputSchema = z.object({
  sessionId: sessionNameSchema,
  input: z.string().max(10000, 'Input too long'),
});

export const outputLinesSchema = z.number()
  .int('Lines must be an integer')
  .min(1, 'Lines must be at least 1')
  .max(10000, 'Lines must be at most 10000');

// ============================================
// API Schemas
// ============================================

export const apiKeySchema = z.string()
  .regex(/^fr_(live|test)_[a-f0-9]{64}$/, 'Invalid API key format');

export const portSchema = z.number()
  .int('Port must be an integer')
  .min(1024, 'Port must be at least 1024')
  .max(65535, 'Port must be at most 65535');

export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    // Disallow file:// and other dangerous protocols
    return url.startsWith('http://') || url.startsWith('https://');
  }, 'URL must use http or https protocol');

// ============================================
// Webhook Schemas
// ============================================

export const webhookUrlSchema = z.string()
  .url('Invalid webhook URL')
  .refine((url) => {
    return url.startsWith('http://') || url.startsWith('https://');
  }, 'Webhook URL must use http or https protocol');

export const webhookEventSchema = z.enum([
  'session.created',
  'session.completed',
  'session.error',
  'session.output',
  'project.created',
  'project.updated',
]);

export const webhookIdSchema = z.string()
  .min(1, 'Webhook ID is required')
  .max(100, 'Webhook ID too long');

export const createWebhookSchema = z.object({
  url: webhookUrlSchema,
  events: z.array(webhookEventSchema).min(1, 'At least one event is required'),
  secret: z.string().max(256, 'Secret too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  events: z.array(webhookEventSchema).min(1, 'At least one event is required').optional(),
  secret: z.string().max(256, 'Secret too long').optional(),
  active: z.boolean().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================
// AI Service Schemas
// ============================================

// All supported AI providers (matches AIProvider type from shared/ai-types.ts)
export const aiProviderSchema = z.enum([
  'zoix', 'claude', 'openai', 'ollama', 'gemini', 'grok', 'mistral', 'kimi',
  'deepseek', 'cohere', 'qwen', 'yi', 'falcon', 'hunyuan', 'local'
]);

export const aiMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(100000, 'Message content too long'),
});

export const aiCallSchema = z.object({
  provider: aiProviderSchema,
  model: z.string().max(100, 'Model name too long').optional(),
  messages: z.array(aiMessageSchema).min(1, 'At least one message is required'),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().max(50000, 'System prompt too long').optional(),
});

export const setApiKeySchema = z.object({
  provider: aiProviderSchema,
  key: z.string().min(1, 'API key is required').max(500, 'API key too long'),
});

// ============================================
// License Schemas
// ============================================

export const licenseKeySchema = z.string()
  .min(1, 'License key is required')
  .max(500, 'License key too long');

// ============================================
// Template Schemas
// ============================================

export const templateIdSchema = z.string()
  .min(1, 'Template ID is required')
  .max(100, 'Template ID too long');

export const templateCategorySchema = z.enum([
  'frontend',
  'backend',
  'fullstack',
  'data',
  'devops',
  'mobile',
  'ai',
  'other',
]);

// ============================================
// Deployment Schemas
// ============================================

export const repoNameSchema = z.string()
  .min(1, 'Repository name is required')
  .max(100, 'Repository name too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Repository name can only contain letters, numbers, dashes, and underscores');

export const workflowIdSchema = z.number()
  .int('Workflow ID must be an integer')
  .positive('Workflow ID must be positive');

export const prNumberSchema = z.number()
  .int('PR number must be an integer')
  .positive('PR number must be positive');

export const tagNameSchema = z.string()
  .min(1, 'Tag name is required')
  .max(100, 'Tag name too long')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Tag name can only contain letters, numbers, dots, dashes, and underscores');

export const mergeMethodSchema = z.enum(['merge', 'squash', 'rebase']);

export const prStateSchema = z.enum(['open', 'closed', 'all']);

// ============================================
// LEO AI Schemas
// ============================================

export const sessionIdSchema = z.string()
  .min(1, 'Session ID is required')
  .max(100, 'Session ID too long');

export const projectIdSchema = z.string()
  .max(100, 'Project ID too long')
  .optional();

export const languageSchema = z.string()
  .max(50, 'Language too long')
  .optional();

export const feedbackSchema = z.object({
  type: z.string().max(50, 'Feedback type too long'),
  value: z.number().min(-1).max(1),
  context: z.string().max(1000, 'Feedback context too long').optional(),
});

// ============================================
// Cross-Session Schemas
// ============================================

export const updateActivitySchema = z.object({
  currentTask: z.string().max(500, 'Task description too long').optional(),
  status: z.string().max(50, 'Status too long').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional(),
});

export const filePathSchema = z.string()
  .min(1, 'File path is required')
  .max(1000, 'File path too long')
  .refine((path) => {
    // Basic path validation - no shell metacharacters
    return !/[;&|`$(){}]/.test(path);
  }, 'File path contains invalid characters');

export const errorMessageSchema = z.string()
  .min(1, 'Error message is required')
  .max(10000, 'Error message too long');

export const solutionSchema = z.string()
  .min(1, 'Solution is required')
  .max(10000, 'Solution too long');

// ============================================
// Helper to validate and throw descriptive errors
// ============================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}

// ============================================
// Helper to validate and return error response
// ============================================

export function validateWithResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Validation failed: ${errors}` };
  }
  return { success: true, data: result.data };
}
