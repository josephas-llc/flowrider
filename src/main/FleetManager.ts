/**
 * FleetManager - Local Execution Orchestrator
 *
 * Manages discovery, connection, and coordination of multiple Flowrider instances.
 * Each Flowrider can manage 20 AI sessions, so LEO can orchestrate up to 400 sessions
 * (20 Flowriders × 20 sessions each).
 */

import * as http from 'http';
import * as dgram from 'dgram';
import * as os from 'os';

// LEO Protocol version
const LEO_VERSION = '1.0';
const LEO_PORT = 31337; // Discovery port
const LEO_API_PORT_BASE = 31338; // API base port

export interface LeoFlowriderInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'idle' | 'active' | 'busy' | 'error';
  activeSessions: number;
  totalSessions: number;
  lastPing: number;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
  version: string;
  capabilities: string[];
}

export interface LeoMessage {
  type: 'announce' | 'discover' | 'ping' | 'pong' | 'status' | 'command' | 'response';
  senderId: string;
  senderName: string;
  timestamp: number;
  version: string;
  payload?: unknown;
}

export interface LeoSessionInfo {
  flowriderId: string;
  faceIndex: number;
  name: string;
  status: 'empty' | 'active' | 'attached';
  workingDir: string;
  projectId?: string;
}

export class FleetManager {
  private instanceId: string;
  private instanceName: string;
  private discoverySocket: dgram.Socket | null = null;
  private apiServer: http.Server | null = null;
  private knownFlowriders: Map<string, LeoFlowriderInfo> = new Map();
  private isCoordinator: boolean = false;
  private enabled: boolean = false;
  private apiPort: number;
  private startTime: number;
  private onFlowriderDiscovered?: (fr: LeoFlowriderInfo) => void;
  private onFlowriderLost?: (id: string) => void;

