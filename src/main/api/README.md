# Flowrider REST API

REST API for managing Flowrider AI sessions programmatically.

## Overview

The Session REST API provides endpoints to create, manage, and interact with tmux-based AI sessions. This allows external tools and integrations to control Flowrider sessions via HTTP.

## Base URL

When running locally: `http://localhost:31339/api`

## Authentication

Currently no authentication is required. CORS is enabled for all origins.

## Endpoints

### List All Sessions

**GET** `/api/sessions`

Returns all active tmux sessions managed by Flowrider.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fr2-0-my-session",
      "name": "fr2-0-my-session",
      "faceIndex": 0,
      "created": "2024-01-01T00:00:00.000Z",
      "attached": false,
      "projectId": "project-123",
      "language": "typescript",
      "workingDir": "/Users/john/projects/myapp",
      "isMonitored": true
    }
  ]
}
```

### Get Session by ID

**GET** `/api/sessions/:id`

Get details for a specific session.

**Parameters:**
- `id` (path) - Session ID (tmux session name)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "fr2-0-my-session",
    "name": "fr2-0-my-session",
    "faceIndex": 0,
    "created": "2024-01-01T00:00:00.000Z",
    "attached": false,
    "projectId": "project-123",
    "language": "typescript",
    "workingDir": "/Users/john/projects/myapp",
    "isMonitored": true
  }
}
```

### Create New Session

**POST** `/api/sessions`

Create a new AI session.

**Request Body:**
```json
{
  "name": "my-session",
  "faceIndex": 0,
  "workingDir": "/Users/john/projects/myapp",
  "projectId": "project-123",
  "language": "typescript",
  "provider": "claude"
}
```

**Required Fields:**
- `name` - Session name
- `faceIndex` - Face index (0-19)
- `workingDir` - Working directory path

**Optional Fields:**
- `projectId` - Project identifier
- `language` - Programming language
- `provider` - AI provider name

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "fr2-0-my-session",
    "name": "fr2-0-my-session",
    "faceIndex": 0,
    "created": "2024-01-01T00:00:00.000Z",
    "attached": false,
    "projectId": "project-123",
    "language": "typescript",
    "workingDir": "/Users/john/projects/myapp",
    "isMonitored": true
  }
}
```

### Update Session

**PUT** `/api/sessions/:id`

Update session properties.

**Request Body:**
```json
{
  "name": "updated-session-name",
  "workingDir": "/new/working/dir",
  "notes": "Some notes about this session"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "fr2-0-my-session",
    "name": "updated-session-name",
    ...
  }
}
```

### Delete Session

**DELETE** `/api/sessions/:id`

Kill and remove a session.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Session deleted successfully"
  }
}
```

### Send Message to Session

**POST** `/api/sessions/:id/send`

Send a message/command to a session.

**Request Body:**
```json
{
  "message": "Create a new React component called Button"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Message sent successfully"
  }
}
```

### Get Session Output

**GET** `/api/sessions/:id/output?lines=500`

Get terminal output from a session.

**Query Parameters:**
- `lines` (optional) - Number of lines to retrieve (default: 500)

**Response:**
```json
{
  "success": true,
  "data": {
    "output": "Terminal output here...",
    "lines": 500,
    "timestamp": 1704067200000
  }
}
```

### Restart Session

**POST** `/api/sessions/:id/restart`

Restart a session (kill and recreate).

**Request Body (optional):**
```json
{
  "workingDir": "/new/working/dir"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "fr2-0-my-session",
    "name": "fr2-0-my-session",
    ...
  }
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## Integration Examples

### curl

```bash
# List all sessions
curl http://localhost:31339/api/sessions

# Create a session
curl -X POST http://localhost:31339/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-session",
    "faceIndex": 0,
    "workingDir": "/Users/john/projects/myapp"
  }'

# Send a message
curl -X POST http://localhost:31339/api/sessions/fr2-0-my-session/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Write a hello world script"
  }'

# Get output
curl http://localhost:31339/api/sessions/fr2-0-my-session/output?lines=100

# Delete session
curl -X DELETE http://localhost:31339/api/sessions/fr2-0-my-session
```

### JavaScript/TypeScript

```typescript
// Create a session
const response = await fetch('http://localhost:31339/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'my-session',
    faceIndex: 0,
    workingDir: '/Users/john/projects/myapp',
    projectId: 'project-123',
  }),
});

const result = await response.json();
console.log(result.data);

// Send a message
await fetch('http://localhost:31339/api/sessions/fr2-0-my-session/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Create a new component',
  }),
});

// Get output
const outputResponse = await fetch(
  'http://localhost:31339/api/sessions/fr2-0-my-session/output?lines=100'
);
const outputResult = await outputResponse.json();
console.log(outputResult.data.output);
```

### Python

```python
import requests

# Create a session
response = requests.post('http://localhost:31339/api/sessions', json={
    'name': 'my-session',
    'faceIndex': 0,
    'workingDir': '/Users/john/projects/myapp',
    'projectId': 'project-123',
})
session = response.json()['data']
print(f"Created session: {session['id']}")

# Send a message
requests.post(f"http://localhost:31339/api/sessions/{session['id']}/send", json={
    'message': 'Write a hello world script'
})

# Get output
output = requests.get(f"http://localhost:31339/api/sessions/{session['id']}/output").json()
print(output['data']['output'])
```

## Usage Notes

1. **Session IDs**: Sessions are identified by their tmux session name (e.g., `fr2-0-my-session`). This is generated automatically based on the face index and session name.

2. **Face Index**: Must be between 0-19 (representing the 20 faces of the icosahedron).

3. **Monitoring**: Sessions are automatically monitored when created via the API. This enables LEO AI learning and cross-session awareness features.

4. **Working Directory**: Must be a valid absolute path. Use `~` for home directory, which will be expanded automatically.

5. **Concurrent Access**: The API is designed to be accessed by multiple clients simultaneously. Session state is managed by tmux.

## Running the API Server

See the main application documentation for how to start the API server. By default, it runs on port 31339 when the application starts.
