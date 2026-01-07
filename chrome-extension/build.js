const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy static files
function copyStatic() {
  // Copy manifest
  fs.copyFileSync('manifest.json', 'dist/manifest.json');
  
  // Copy icons
  if (fs.existsSync('public/icons')) {
    if (!fs.existsSync('dist/icons')) {
      fs.mkdirSync('dist/icons', { recursive: true });
    }
    const icons = fs.readdirSync('public/icons');
    icons.forEach(icon => {
      fs.copyFileSync(`public/icons/${icon}`, `dist/icons/${icon}`);
    });
  }
  
  // Copy popup HTML
  fs.copyFileSync('src/popup/popup.html', 'dist/popup.html');
  
  // Copy styles
  if (!fs.existsSync('dist/styles')) {
    fs.mkdirSync('dist/styles', { recursive: true });
  }
  fs.copyFileSync('src/styles/popup.css', 'dist/styles/popup.css');
  fs.copyFileSync('src/styles/content.css', 'dist/styles/content.css');
  
  console.log('Static files copied');
}

// Build configuration
const buildOptions = {
  entryPoints: [
    'src/background/service-worker.js',
    'src/popup/popup.js',
    'src/content/gmail-content.js',
  ],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: ['chrome120'],
  splitting: false,
  minify: !isWatch,
  sourcemap: isWatch,
};

async function build() {
  try {
    copyStatic();
    
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete!');
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
