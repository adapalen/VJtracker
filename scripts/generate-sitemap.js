const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITEMAP_JSON_PATH = path.join(ROOT_DIR, 'p', 'sitemap', 'sitemap.json');

// Ensure parent directory exists
const sitemapDir = path.dirname(SITEMAP_JSON_PATH);
if (!fs.existsSync(sitemapDir)) {
  fs.mkdirSync(sitemapDir, { recursive: true });
}

function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    // Ignore node_modules, .git, and project source files
    if (file === 'node_modules' || file === '.git' || file === 'source-files') {
      continue;
    }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (stat.isFile() && file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function generateSitemap() {
  console.log('Generating sitemap...');
  const htmlFiles = getFilesRecursively(ROOT_DIR);
  const pages = [];

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Extract title
    let title = '';
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    } else {
      title = path.basename(file);
    }

    // Extract description
    let description = '';
    const descMatch = content.match(/<meta\s+name="description"\s+content="(.*?)"/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // Get relative url
    let relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    let url = '/' + relPath;
    
    // Clean up index.html paths to be cleaner folders
    if (url === '/index.html') {
      url = '/';
    } else if (url.endsWith('/index.html')) {
      url = url.substring(0, url.length - 10);
    }

    const stat = fs.statSync(file);
    pages.push({
      title,
      description,
      url,
      lastModified: stat.mtime.toISOString().split('T')[0]
    });
  }

  // Sort pages for neat presentation
  pages.sort((a, b) => {
    // Put home page first, then sort by URL depth
    if (a.url === '/') return -1;
    if (b.url === '/') return 1;
    return a.url.localeCompare(b.url);
  });

  fs.writeFileSync(SITEMAP_JSON_PATH, JSON.stringify(pages, null, 2), 'utf8');
  console.log(`Successfully generated sitemap data with ${pages.length} pages at: ${SITEMAP_JSON_PATH}`);
}

generateSitemap();
