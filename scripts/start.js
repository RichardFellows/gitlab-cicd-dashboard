/**
 * Combined development start script for GitLab CI/CD Dashboard
 * 
 * This script:
 * 1. Finds a free port for the proxy server
 * 2. Starts the proxy server on that port
 * 3. Starts a HTTP server for the dashboard on port 5050
 * 4. Updates the application to use the correct proxy URL
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');

// Configuration
const HTTP_PORT = 5050;
let PROXY_PORT = 3000; // Default, will look for a free port starting from here
const GITLAB_BASE_URL = 'https://gitlab.com/api/v4';

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        resolve(true); // Port is in use
      })
      .once('listening', () => {
        server.close();
        resolve(false); // Port is free
      })
      .listen(port);
  });
}

// Find a free port starting from the given port
async function findFreePort(startPort) {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
}

// Create HTTP server to serve static files
function createHttpServer(port) {
  const server = http.createServer((req, res) => {
    // Get the URL path
    const parsedUrl = url.parse(req.url);
    let pathname = path.join(__dirname, parsedUrl.pathname);
    
    // Default to index.html for root
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
      pathname = path.join(__dirname, 'index.html');
    }
    
    // Read the file
    fs.readFile(pathname, (err, data) => {
      if (err) {
        // If the file is not found, return 404
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        
        // For other errors, return 500
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error loading ${pathname}`);
        return;
      }
      
      // Set content type based on file extension
      const ext = path.parse(pathname).ext;
      let contentType = 'text/plain';
      
      switch (ext) {
        case '.html':
          contentType = 'text/html';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
      }
      
      // Dynamically replace the proxy port in GitLabApiService.js
      if (ext === '.js' && pathname.endsWith('gitlab-api-service.js')) {
        const content = data.toString();
        const updatedContent = content.replace(
          /this\.proxyUrl = ['"]http:\/\/localhost:\d+\/proxy['"]/,
          `this.proxyUrl = 'http://localhost:${PROXY_PORT}/proxy'`
        );
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(updatedContent);
        return;
      }
      
      // Return the file content
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
  
  server.listen(port, () => {
    console.log(`HTTP server running at http://localhost:${port}/`);
    console.log(`Open your browser to http://localhost:${port}/ to view the dashboard`);
  });
  
  return server;
}

// Create proxy server
function createProxyServer(port) {
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
  
  server.listen(port, () => {
    console.log(`GitLab API proxy server running on http://localhost:${port}`);
  });
  
  return server;
}

// Open the browser - platform specific
function openBrowser(url) {
  try {
    let command;
    
    switch (process.platform) {
      case 'darwin':  // macOS
        command = `open "${url}"`;
        break;
      case 'win32':   // Windows
        command = `start "" "${url}"`;
        break;
      default:        // Linux and others
        command = `xdg-open "${url}"`;
        break;
    }
    
    execSync(command);
    console.log(`Browser opened to ${url}`);
  } catch (err) {
    console.log(`Could not open browser automatically. Please open ${url} in your browser.`);
  }
}

// Main function to start the dev environment
async function start() {
  console.log('Starting GitLab CI/CD Dashboard development environment...');
  
  try {
    // Find a free port for the proxy server
    PROXY_PORT = await findFreePort(PROXY_PORT);
    console.log(`Found free port ${PROXY_PORT} for proxy server`);
    
    // Start the proxy server
    const proxyServer = createProxyServer(PROXY_PORT);
    
    // Start the HTTP server
    const httpServer = createHttpServer(HTTP_PORT);
    
    // Wait a moment for servers to start, then open the browser
    setTimeout(() => {
      openBrowser(`http://localhost:${HTTP_PORT}`);
    }, 1000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down servers...');
      proxyServer.close();
      httpServer.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error starting development environment:', error);
    process.exit(1);
  }
}

// Start everything
start();