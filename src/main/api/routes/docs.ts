import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import * as YAML from 'yamljs';
import * as path from 'path';

const router = Router();

// Load OpenAPI spec
const openApiPath = path.join(__dirname, '../docs/openapi.yaml');
const swaggerDocument = YAML.load(openApiPath);

// Swagger UI options
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .info .title { font-size: 36px; color: #6366f1 }
    .swagger-ui .scheme-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 8px;
    }
  `,
  customSiteTitle: 'Flowrider API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Serve OpenAPI spec as JSON
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Serve OpenAPI spec as YAML
router.get('/openapi.yaml', (_req: Request, res: Response) => {
  res.type('text/yaml');
  res.sendFile(openApiPath);
});

export default router;
