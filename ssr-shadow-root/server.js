// Streams a server-rendered component after the components are defined, and keeps the response open once the whole
// host has arrived, as a streaming framework does while it waits for the rest of the page.
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { renderToString } from './dist/ssr/index.js';

const port = 3337;
const tag = 'repro-ssr-counter';
const buildDir = new URL('./dist/loader-bundle/repro', import.meta.url).pathname;
const pending = new Map();
let pageId = 0;

const cases = {
  // the host is a child of an element of the document
  control: { open: '<section>', close: '</section>' },
  // the host is in a declarative shadow root that is not Stencil's, e.g. of a page shell or of another library
  'shadow-root': { open: '<section><template shadowrootmode="open">', close: '</template></section>' },
};

const index = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>SSR shadow root</title></head><body>
<ul>${Object.keys(cases)
  .map((name) => `<li><a href="/${name}">${name}</a></li>`)
  .join('')}</ul></body></html>`;

// The components are loaded without waiting for the document, as streaming frameworks do, so they are defined while
// the page is streamed. The status is written into the value of an input, which changes no node of the document.
const client = (id) => `
<style>input { width: 40em; font: inherit; }</style>
<script>
  import('/build/repro.esm.js');
  const next = () => fetch('/next?id=${id}');
  customElements.whenDefined('${tag}').then(next);
  const getHost = () => document.querySelector('section')?.shadowRoot?.querySelector('${tag}') ?? document.querySelector('${tag}');
  setInterval(() => {
    const host = getHost();
    // Stencil removes the id and the end marker of the server when it hydrates the host
    const marker = host?.lastChild?.nodeType === Node.COMMENT_NODE ? '<!--' + host.lastChild.nodeValue + '-->' : 'removed';
    document.querySelector('#status').value = !host
      ? 'waiting for the host'
      : 'document: ' + document.readyState + ', end marker: ' + marker + ', hydrated: ' + !host.hasAttribute('s-id');
  }, 50);
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
    const { open, close } = cases[pathname.slice(1)];
    const id = String(++pageId);
    const signal = () => new Promise((resolve) => pending.set(id, resolve));
    const { html } = await renderToString(`<${tag}></${tag}>`, { fullDocument: false, prettyHtml: false });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    // browsers wait for some bytes before they start to render
    res.write(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${pathname.slice(1)}</title><!-- ${'.'.repeat(2048)} -->${client(id)}</head><body>
<p><input id="status" readonly value="waiting for the components"></p>
<p><button type="button" onclick="document.body.appendChild(document.createElement('div'))">append a node to the document</button>
<button type="button" onclick="next()">finish the response</button></p>`,
    );
    await signal(); // the component is defined
    res.write(`${open}${html}`); // the whole host, with its end marker
    await signal(); // "finish the response"
    res.end(`${close}</body></html>`);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(index);
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
