const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.stl': 'model/stl',
  '.ico': 'image/x-icon',
  '.manifest': 'application/manifest+json',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  // Extraer la ruta limpia ignorando query string (?v=13) y hash (#...)
  let rawUrl = req.url.split('?')[0].split('#')[0];
  let urlPath = decodeURIComponent(rawUrl);

  // Normalizar y prevenir Path Traversal
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath.startsWith('/') || safePath.startsWith('\\')) {
    safePath = safePath.substring(1);
  }

  let filePath = path.join(__dirname, safePath === '' ? 'index.html' : safePath);

  // Verificar que la ruta no salga del directorio raíz
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<h1>403 Acceso Prohibido</h1>');
  }

  // Verificar estado del archivo o directorio
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        // Fallback SPA: Si la ruta no tiene extensión y no existe, servir index.html
        if (error.code === 'ENOENT' && !path.extname(safePath)) {
          const indexPath = path.join(__dirname, 'index.html');
          fs.readFile(indexPath, (idxErr, idxContent) => {
            if (!idxErr) {
              res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
              });
              return res.end(idxContent, 'utf-8');
            } else {
              res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
              return res.end('<h1>404 Archivo No Encontrado</h1>');
            }
          });
          return;
        }

        if (error.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>404 Archivo No Encontrado</h1><p>Ruta solicitada: ${safePath}</p>`);
        } else {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('Error del servidor: ' + error.code);
        }
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-XSS-Protection': '1; mode=block',
          'Cache-Control': 'no-cache'
        });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor 3D Print Hub activo en http://localhost:${PORT}`);
});
