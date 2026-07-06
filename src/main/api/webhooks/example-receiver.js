/**
 * Example Webhook Receiver
 *
 * Simple Express server that receives and validates Flowrider webhooks
 * Run with: node example-receiver.js
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const SECRET = 'your-secret-key'; // Must match the secret in your webhook config

// Middleware to capture raw body for signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Verify HMAC signature
function verifySignature(payload, signature, secret) {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const eventType = req.headers['x-webhook-event'];
  const eventId = req.headers['x-webhook-id'];
  const timestamp = req.headers['x-webhook-timestamp'];

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 Webhook Received');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Event Type: ${eventType}`);
  console.log(`Event ID: ${eventId}`);
  console.log(`Timestamp: ${new Date(parseInt(timestamp)).toISOString()}`);

  // Verify signature if provided
  if (signature) {
    const isValid = verifySignature(req.rawBody, signature, SECRET);

    if (!isValid) {
      console.log('❌ Invalid signature!');
      console.log(`Expected secret: ${SECRET}`);
      console.log(`Received signature: ${signature}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');
  } else {
    console.log('⚠️  No signature provided (webhook has no secret)');
  }

  // Log payload
  console.log('\nPayload:');
  console.log(JSON.stringify(req.body, null, 2));

  // Process different event types
  switch (eventType) {
    case 'session.created':
      handleSessionCreated(req.body);
      break;
    case 'session.completed':
      handleSessionCompleted(req.body);
      break;
    case 'session.error':
      handleSessionError(req.body);
      break;
    case 'session.output':
      handleSessionOutput(req.body);
      break;
    case 'project.created':
      handleProjectCreated(req.body);
      break;
    case 'project.updated':
      handleProjectUpdated(req.body);
      break;
    default:
      console.log(`⚠️  Unknown event type: ${eventType}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Respond quickly (important for webhook delivery success)
  res.status(200).json({ received: true, eventId });
});

// Event handlers
function handleSessionCreated(payload) {
  console.log('🎬 Session Created');
  console.log(`  Session: ${payload.data.sessionName}`);
  console.log(`  Face: ${payload.data.faceIndex}`);
  console.log(`  Directory: ${payload.data.workingDir}`);

  // Your custom logic here
  // - Send notification to Slack
  // - Update dashboard
  // - Log to analytics
  // - Trigger CI/CD pipeline
}

function handleSessionCompleted(payload) {
  console.log('🏁 Session Completed');
  console.log(`  Session ID: ${payload.data.sessionId}`);

  // Your custom logic here
  // - Clean up resources
  // - Save session metrics
  // - Archive session data
}

function handleSessionError(payload) {
  console.log('❌ Session Error');
  console.log(`  Session ID: ${payload.data.sessionId}`);
  console.log(`  Error: ${payload.data.error}`);

  // Your custom logic here
  // - Alert on-call engineer
  // - Create incident ticket
  // - Log to error tracking service (Sentry, etc.)
}

function handleSessionOutput(payload) {
  console.log('📄 Session Output');
  console.log(`  Session ID: ${payload.data.sessionId}`);
  console.log(`  Output length: ${payload.data.output.length} chars`);

  // Your custom logic here
  // - Parse for keywords
  // - Detect errors or warnings
  // - Stream to log aggregator
  // Note: This can be HIGH VOLUME
}

function handleProjectCreated(payload) {
  console.log('📦 Project Created');
  console.log(`  Project: ${payload.data.projectName}`);
  console.log(`  ID: ${payload.data.projectId}`);

  // Your custom logic here
  // - Initialize project resources
  // - Set up monitoring
  // - Create project in external systems
}

function handleProjectUpdated(payload) {
  console.log('📝 Project Updated');
  console.log(`  Project ID: ${payload.data.projectId}`);
  console.log(`  Updates:`, payload.data.updates);

  // Your custom logic here
  // - Sync with external systems
  // - Invalidate caches
  // - Update project status
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: Date.now(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>Flowrider Webhook Receiver</h1>
    <p>This server is ready to receive webhooks from Flowrider.</p>
    <h2>Endpoints:</h2>
    <ul>
      <li><code>POST /webhook</code> - Receive webhooks</li>
      <li><code>GET /health</code> - Health check</li>
    </ul>
    <h2>Configuration:</h2>
    <ul>
      <li>Port: ${PORT}</li>
      <li>Secret: ${SECRET ? '***configured***' : 'not set'}</li>
    </ul>
    <h2>Setup in Flowrider:</h2>
    <pre>
window.api.webhooks.create({
  url: 'http://localhost:${PORT}/webhook',
  events: ['session.created', 'session.completed'],
  secret: '${SECRET}', // Optional but recommended
  description: 'Local development webhook',
});
    </pre>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Flowrider Webhook Receiver Running      ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Secret: ${SECRET ? '***configured***' : 'NOT SET (insecure)'}`);
  console.log('\n📝 Create webhook in Flowrider:');
  console.log('```javascript');
  console.log(`window.api.webhooks.create({`);
  console.log(`  url: 'http://localhost:${PORT}/webhook',`);
  console.log(`  events: ['session.created', 'session.completed', 'session.error'],`);
  console.log(`  secret: '${SECRET}',`);
  console.log(`  description: 'Local development webhook',`);
  console.log(`});`);
  console.log('```');
  console.log('\n👀 Waiting for webhooks...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down webhook receiver...');
  process.exit(0);
});
