#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obfuscation mappings
const obfuscationMap = {
  '/Users/jpittman/': '/home/user/',
  'jpittman': 'user',
  // Keep linturo and linturomusic as DJ alias - only obfuscate file paths
  '/Users/jpittman/linturomusic/': '/home/user/music-app/',
  'linturomusic/src/': 'music-app/src/',
  'linturomusic/dist/': 'music-app/dist/'
};

// Files to process
const filesToObfuscate = [
  'lambda/.aws-sam/build.toml',
  'lambda/.aws-sam/build/**/*.json',
  'lambda/.aws-sam/build/**/*.toml',
  'dist/**/*.js',
  'dist/**/*.html',
  'dist/**/*.css',
  'dist/**/*.map'
];

function obfuscateString(str) {
  let obfuscated = str;
  Object.entries(obfuscationMap).forEach(([original, replacement]) => {
    obfuscated = obfuscated.replace(new RegExp(original, 'g'), replacement);
  });
  return obfuscated;
}

function obfuscateFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const obfuscatedContent = obfuscateString(content);
      
      if (content !== obfuscatedContent) {
        fs.writeFileSync(filePath, obfuscatedContent);
        console.log(`✅ Obfuscated: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function obfuscateDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath);
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      obfuscateDirectory(fullPath);
    } else if (stat.isFile()) {
      obfuscateFile(fullPath);
    }
  });
}

// Main execution
console.log('🔒 Starting path obfuscation...');

// Obfuscate specific files
filesToObfuscate.forEach(filePattern => {
  if (filePattern.includes('**')) {
    // Handle glob patterns
    const baseDir = filePattern.split('/**')[0];
    obfuscateDirectory(baseDir);
  } else {
    obfuscateFile(filePattern);
  }
});

console.log('✅ Path obfuscation completed!'); 