/**
 * Simple proxy server to bypass CORS issues with GitLab API
 */
const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
const PORT = 3000;
const GITLAB_BASE_URL = 'https://gitlab.com/api/v4';

// Create server
const server = http.createServer((req, res) => {
  // Only handle GET requests to our proxy endpoint
  if (req.method === 'GET' && req.url.startsWith('/proxy')) {
    // Parse the GitLab API path from the query parameter
    const parsedUrl = url.parse(req.url, true);
    const apiPath = parsedUrl.query.path;
    
    if (!apiPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "path" query parameter' }));
      return;
    }
    
    // Get the GitLab token from the request headers
    const token = req.headers['private-token'];
    
    if (!token) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "PRIVATE-TOKEN" header' }));
      return;
    }
    
    // Build the GitLab API URL
    const gitlabUrl = `${GITLAB_BASE_URL}${apiPath}`;
    console.log(`Proxying request to: ${gitlabUrl}`);
    
    // Set up CORS headers to allow requests from anywhere
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, PRIVATE-TOKEN');
    
    // Make request to GitLab API
    const gitlabReq = https.request(
      gitlabUrl,
      {
        method: 'GET',
        headers: {
          'PRIVATE-TOKEN': token,
          'User-Agent': 'GitLab CI/CD Dashboard Proxy'
        }
      },
      (gitlabRes) => {
        // Forward the status code
        res.writeHead(gitlabRes.statusCode, { 'Content-Type': 'application/json' });
        
        // Forward the response data
        let data = '';
        gitlabRes.on('data', (chunk) => {
          data += chunk;
        });
        
        gitlabRes.on('end', () => {
          res.end(data);
        });
      }
    );
    
    gitlabReq.on('error', (error) => {
      console.error('Error making request to GitLab API:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error making request to GitLab API' }));
    });
    
    gitlabReq.end();
  } else if (req.method === 'OPTIONS') {
    // Handle preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, PRIVATE-TOKEN');
    res.writeHead(204);
    res.end();
  } else {
    // Handle unsupported requests
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`GitLab API proxy server running on http://localhost:${PORT}`);
  console.log(`Example usage: http://localhost:${PORT}/proxy?path=/projects/123`);
});