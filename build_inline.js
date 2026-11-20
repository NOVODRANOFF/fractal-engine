// Inlines styles.css into index.html to guarantee 100% zero-cache delivery
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, 'public');
const htmlPath = path.join(publicDir, 'index.html');
const cssPath = path.join(publicDir, 'styles.css');

const cssContent = fs.readFileSync(cssPath, 'utf8');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace stylesheet link with inlined <style>
const styleBlock = `<style>\n${cssContent}\n</style>`;

if (htmlContent.includes('<link rel="stylesheet" href="styles.css">')) {
  htmlContent = htmlContent.replace('<link rel="stylesheet" href="styles.css">', styleBlock);
} else if (htmlContent.includes('<style>')) {
  htmlContent = htmlContent.replace(/<style>[\s\S]*?<\/style>/, styleBlock);
}

// Add cache-busting query to app.js script
const timestamp = Date.now();
htmlContent = htmlContent.replace(/src="app\.js(\?v=[^"]*)?"/, `src="app.js?v=${timestamp}"`);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully inlined styles.css into index.html and cache-busted app.js with v=' + timestamp);
