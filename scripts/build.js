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
  const destDir = path.dirname(dest);
  ensureDirectoryExists(destDir);
  
  fs.copyFile(source, dest, (err) => {
    if (err) {
      console.error(`Error copying ${source} to ${dest}:`, err);
      process.exit(1);
    }
    console.log(`Copied: ${source} → ${dest}`);
  });
}

// Main build process
function build() {
  console.log('Building GitLab CI/CD Dashboard for deployment...');
  
  // Make sure the public directory exists
  ensureDirectoryExists(publicDir);
  
  // Copy all files from src to public
  filesToCopy.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(publicDir, file.replace(/^components\/table-view\//, ''));
    
    // Check if source file exists
    if (!fs.existsSync(srcFile)) {
      console.error(`Error: Source file ${srcFile} does not exist!`);
      process.exit(1);
    }
    
    copyFile(srcFile, destFile);
  });
  
  console.log('Build completed successfully!');
}

// Run the build
build();
