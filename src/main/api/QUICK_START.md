# Flowrider REST API - Quick Start Guide

Get started with the Flowrider REST API in 5 minutes!

## Step 1: Start Flowrider

```bash
npm run dev
```

The API server starts automatically on port 3737.

## Step 2: Access Swagger UI

Open your browser and navigate to:

```
http://localhost:3737/api/docs
```

This interactive documentation allows you to:
- Browse all available endpoints
- Test API calls directly in the browser
- View request/response schemas
- See example payloads

## Step 3: Set Up Authentication

Click the **Authorize** button in Swagger UI and enter the development API key:

```
fwr_dev_flowrider2024
```

Or include it in your requests:

```bash
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/health
```

## Step 4: Try Your First Request

### Using Swagger UI
1. Navigate to `/api/health` endpoint
2. Click "Try it out"
3. Click "Execute"
4. View the response

### Using cURL
```bash
curl http://localhost:3737/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123456,
  "timestamp": "2026-07-06T21:30:00Z",
  "version": "0.1.0"
}
```

## Step 5: Explore Available Endpoints

### List All Routes
```bash
curl http://localhost:3737/api
```

This returns a complete list of available endpoints.

### Create a Project
```bash
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Project",
    "path": "/Users/dev/my-project",
    "description": "Testing the API",
    "language": "typescript"
  }' \
  http://localhost:3737/api/projects
```

### List Projects
```bash
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects
```

### Create an API Key
```bash
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test Key",
    "scopes": ["read", "write"]
  }' \
  http://localhost:3737/api/keys
```

## Common Use Cases

### 1. Health Monitoring
Check if the API is running and healthy:

```bash
# Health check
curl http://localhost:3737/api/health

# Version info
curl http://localhost:3737/api/version
```

### 2. Project Management
Manage your development projects:

```bash
# Create a project
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{"name":"Web App","path":"/path/to/project"}' \
  http://localhost:3737/api/projects

# List all projects
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects

# Get project details
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects/proj_123

# Update project
curl -X PUT \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}' \
  http://localhost:3737/api/projects/proj_123

# Delete project
curl -X DELETE \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/projects/proj_123
```

### 3. API Key Management
Create and manage API keys for different environments:

```bash
# List all keys
curl -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/keys

# Create a production key
curl -X POST \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "scopes": ["read", "write"],
    "expiresAt": "2027-01-01T00:00:00Z"
  }' \
  http://localhost:3737/api/keys

# Revoke a key
curl -X DELETE \
  -H "X-API-Key: fwr_dev_flowrider2024" \
  http://localhost:3737/api/keys/key_abc123
```

## Testing with Different Tools

### Postman
1. Import the OpenAPI spec: `http://localhost:3737/api/docs/openapi.json`
2. Set up environment variable `API_KEY` with your key
3. Add header: `X-API-Key: {{API_KEY}}`

### Insomnia
1. Import from URL: `http://localhost:3737/api/docs/openapi.yaml`
2. Set authentication to "API Key"
3. Header name: `X-API-Key`

### HTTPie
```bash
# Install httpie
brew install httpie

# Make requests
http GET localhost:3737/api/health
http GET localhost:3737/api/projects X-API-Key:fwr_dev_flowrider2024
```

### Python
```python
import requests

API_KEY = "fwr_dev_flowrider2024"
BASE_URL = "http://localhost:3737/api"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Health check
response = requests.get(f"{BASE_URL}/health")
print(response.json())

# List projects
response = requests.get(f"{BASE_URL}/projects", headers=headers)
projects = response.json()["data"]
print(projects)

# Create project
new_project = {
    "name": "Python Project",
    "path": "/path/to/project",
    "language": "python"
}
response = requests.post(f"{BASE_URL}/projects", json=new_project, headers=headers)
print(response.json())
```

### JavaScript/TypeScript
```typescript
const API_KEY = "fwr_dev_flowrider2024";
const BASE_URL = "http://localhost:3737/api";

// Using fetch
async function getProjects() {
  const response = await fetch(`${BASE_URL}/projects`, {
    headers: {
      "X-API-Key": API_KEY,
    },
  });

  const result = await response.json();
  return result.data;
}

// Create project
async function createProject(name: string, path: string) {
  const response = await fetch(`${BASE_URL}/projects`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, path }),
  });

  return response.json();
}

// Usage
const projects = await getProjects();
console.log(projects);

const newProject = await createProject("My App", "/path/to/app");
console.log(newProject);
```

## Troubleshooting

### API Server Not Starting

**Issue**: Can't access `http://localhost:3737/api`

**Solutions**:
1. Check if Flowrider app is running
2. Verify port 3737 is not in use: `lsof -i :3737`
3. Check Electron console for errors
4. Verify API is enabled in Flowrider settings

### 401 Unauthorized

**Issue**: Getting "Invalid API key" error

**Solutions**:
1. Make sure you're including the API key header
2. Use the correct header name: `X-API-Key` (case-sensitive)
3. Verify the API key is valid and not revoked
4. For development, use: `fwr_dev_flowrider2024`

### 404 Not Found

**Issue**: Endpoint returns 404

**Solutions**:
1. Check the endpoint path is correct
2. View available routes: `GET http://localhost:3737/api`
3. Some endpoints (sessions, webhooks) are IPC-only currently

### CORS Errors

**Issue**: Browser shows CORS error

**Solutions**:
1. CORS is enabled by default for localhost
2. Check your origin is in the allowed list
3. Use Swagger UI for testing (no CORS issues)

## Next Steps

1. **Read Full Documentation**: See `API_DOCUMENTATION.md`
2. **Explore OpenAPI Spec**: `http://localhost:3737/api/docs/openapi.yaml`
3. **Create Production Keys**: Generate scoped API keys for your apps
4. **Build Integrations**: Use the API in your CI/CD, monitoring tools, etc.

## Resources

- **Swagger UI**: http://localhost:3737/api/docs
- **OpenAPI Spec**: http://localhost:3737/api/docs/openapi.json
- **Full Documentation**: `src/main/api/API_DOCUMENTATION.md`
- **GitHub Issues**: https://github.com/josephas-llc/flowrider/issues

## Support

Having issues? Check:
1. Swagger UI for interactive testing
2. API Documentation for detailed examples
3. GitHub Issues for known problems
4. Electron console logs for errors

Happy coding! 🚀
