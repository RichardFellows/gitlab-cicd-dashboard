/**
 * Post-deployment test for GitLab CI/CD Dashboard
 * This script tests if the deployed site is accessible and if critical resources are loading correctly
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// Configuration
const config = {
  // This will be overridden by command-line argument or environment variable
  siteUrl: process.env.SITE_URL || 'http://localhost:5050/',
  // Critical resources that should be available
  criticalResources: [
    '',                      // The main page
    'index.html'             // Main HTML file
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
  
  // Check for React/Vite-specific content in the main page
  const mainPageUrl = config.siteUrl;
  process.stdout.write('Checking for React app content... ');
  
  try {
    const parsedUrl = new URL(mainPageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const mainPageResult = await new Promise((resolve) => {
      const req = client.get(mainPageUrl, { timeout: config.timeout }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // Check if the page contains React/Vite-specific markers
          const hasRootDiv = data.includes('<div id="root">') || data.includes('<div id="root"></div>');
          
          // Vite usually includes assets with hash in the filename
          const hasJsAsset = data.includes('/assets/') && data.includes('.js');
          const hasCssAsset = data.includes('/assets/') && data.includes('.css');
          
          // Check for React and GitLab CI/CD Dashboard specific content
          const hasReactContent = data.includes('React') || data.includes('react') || data.includes('createRoot');
          const hasDashboardContent = data.includes('GitLab CI/CD Dashboard') || data.includes('gitlab-cicd-dashboard');
          
          const ok = hasRootDiv && (hasJsAsset || hasCssAsset) && (hasReactContent || hasDashboardContent);
          resolve({
            ok,
            hasRootDiv,
            hasJsAsset,
            hasCssAsset,
            hasReactContent,
            hasDashboardContent,
            message: ok ? 'OK' : 'Missing React/Vite content markers'
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          ok: false,
          message: `Request failed: ${error.message}`
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          ok: false,
          message: 'Request timed out'
        });
      });
    });
    
    if (mainPageResult.ok) {
      console.log('✅ PASSED');
    } else {
      console.log(`❌ FAILED: ${mainPageResult.message}`);
      if (!mainPageResult.hasRootDiv) console.log('  - Missing React root div');
      if (!mainPageResult.hasJsAsset) console.log('  - Missing JavaScript asset references');
      if (!mainPageResult.hasCssAsset) console.log('  - Missing CSS asset references');
      if (!mainPageResult.hasReactContent) console.log('  - No React-related content found');
      if (!mainPageResult.hasDashboardContent) console.log('  - No GitLab CI/CD Dashboard content found');
      allPassed = false;
    }
    
    results.push({ 
      url: 'React content check', 
      ok: mainPageResult.ok,
      message: mainPageResult.message 
    });
    
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    results.push({ 
      url: 'React content check', 
      ok: false,
      message: error.message 
    });
    allPassed = false;
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