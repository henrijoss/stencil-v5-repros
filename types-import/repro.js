// Type-checks the published types the way an application does that has the component library installed,
// but not @stencil/core: the types are copied out of this repository, so node_modules can't be found from there.
import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import ts from 'typescript';

const typesDir = new URL('./dist/types', import.meta.url).pathname;

const listFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    return statSync(file).isDirectory() ? listFiles(file) : [file];
  });

console.log('Imports of Stencil in dist/types:');
for (const file of listFiles(typesDir)) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (/^import .* from ['"](@stencil\/core|\..*stencil-public-runtime)/.test(line)) {
      console.log(`  ${relative(typesDir, file)}: ${line}`);
    }
  }
}

const app = mkdtempSync(join(tmpdir(), 'types-import-'));
cpSync(typesDir, join(app, 'library'), { recursive: true });
writeFileSync(
  join(app, 'app.ts'),
  `import './library/components';

const element = document.createElement('repro-types');
element.label = 'a label';
element.focus();
// a typo that has to be an error
element.labell = 'a label';
`,
);

const check = (skipLibCheck) => {
  const program = ts.createProgram([join(app, 'app.ts')], {
    strict: true,
    noEmit: true,
    skipLibCheck,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
  });
  console.log(`\ntsc with skipLibCheck: ${skipLibCheck}`);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length === 0) {
    console.log('  no errors');
  }
  for (const diagnostic of diagnostics) {
    const fileName = diagnostic.file ? diagnostic.file.fileName : '';
    const file = fileName.startsWith(app) ? relative(app, fileName) : basename(fileName);
    const { line } = diagnostic.file ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : { line: 0 };
    console.log(
      `  ${file}:${line + 1} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`,
    );
  }
};

check(false);
check(true);
