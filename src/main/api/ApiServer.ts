import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server } from 'http';
import { app as electronApp } from 'electron';
import { registerRoutes, getRouteSummary } from './routes';

/**
 * Configuration options for the API server
 */
export interface ApiServerConfig {
  port: number;
  enableCors?: boolean;
  corsOrigins?: string[];
  logRequests?: boolean;
}

/**
 * Default configuration for the API server
 */
const DEFAULT_CONFIG: ApiServerConfig = {
  port: 3847,
  enableCors: true,
  corsOrigins: ['http://localhost:3000', 'http://localhost:5174', 'http://localhost:5173'],
  logRequests: true,
};

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  path: string;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
  version: string;
}

/**
 * Version response
 */
export interface VersionResponse {
  name: string;
  version: string;
  electron: string;
  node: string;
  chrome: string;
}

/**
 * ApiServer - Express-based REST API server for Flowrider
 *
 * This server runs inside the Electron main process and provides
 * HTTP endpoints for external integrations and tooling.
 *
 * Features:
 * - Express.js HTTP server
 * - CORS support for localhost
 * - JSON body parsing
 * - Request logging middleware
 * - Rate limiting (100 req/15min general, 5 req/15min for auth endpoints)
 * - Global error handling
 * - Health check endpoint
 * - Version endpoint
 * - Singleton pattern
 * - Lifecycle integration with Electron
 */
export class ApiServer {
  private static instance: ApiServer | null = null;
  private app: Express;
  private server: Server | null = null;
  private config: ApiServerConfig;
  private startTime: number = Date.now();
  private isRunning: boolean = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: Partial<ApiServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Get the singleton instance of ApiServer
   */
  public static getInstance(config?: Partial<ApiServerConfig>): ApiServer {
    if (!ApiServer.instance) {
      ApiServer.instance = new ApiServer(config);
    }
    return ApiServer.instance;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  public static resetInstance(): void {
    if (ApiServer.instance) {
      ApiServer.instance.stop();
      ApiServer.instance = null;
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS middleware
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: this.config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
      }));
    }

    // JSON body parser
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    if (this.config.logRequests) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        // Log request
        console.log(`[API] ${req.method} ${req.path}`);

        // Log response when finished
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });

        next();
      });
    }

    // General API rate limiting
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: { success: false, error: 'Too many requests, please try again later' },
      standardHeaders: true, // Return rate limit info in RateLimit-* headers
      legacyHeaders: false, // Disable X-RateLimit-* headers
    });

    // Stricter rate limiting for API key management endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Only 5 attempts per window
      message: { success: false, error: 'Too many authentication attempts' },
      skipSuccessfulRequests: true, // Don't count successful requests
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply general rate limiting to all /api routes
    this.app.use('/api/', apiLimiter);

    // Apply stricter rate limiting to API key management routes
    this.app.use('/api/keys', authLimiter);

    // Request timestamp middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      (req as any).timestamp = new Date().toISOString();
      next();
    });
  }

  /**
   * Setup core API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/api/health', (req: Request, res: Response) => {
      const uptime = Date.now() - this.startTime;
      const response: HealthResponse = {
        status: 'ok',
        uptime: uptime,
        timestamp: new Date().toISOString(),
        version: electronApp.getVersion(),
      };
      res.json(response);
    });

    // Version endpoint
    this.app.get('/api/version', (req: Request, res: Response) => {
      const response: VersionResponse = {
        name: electronApp.getName(),
        version: electronApp.getVersion(),
        electron: process.versions.electron || 'unknown',
        node: process.versions.node,
        chrome: process.versions.chrome || 'unknown',
      };
      res.json(response);
    });

    // Root endpoint - shows API overview
    this.app.get('/api', (req: Request, res: Response) => {
      const summary = getRouteSummary();
      res.json({
        message: 'Flowrider API Server',
        version: electronApp.getVersion(),
        documentation: `http://localhost:${this.config.port}/api/docs`,
        routes: summary,
      });
    });

    // Register all API routes (docs, projects, apikeys, etc.)
    registerRoutes(this.app);

    // 404 handler for unknown routes (must be last)
    this.app.use((req: Request, res: Response) => {
      const error: ErrorResponse = {
        success: false,
        error: `Route not found: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
        path: req.path,
      };
      res.status(404).json(error);
    });
  }

  /**
   * Setup global error handling middleware
   */
  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[API] Error:', err);

      const response: ErrorResponse = {
        success: false,
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.path,
      };

      res.status(500).json(response);
    });
  }

  /**
   * Start the API server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[API] Server already running on port ${this.config.port}`);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          this.isRunning = true;
          this.startTime = Date.now();
          console.log(`[API] Server started on http://localhost:${this.config.port}`);
          console.log(`[API] Health check: http://localhost:${this.config.port}/api/health`);
          resolve();
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`[API] Port ${this.config.port} is already in use`);
          } else {
            console.error('[API] Server error:', error);
          }
          this.isRunning = false;
          reject(error);
        });
      } catch (error) {
        console.error('[API] Failed to start server:', error);
        this.isRunning = false;
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      console.log('[API] Server not running');
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          console.error('[API] Error stopping server:', err);
          reject(err);
        } else {
          this.isRunning = false;
          this.server = null;
          console.log('[API] Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance for registering additional routes
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Check if the server is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ApiServerConfig {
    return { ...this.config };
  }

  /**
   * Get the server uptime in milliseconds
   */
  public getUptime(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Get the singleton ApiServer instance
 */
export function getApiServer(config?: Partial<ApiServerConfig>): ApiServer {
  return ApiServer.getInstance(config);
}

/**
 * Start the API server
 */
export async function startApiServer(config?: Partial<ApiServerConfig>): Promise<ApiServer> {
  const server = getApiServer(config);
  await server.start();
  return server;
}

/**
 * Stop the API server
 */
export async function stopApiServer(): Promise<void> {
  const server = ApiServer.getInstance();
  await server.stop();
}
