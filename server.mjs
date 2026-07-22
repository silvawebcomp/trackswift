import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

createServer(async (_request, response) => {
  try {
    const html = await readFile(new URL('./index.html', import.meta.url));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  } catch {
    response.writeHead(500);
    response.end('Unable to load TrackSwift.');
  }
}).listen(4173, '127.0.0.1');
