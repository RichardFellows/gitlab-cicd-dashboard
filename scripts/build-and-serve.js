/**
 * Build and serve script for GitLab CI/CD Dashboard
 * This script builds the app and then serves it locally
 */

const { spawn } = require('child_process');
const path = require('path');

// Run a child process
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
}

// Build and serve
async function buildAndServe() {
  const rootDir = path.join(__dirname, '..');
  
  try {
    // First, run the build script
    console.log('Building the application...');
    await runCommand('node', ['scripts/build.js'], rootDir);
    
    console.log('\nBuild complete. Starting local server...');
    console.log('The built app will be available at http://localhost:5050\n');
    
    // Then start the local server in the public directory
    await runCommand('python', ['-m', 'http.server', '5050'], path.join(rootDir, 'public'));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the process
buildAndServe().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
