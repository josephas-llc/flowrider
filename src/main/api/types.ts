/**
 * REST API Type Definitions
 *
 * Shared types for the Flowrider REST API.
 * Can be imported by both server and client code.
 */

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create session request body
 */
export interface CreateSessionRequest {
  /** Session name (user-friendly) */
  name: string;
  /** Face index on icosahedron (0-19) */
  faceIndex: number;
  /** Working directory path */
  workingDir: string;
  /** Optional project identifier */
  projectId?: string;
  /** Optional programming language */
  language?: string;
  /** Optional AI provider */
  provider?: string;
}

/**
 * Update session request body
 */
export interface UpdateSessionRequest {
  /** New session name */
  name?: string;
  /** New working directory */
  workingDir?: string;
  /** Session notes */
  notes?: string;
  /** Session status */
  status?: 'empty' | 'active' | 'attached';
}

/**
 * Send message request body
 */
export interface SendMessageRequest {
  /** Message to send to the AI session */
  message: string;
}

/**
 * Restart session request body
 */
export interface RestartSessionRequest {
  /** New working directory (optional) */
  workingDir?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request succeeded */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Session information
 */
export interface SessionInfo {
  /** Unique session ID (tmux session name) */
  id: string;
  /** User-friendly session name */
  name: string;
  /** Face index on icosahedron (0-19) */
  faceIndex: number;
  /** ISO timestamp of when session was created */
  created: string;
  /** Whether session is currently attached */
  attached: boolean;
  /** Optional project identifier */
  projectId?: string;
  /** Optional programming language */
  language?: string;
  /** Working directory */
  workingDir?: string;
  /** Whether session is being monitored by AI System */
  isMonitored: boolean;
}

/**
 * Session output response
 */
export interface SessionOutputResponse {
  /** Terminal output */
  output: string;
  /** Number of lines retrieved */
  lines: number;
  /** Unix timestamp of when output was captured */
  timestamp: number;
}

/**
 * Simple message response
 */
export interface MessageResponse {
  /** Message text */
  message: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  /** Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Server uptime in seconds */
  uptime: number;
  /** Current timestamp */
  timestamp: number;
}

/**
 * API info response
 */
export interface ApiInfoResponse {
  /** API name */
  name: string;
  /** API version */
  version: string;
  /** Available endpoints */
  endpoints: {
    sessions: {
      list: string;
      get: string;
      create: string;
      update: string;
      delete: string;
      send: string;
      output: string;
      restart: string;
    };
    health: string;
  };
  /** Documentation link */
  documentation: string;
}

// ============================================
// CLIENT HELPER TYPES
// ============================================

/**
 * Query parameters for session output endpoint
 */
export interface SessionOutputQuery {
  /** Number of lines to retrieve (default: 500) */
  lines?: number;
}

/**
 * Session list response
 */
export type SessionListResponse = ApiResponse<SessionInfo[]>;

/**
 * Session response
 */
export type SessionResponse = ApiResponse<SessionInfo>;

/**
 * Delete response
 */
export type DeleteResponse = ApiResponse<MessageResponse>;

/**
 * Send message response
 */
export type SendMessageResponse = ApiResponse<MessageResponse>;

/**
 * Output response
 */
export type OutputResponse = ApiResponse<SessionOutputResponse>;

// ============================================
// ERROR TYPES
// ============================================

/**
 * API error codes
 */
export enum ApiErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SESSION_EXISTS = 'SESSION_EXISTS',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  TMUX_ERROR = 'TMUX_ERROR',
}

/**
 * Detailed API error
 */
export interface ApiError {
  /** Error code */
  code: ApiErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate face index
 */
export function isValidFaceIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= 19;
}

/**
 * Validate session name
 */
export function isValidSessionName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name.length <= 100;
}

/**
 * Validate working directory
 */
export function isValidWorkingDir(dir: string): boolean {
  return typeof dir === 'string' && dir.length > 0;
}

/**
 * Validate create session request
 */
export function validateCreateSessionRequest(
  req: unknown
): req is CreateSessionRequest {
  const r = req as CreateSessionRequest;
  return (
    typeof r === 'object' &&
    r !== null &&
    isValidSessionName(r.name) &&
    isValidFaceIndex(r.faceIndex) &&
    isValidWorkingDir(r.workingDir)
  );
}

/**
 * Validate send message request
 */
export function validateSendMessageRequest(
  req: unknown
): req is SendMessageRequest {
  const r = req as SendMessageRequest;
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.message === 'string' &&
    r.message.length > 0
  );
}
