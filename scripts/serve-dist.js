// Sert dist/ en local comme le ferait GitHub Pages, sous le même sous-dossier, pour vérifier le build.
// Usage : node scripts/serve-dist.js [nom-du-depot] [port]   → http://localhost:8085/petit-etal/
const http = require('http');
const fs = require('fs');
const path = require('path');

const base = `/${(process.argv[2] || 'petit-etal').replace(/^\/+|\/+$/g, '')}`;
const port = Number(process.argv[3] || 8085);
const dist = path.join(__dirname, '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.css': 'text/css' };

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === base) {
      res.writeHead(301, { Location: `${base}/` });
      return res.end();
    }
    if (!url.startsWith(`${base}/`)) {
      res.writeHead(404);
      return res.end('Hors du site');
    }
    let file = path.join(dist, url.slice(base.length));
    if (!file.startsWith(dist)) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const found = fs.existsSync(file);
    if (!found) file = path.join(dist, '404.html');
    res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`http://localhost:${port}${base}/`));
