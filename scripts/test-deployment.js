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
  // Note: Only test root path since Cloudflare Pages redirects /index.html to /
  criticalResources: [
    ''                       // The main page
  ],
  // Retry configuration
  retry: {
    // Maximum time to wait before giving up (ms)
    maxWaitTime: 60000,
    // Initial timeout for the first attempt (ms)
    initialTimeout: 1000,
    // Backoff factor (how much to multiply the timeout by each retry)
    backoffFactor: 1.5,
    // Maximum timeout for any single attempt (ms)
    maxTimeout: 5000
  },
  // Timeout for each individual request (ms)
  timeout: 5000
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
 * @returns {Promise<{ok: boolean, status: number, message: string, data?: string}>} - Result of the check
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
          message: ok ? 'OK' : `HTTP Status: ${res.statusCode}`,
          data: data // Return the data for content checking
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
 * Wait for a specified number of milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check a resource with retry and exponential backoff
 * @param {string} resourceUrl - URL to check
 * @param {string} resourceName - Name of the resource for logging
 * @returns {Promise<{ok: boolean, status: number, message: string, data?: string}>} - Final check result
 */
async function checkResourceWithRetry(resourceUrl, resourceName = '') {
  const startTime = Date.now();
  let attempt = 1;
  let timeout = config.retry.initialTimeout;
  
  process.stdout.write(`Testing: ${resourceUrl} ... `);
  
  while (true) {
    const result = await checkResource(resourceUrl);
    
    // If the request was successful, return the result
    if (result.ok) {
      console.log(`✅ PASSED (attempt ${attempt})`);
      return result;
    }
    
    // Check if we've exceeded the maximum wait time
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime >= config.retry.maxWaitTime) {
      console.log(`❌ FAILED after ${attempt} attempts: ${result.message}`);
      return result;
    }
    
    // Otherwise, retry after a delay with exponential backoff
    const timeLeft = config.retry.maxWaitTime - elapsedTime;
    const delay = Math.min(timeout, timeLeft, config.retry.maxTimeout);
    
    process.stdout.write(`.`); // Show progress
    
    await sleep(delay);
    timeout = Math.min(timeout * config.retry.backoffFactor, config.retry.maxTimeout);
    attempt++;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  let allPassed = true;
  const results = [];
  
  console.log('Starting tests with retry and backoff...');
  console.log(`Max wait time: ${config.retry.maxWaitTime/1000}s, Initial timeout: ${config.retry.initialTimeout}ms, Backoff factor: ${config.retry.backoffFactor}x`);
  
  // Check each critical resource with retry
  for (const resource of config.criticalResources) {
    const resourceUrl = `${config.siteUrl}${resource}`;
    const result = await checkResourceWithRetry(resourceUrl, resource || 'Main page');
    results.push({ url: resourceUrl, ...result });
    
    if (!result.ok) {
      allPassed = false;
    }
  }
  
  // Check for React/Vite-specific content in the main page
  console.log('Checking for React app content...');
  
  try {
    // Get main page content with retry
    const mainPageUrl = config.siteUrl;
    const mainPageResponse = await checkResourceWithRetry(mainPageUrl, 'React content');
    
    // If we got the page, analyze its content
    if (mainPageResponse.ok && mainPageResponse.data) {
      const data = mainPageResponse.data;
      
      // Check for React/Vite markers
      const hasRootDiv = data.includes('<div id="root">') || data.includes('<div id="root"></div>');
      
      // Vite usually includes assets with hash in the filename
      const hasJsAsset = data.includes('/assets/') && data.includes('.js');
      const hasCssAsset = data.includes('/assets/') && data.includes('.css');
      
      // Check for React and GitLab CI/CD Dashboard specific content
      const hasReactContent = data.includes('React') || data.includes('react') || data.includes('createRoot');
      const hasDashboardContent = data.includes('GitLab CI/CD Dashboard') || data.includes('gitlab-cicd-dashboard');
      
      const ok = hasRootDiv && (hasJsAsset || hasCssAsset) && (hasReactContent || hasDashboardContent);
      const contentCheckResult = {
        ok,
        hasRootDiv,
        hasJsAsset,
        hasCssAsset,
        hasReactContent,
        hasDashboardContent,
        message: ok ? 'OK' : 'Missing React/Vite content markers'
      };
      
      process.stdout.write('Analyzing React content... ');
      if (contentCheckResult.ok) {
        console.log('✅ PASSED');
      } else {
        console.log(`❌ FAILED: ${contentCheckResult.message}`);
        if (!contentCheckResult.hasRootDiv) console.log('  - Missing React root div');
        if (!contentCheckResult.hasJsAsset) console.log('  - Missing JavaScript asset references');
        if (!contentCheckResult.hasCssAsset) console.log('  - Missing CSS asset references');
        if (!contentCheckResult.hasReactContent) console.log('  - No React-related content found');
        if (!contentCheckResult.hasDashboardContent) console.log('  - No GitLab CI/CD Dashboard content found');
        allPassed = false;
      }
      
      results.push({ 
        url: 'React content check', 
        ok: contentCheckResult.ok,
        message: contentCheckResult.message 
      });
    } else {
      // We couldn't get the main page after retries
      console.log(`❌ FAILED: Could not retrieve main page content`);
      results.push({ 
        url: 'React content check', 
        ok: false,
        message: 'Failed to retrieve main page content for analysis' 
      });
      allPassed = false;
    }
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