// Streams a server-rendered component the way a streaming framework does, after the components are defined,
// and pauses in the middle of the host so that a script of the page can insert a node meanwhile.
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { renderToString } from './dist/ssr/index.js';

const port = 3336;
const buildDir = new URL('./dist/loader-bundle/repro', import.meta.url).pathname;
const pending = new Map();
let pageId = 0;

const cases = {
  control: { tag: 'repro-ssr', insert: false, splitAt: '<template' },
  'insert-before-template': { tag: 'repro-ssr', insert: true, splitAt: '<template' },
  'insert-inside-template': { tag: 'repro-ssr', insert: true, splitAt: '<p' },
  'control-children': { tag: 'repro-ssr-children', insert: false, splitAt: '<span>Slotted' },
  'insert-before-children': { tag: 'repro-ssr-children', insert: true, splitAt: '<span>Slotted' },
};

const index = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>SSR streaming</title></head><body>
<ul>${Object.keys(cases)
  .map((name) => `<li><a href="/${name}">${name}</a></li>`)
  .join('')}</ul></body></html>`;

// The components are loaded without waiting for the document, as streaming frameworks do, so they are defined while
// the page is streamed.
// The inline script tells the server to go on: once the component is defined, and once the host is in the document.
const client = (id, tag, insert) => `
<script>
  import('/build/repro.esm.js');
  const next = () => fetch('/next?id=${id}');
  customElements.whenDefined('${tag}').then(next);
  const timer = setInterval(() => {
    if (!document.querySelector('${tag}')) return;
    clearInterval(timer);
    // what a portal, a toast container or a script loader does while the page is still streamed
    ${insert ? "document.body.appendChild(Object.assign(document.createElement('div'), { id: 'portal' }));" : ''}
    setTimeout(next, 500);
  }, 10);
  window.addEventListener('load', () => setTimeout(() => {
    const host = document.querySelector('${tag}');
    document.querySelector('#result').textContent =
      'light DOM children of the host: ' + Array.from(host.children, (el) => el.localName).join(', ') +
      '\\nshadow root: ' + host.shadowRoot.innerHTML;
  }, 500));
</script>`;

createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, `http://localhost:${port}`);
  if (pathname === '/next') {
    pending.get(searchParams.get('id'))?.();
    res.end();
  } else if (pathname.startsWith('/build/')) {
    const file = join(buildDir, pathname.slice('/build/'.length));
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } else if (cases[pathname.slice(1)]) {
    const { tag, insert, splitAt } = cases[pathname.slice(1)];
    const id = String(++pageId);
    const signal = () => new Promise((resolve) => pending.set(id, resolve));
    const { html } = await renderToString(`<${tag} label="Server label"><span>Slotted</span></${tag}>`, {
      fullDocument: false,
      prettyHtml: false,
    });
    const split = html.indexOf(splitAt);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    // browsers wait for some bytes before they start to render
    res.write(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${pathname.slice(1)}</title><!-- ${'.'.repeat(2048)} -->${client(id, tag, insert)}</head><body><main>`,
    );
    await signal(); // the component is defined
    res.write(html.slice(0, split));
    await signal(); // the host is in the document, the script of the page has run
    res.end(`${html.slice(split)}</main><pre id="result"></pre></body></html>`);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(index);
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