  constructor() {
    this.instanceId = `fr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.instanceName = `Flowrider-${os.hostname().split('.')[0]}`;
    this.apiPort = LEO_API_PORT_BASE + Math.floor(Math.random() * 100);
    this.startTime = Date.now();
  }

  // ========================================
  // PUBLIC API
  // ========================================

  /**
   * Enable LEO mode and start discovery/networking
   */
  async enable(): Promise<{ success: boolean; error?: string }> {
    if (this.enabled) {
      return { success: true };
    }

    try {
      // Start UDP discovery listener
      await this.startDiscovery();

      // Start HTTP API server for direct communication
      await this.startApiServer();

      // Announce ourselves to the network
      this.broadcastAnnounce();

      this.enabled = true;
      console.log(`[LEO] Enabled. ID: ${this.instanceId}, API Port: ${this.apiPort}`);

      return { success: true };
    } catch (err) {
      console.error('[LEO] Failed to enable:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Disable LEO mode and stop all networking
   */
  async disable(): Promise<{ success: boolean }> {
    if (!this.enabled) {
      return { success: true };
    }

    // Close discovery socket
    if (this.discoverySocket) {
      this.discoverySocket.close();
      this.discoverySocket = null;
    }

    // Close API server
    if (this.apiServer) {
      this.apiServer.close();
      this.apiServer = null;
    }

    this.knownFlowriders.clear();
    this.enabled = false;
    console.log('[LEO] Disabled');

    return { success: true };
  }

  /**
   * Get current LEO status
   */
  getStatus(): {
    enabled: boolean;
    instanceId: string;
    instanceName: string;
    apiPort: number;
    isCoordinator: boolean;
    connectedFlowriders: number;
    totalCapacity: number;
    activeCapacity: number;
  } {
    const flowriders = Array.from(this.knownFlowriders.values());
    const activeCapacity = flowriders.reduce((sum, fr) => sum + fr.activeSessions, 0);
    const totalCapacity = flowriders.length * 20;

    return {
      enabled: this.enabled,
      instanceId: this.instanceId,
      instanceName: this.instanceName,
      apiPort: this.apiPort,
      isCoordinator: this.isCoordinator,
      connectedFlowriders: flowriders.length,
      totalCapacity,
      activeCapacity,
    };
  }

  /**
   * Get list of known flowriders
   */
  getFlowriders(): LeoFlowriderInfo[] {
    return Array.from(this.knownFlowriders.values());
  }

  /**
   * Get info about this instance
   */
  getSelfInfo(): LeoFlowriderInfo {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    return {
      id: this.instanceId,
      name: this.instanceName,
      host: this.getLocalIP(),
      port: this.apiPort,
      status: 'active',
      activeSessions: 0, // This would come from the store
      totalSessions: 20,
      lastPing: Date.now(),
      metrics: {
        cpuUsage,
        memoryUsage,
        uptime: Date.now() - this.startTime,
      },
      version: LEO_VERSION,
      capabilities: ['sessions', 'tmux', 'git'],
    };
  }

  /**
   * Discover flowriders on the network
   */
  async discoverFlowriders(): Promise<{ success: boolean; count: number }> {
    if (!this.enabled || !this.discoverySocket) {
      return { success: false, count: 0 };
    }

    const message: LeoMessage = {
      type: 'discover',
      senderId: this.instanceId,
      senderName: this.instanceName,
      timestamp: Date.now(),
      version: LEO_VERSION,
    };

    const buffer = Buffer.from(JSON.stringify(message));

    return new Promise((resolve) => {
      // Broadcast discovery request
      this.discoverySocket!.send(buffer, 0, buffer.length, LEO_PORT, '255.255.255.255', (err) => {
        if (err) {
          console.error('[LEO] Discovery broadcast failed:', err);
          resolve({ success: false, count: 0 });
        } else {
          console.log('[LEO] Discovery broadcast sent');
          // Give some time for responses
          setTimeout(() => {
            resolve({ success: true, count: this.knownFlowriders.size });
          }, 2000);
        }
      });
    });
  }

  /**
   * Ping a specific flowrider
   */
  async pingFlowrider(flowriderId: string): Promise<{ success: boolean; latency?: number }> {
    const flowrider = this.knownFlowriders.get(flowriderId);
    if (!flowrider) {
      return { success: false };
    }

    const startTime = Date.now();

    try {
      const response = await this.httpRequest(flowrider.host, flowrider.port, '/ping');
      const latency = Date.now() - startTime;

      if (response) {
        flowrider.lastPing = Date.now();
        return { success: true, latency };
      }
    } catch (err) {
      console.error(`[LEO] Ping failed for ${flowriderId}:`, err);
    }

    return { success: false };
  }

  /**
   * Get sessions from a remote flowrider
   */
  async getRemoteSessions(flowriderId: string): Promise<{ success: boolean; sessions?: LeoSessionInfo[] }> {
    const flowrider = this.knownFlowriders.get(flowriderId);
    if (!flowrider) {
      return { success: false };
    }

    try {
      const response = await this.httpRequest(flowrider.host, flowrider.port, '/sessions');
      if (response) {
        return { success: true, sessions: JSON.parse(response) };
      }
    } catch (err) {
      console.error(`[LEO] Get sessions failed for ${flowriderId}:`, err);
    }

    return { success: false };
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: {
    onFlowriderDiscovered?: (fr: LeoFlowriderInfo) => void;
    onFlowriderLost?: (id: string) => void;
  }) {
    this.onFlowriderDiscovered = handlers.onFlowriderDiscovered;
    this.onFlowriderLost = handlers.onFlowriderLost;
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async startDiscovery(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.discoverySocket.on('error', (err) => {
        console.error('[LEO] Discovery socket error:', err);
        reject(err);
      });

      this.discoverySocket.on('message', (msg, rinfo) => {
        this.handleDiscoveryMessage(msg, rinfo);
      });

      this.discoverySocket.bind(LEO_PORT, () => {
        this.discoverySocket!.setBroadcast(true);
        console.log(`[LEO] Discovery listening on port ${LEO_PORT}`);
        resolve();
      });
    });
  }

  private async startApiServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiServer = http.createServer((req, res) => {
        this.handleApiRequest(req, res);
      });

      this.apiServer.on('error', (err) => {
        console.error('[LEO] API server error:', err);
        reject(err);
      });

      this.apiServer.listen(this.apiPort, () => {
        console.log(`[LEO] API server listening on port ${this.apiPort}`);
        resolve();
      });
    });
  }

  private handleDiscoveryMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
    try {
      const message: LeoMessage = JSON.parse(msg.toString());

      // Ignore our own messages
      if (message.senderId === this.instanceId) {
        return;
      }

      console.log(`[LEO] Received ${message.type} from ${message.senderName} (${rinfo.address})`);

      switch (message.type) {
        case 'announce':
        case 'pong':
          this.handleAnnounce(message, rinfo);
          break;
        case 'discover':
          this.handleDiscoverRequest(message, rinfo);
          break;
        case 'ping':
          this.handlePingRequest(message, rinfo);
          break;
      }
    } catch (err) {
      // Ignore malformed messages
    }
  }

  private handleAnnounce(message: LeoMessage, rinfo: dgram.RemoteInfo) {
    const payload = message.payload as Partial<LeoFlowriderInfo> | undefined;

    const flowrider: LeoFlowriderInfo = {
      id: message.senderId,
      name: message.senderName,
      host: rinfo.address,
      port: payload?.port || LEO_API_PORT_BASE,
      status: payload?.status || 'active',
      activeSessions: payload?.activeSessions || 0,
      totalSessions: payload?.totalSessions || 20,
      lastPing: Date.now(),
      metrics: payload?.metrics || { cpuUsage: 0, memoryUsage: 0, uptime: 0 },
      version: message.version,
      capabilities: payload?.capabilities || [],
    };

    const isNew = !this.knownFlowriders.has(flowrider.id);
    this.knownFlowriders.set(flowrider.id, flowrider);

    if (isNew && this.onFlowriderDiscovered) {
      this.onFlowriderDiscovered(flowrider);
    }
  }

  private handleDiscoverRequest(message: LeoMessage, rinfo: dgram.RemoteInfo) {
    // Respond with our info
    const response: LeoMessage = {
      type: 'pong',
      senderId: this.instanceId,
      senderName: this.instanceName,
      timestamp: Date.now(),
      version: LEO_VERSION,
      payload: this.getSelfInfo(),
    };

    const buffer = Buffer.from(JSON.stringify(response));
    this.discoverySocket?.send(buffer, 0, buffer.length, LEO_PORT, rinfo.address);
  }

  private handlePingRequest(message: LeoMessage, rinfo: dgram.RemoteInfo) {
    const response: LeoMessage = {
      type: 'pong',
      senderId: this.instanceId,
      senderName: this.instanceName,
      timestamp: Date.now(),
      version: LEO_VERSION,
      payload: { replyTo: message.senderId },
    };

    const buffer = Buffer.from(JSON.stringify(response));
    this.discoverySocket?.send(buffer, 0, buffer.length, LEO_PORT, rinfo.address);
  }

  private broadcastAnnounce() {
    if (!this.discoverySocket) return;

    const message: LeoMessage = {
      type: 'announce',
      senderId: this.instanceId,
      senderName: this.instanceName,
      timestamp: Date.now(),
      version: LEO_VERSION,
      payload: this.getSelfInfo(),
    };

    const buffer = Buffer.from(JSON.stringify(message));
    this.discoverySocket.send(buffer, 0, buffer.length, LEO_PORT, '255.255.255.255', (err) => {
      if (err) {
        console.error('[LEO] Announce broadcast failed:', err);
      } else {
        console.log('[LEO] Announced on network');
      }
    });
  }

  private handleApiRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url || '/';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    switch (url) {
      case '/ping':
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, timestamp: Date.now() }));
        break;

      case '/info':
        res.writeHead(200);
        res.end(JSON.stringify(this.getSelfInfo()));
        break;

      case '/sessions':
        // Would return actual sessions from the store
        res.writeHead(200);
        res.end(JSON.stringify([]));
        break;

      case '/status':
        res.writeHead(200);
        res.end(JSON.stringify(this.getStatus()));
        break;

      default:
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private httpRequest(host: string, port: number, path: string): Promise<string | null> {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: host,
        port,
        path,
        method: 'GET',
        timeout: 5000,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(data); });
      });

      req.on('error', () => { resolve(null); });
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    });
  }

  private getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Cleanup stale flowriders (not seen in 30 seconds)
   */
  cleanupStaleFlowriders() {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds

    for (const [id, fr] of this.knownFlowriders.entries()) {
      if (now - fr.lastPing > staleThreshold) {
        this.knownFlowriders.delete(id);
        if (this.onFlowriderLost) {
          this.onFlowriderLost(id);
        }
        console.log(`[LEO] Flowrider ${fr.name} marked as stale`);
      }
    }
  }
}
