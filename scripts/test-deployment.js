/**
 * Post-deployment test for GitLab CI/CD Dashboard
 * This script tests if the deployed site is accessible and if critical resources are loading correctly
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const config = {
  // This will be overridden by command-line argument or environment variable
  siteUrl: process.env.SITE_URL || 'http://localhost:5050/',
  // Critical resources that should be available
  criticalResources: [
    '',                      // The main page
    'index.js',
    'gitlab-api-service.js',
    'dashboard-data-service.js',
    'pipeline-performance.js',
    'table-view.js',
    'table-view.css'
  ],
  // Timeout for each request (ms)
  timeout: 10000
};

// Parse command-line arguments
if (process.argv.length > 2) {
  config.siteUrl = process.argv[2];
}

// Ensure the site URL ends with a /
if (!config.siteUrl.endsWith('/')) {
  config.siteUrl += '/';
}

// Validate URL
try {
  new URL(config.siteUrl);
} catch (error) {
  console.error(`Error: Invalid URL: ${config.siteUrl}`);
  process.exit(1);
}

console.log(`Testing deployment at: ${config.siteUrl}`);

/**
 * Make an HTTP(S) request to check if a resource is available
 * @param {string} resourceUrl - URL to check
 * @returns {Promise<{ok: boolean, status: number, message: string}>} - Result of the check
 */
function checkResource(resourceUrl) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(resourceUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(resourceUrl, { timeout: config.timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        resolve({
          ok,
          status: res.statusCode,
          message: ok ? 'OK' : `HTTP Status: ${res.statusCode}`
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        ok: false,
        status: 0,
        message: `Request failed: ${error.message}`
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        status: 0,
        message: 'Request timed out'
      });
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  let allPassed = true;
  const results = [];
  
  console.log('Starting tests...');
  
  // Check each critical resource
  for (const resource of config.criticalResources) {
    const resourceUrl = `${config.siteUrl}${resource}`;
    process.stdout.write(`Testing: ${resourceUrl} ... `);
    
    const result = await checkResource(resourceUrl);
    results.push({ url: resourceUrl, ...result });
    
    if (result.ok) {
      console.log('✅ PASSED');
    } else {
      console.log(`❌ FAILED: ${result.message}`);
      allPassed = false;
    }
  }
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.ok).length}`);
  console.log(`Failed: ${results.filter(r => !r.ok).length}`);
  
  // Print detailed results for failed tests
  const failedTests = results.filter(r => !r.ok);
  if (failedTests.length > 0) {
    console.log('\n=== FAILED TESTS ===');
    failedTests.forEach(test => {
      console.log(`- ${test.url}: ${test.message}`);
    });
  }
  
  // Exit with appropriate status code
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests();
