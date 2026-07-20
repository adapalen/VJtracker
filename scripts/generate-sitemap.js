const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITEMAP_XML_PATH = path.join(ROOT_DIR, 'sitemap.xml');
const SITEMAP_JSON_PATH = path.join(ROOT_DIR, 'p', 'sitemap', 'sitemap.json');
const BASE_URL = 'https://sincostan.id.vn';

// Ensure output directories exist
const sitemapDir = path.dirname(SITEMAP_JSON_PATH);
if (!fs.existsSync(sitemapDir)) {
  fs.mkdirSync(sitemapDir, { recursive: true });
}

function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
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

function getPageMetadata(file) {
  const content = fs.readFileSync(file, 'utf8');
  
  let title = '';
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else {
    title = path.basename(file);
  }

  let description = '';
  const descMatch = content.match(/<meta\s+name="description"\s+content="(.*?)"/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  let relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
  let url = '/' + relPath;
  
  if (url === '/index.html') {
    url = '/';
  } else if (url.endsWith('/index.html')) {
    url = url.substring(0, url.length - 10);
  }

  const stat = fs.statSync(file);
  const lastModified = stat.mtime.toISOString().split('T')[0];

  // Assign section, priority, changefreq
  let section = 'core';
  let priority = '0.7';
  let changefreq = 'monthly';
  let icon = 'fa-regular fa-file';

  if (url === '/') {
    section = 'core';
    priority = '1.0';
    changefreq = 'daily';
    icon = 'fa-solid fa-house';
  } else if (url === '/p/about/') {
    section = 'core';
    priority = '0.8';
    changefreq = 'monthly';
    icon = 'fa-solid fa-user-tie';
  } else if (url === '/p/VJtracker/') {
    section = 'projects';
    priority = '0.9';
    changefreq = 'daily';
    icon = 'fa-solid fa-plane-departure';
  } else if (url === '/p/caro-arena/') {
    section = 'projects';
    priority = '0.9';
    changefreq = 'weekly';
    icon = 'fa-solid fa-gamepad';
  } else if (url === '/p/blogs/') {
    section = 'blogs_hub';
    priority = '0.8';
    changefreq = 'weekly';
    icon = 'fa-solid fa-book';
  } else if (url.includes('/p/blogs/articles/tech-')) {
    section = 'blogs_tech';
    priority = '0.7';
    changefreq = 'monthly';
    icon = 'fa-solid fa-laptop-code';
  } else if (url.includes('/p/blogs/articles/chem-')) {
    section = 'blogs_chem';
    priority = '0.7';
    changefreq = 'monthly';
    icon = 'fa-solid fa-flask';
  } else if (url.includes('/p/blogs/articles/trivia-')) {
    section = 'blogs_trivia';
    priority = '0.7';
    changefreq = 'monthly';
    icon = 'fa-solid fa-lightbulb';
  } else if (url === '/p/sitemap/') {
    section = 'system';
    priority = '0.5';
    changefreq = 'weekly';
    icon = 'fa-solid fa-sitemap';
  }

  return {
    title,
    description,
    url,
    fullUrl: BASE_URL + (url === '/' ? '/' : url),
    lastModified,
    section,
    priority,
    changefreq,
    icon
  };
}

function generateSitemap() {
  console.log('Generating sitemap...');
  const htmlFiles = getFilesRecursively(ROOT_DIR);
  const pages = htmlFiles.map(getPageMetadata);

  // 1. Generate standard XML sitemap
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  pages.forEach(p => {
    xml += `  <url>\n`;
    xml += `    <loc>${p.fullUrl}</loc>\n`;
    xml += `    <lastmod>${p.lastModified}</lastmod>\n`;
    xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
    xml += `    <priority>${p.priority}</priority>\n`;
    xml += `  </url>\n`;
  });
  
  xml += `</urlset>\n`;
  fs.writeFileSync(SITEMAP_XML_PATH, xml, 'utf8');
  console.log(`Saved XML sitemap to: ${SITEMAP_XML_PATH}`);

  // 2. Generate structured hierarchical JSON for visual UI
  const sectionDefinitions = [
    { id: 'core', name: 'Trang Chính & Giới Thiệu', icon: 'fa-solid fa-compass', pages: [] },
    { id: 'projects', name: 'Dự Án & Ứng Dụng Tương Tác', icon: 'fa-solid fa-rocket', pages: [] },
    { id: 'blogs_hub', name: 'Trung Tâm Blog & Bài Viết', icon: 'fa-solid fa-book', pages: [] },
    { id: 'blogs_tech', name: 'Blog - Công Nghệ & Lập Trình', icon: 'fa-solid fa-laptop-code', pages: [] },
    { id: 'blogs_chem', name: 'Blog - Hóa Học & Hóa Tin Học', icon: 'fa-solid fa-flask', pages: [] },
    { id: 'blogs_trivia', name: 'Blog - Thông Tin Thú Vị & Mật Mã', icon: 'fa-solid fa-lightbulb', pages: [] },
    { id: 'system', name: 'Hệ Thống & Tiện Ích', icon: 'fa-solid fa-gears', pages: [] }
  ];

  pages.forEach(p => {
    const sec = sectionDefinitions.find(s => s.id === p.section) || sectionDefinitions[0];
    sec.pages.push(p);
  });

  // Filter out empty sections
  const activeSections = sectionDefinitions.filter(s => s.pages.length > 0);

  fs.writeFileSync(SITEMAP_JSON_PATH, JSON.stringify({ sections: activeSections }, null, 2), 'utf8');
  console.log(`Saved Hierarchical JSON sitemap to: ${SITEMAP_JSON_PATH}`);
}

generateSitemap();
