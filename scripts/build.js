/**
 * Build script for GitLab CI/CD Dashboard
 * This script copies all necessary files from src to public for deployment
 */

const fs = require('fs');
const path = require('path');

// Directories
const srcDir = path.join(__dirname, '..', 'src');
const publicDir = path.join(__dirname, '..', 'public');

// Files to copy from src to public
const filesToCopy = [
  'index.js',
  'components/table-view/table-view.js',
  'components/table-view/table-view.css',
  'services/gitlab-api-service.js',
  'services/dashboard-data-service.js',
  'utils/pipeline-performance.js'
];

// Ensure target directories exist
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Copy a file, creating directories as needed
function copyFile(source, dest) {
  return new Promise((resolve, reject) => {
    const destDir = path.dirname(dest);
    ensureDirectoryExists(destDir);
    
    fs.copyFile(source, dest, (err) => {
      if (err) {
        console.error(`Error copying ${source} to ${dest}:`, err);
        reject(err);
        return;
      }
      console.log(`Copied: ${source} → ${dest}`);
      resolve();
    });
  });
}

// Main build process
async function build() {
  console.log('Building GitLab CI/CD Dashboard for deployment...');
  
  // Make sure the public directory exists
  ensureDirectoryExists(publicDir);
  
  try {
    // Copy all files from src to public
    const copyPromises = filesToCopy.map(file => {
      const srcFile = path.join(srcDir, file);
      // Extract just the file name for the destination to flatten the structure
      const fileName = path.basename(file);
      const destFile = path.join(publicDir, fileName);

      // Check if source file exists
      if (!fs.existsSync(srcFile)) {
        throw new Error(`Source file ${srcFile} does not exist!`);
      }

      return copyFile(srcFile, destFile);
    });
    
    // Wait for all files to be copied
    await Promise.all(copyPromises);
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build().catch(err => {
  console.error('Unhandled error during build:', err);
  process.exit(1);
});
