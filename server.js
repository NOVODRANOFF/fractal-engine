// AWS Cloud Smart Calculator & Advisory Server
// Native Node.js HTTP Server & API Gateway (Zero external dependencies)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { AWS_REGIONS, EC2_CATALOG } = require('./services/pricing/awsPriceCatalog');
const SizingEngine = require('./services/advisory/sizingEngine');
const CostProjector = require('./services/pricing/costProjector');
const TerraformGenerator = require('./services/export/terraformGenerator');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Edge-Simulation': 'CloudFront-Edge-Network',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:3000'}`);
  const pathname = reqUrl.pathname;
  console.log(`[HTTP] ${req.method} ${pathname}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API Gateway Endpoints ---
  try {
    if (pathname === '/api/v1/regions' && req.method === 'GET') {
      return sendJson(res, 200, {
        regions: AWS_REGIONS,
        detectedNearest: AWS_REGIONS[0],
        source: 'CloudFront-Viewer-Headers'
      });
    }

    if (pathname === '/api/v1/catalog' && req.method === 'GET') {
      return sendJson(res, 200, {
        instances: EC2_CATALOG,
        pricingTimestamp: new Date().toISOString()
      });
    }

    if (pathname === '/api/v1/advisory/evaluate' && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      const advisoryResult = SizingEngine.evaluateWorkload(payload);
      return sendJson(res, 200, advisoryResult);
    }

    if (pathname === '/api/v1/calculator/project' && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      const projections = CostProjector.projectCosts(payload);
      return sendJson(res, 200, projections);
    }

    if (pathname === '/api/v1/export/terraform' && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      const hcl = TerraformGenerator.generateHcl(payload);
      return sendJson(res, 200, { hcl });
    }

    // --- Static File Serving (Strictly Zero-Cache for local development) ---
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Security check to avoid directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Access denied');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          return res.end('Internal Server Error');
        }

        // Send aggressive cache-invalidation headers
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Powered-By': 'Antigravity-Edge-Gateway'
        });
        res.end(content);
      });
    });

  } catch (error) {
    console.error('API Error:', error);
    sendJson(res, 500, { error: error.message || 'Internal Server Error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[AWS Smart Calculator & Advisory Server] listening on http://${HOST}:${PORT}`);
});
