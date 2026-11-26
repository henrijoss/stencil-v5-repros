# Stencil 5 reproductions

Bugs found while moving a component library from Stencil 4.45 to Stencil 5. Each folder is a minimal project of its
own.

**The first four are fixed in `5.0.0-rc.11`.** `types-import` and `ssr-streaming` are still open in `5.0.0-rc.12`. This
repository stays on `5.0.0-rc.10`, the last version that shows all of them. To see the fixed behavior, which is the one
of the 4.45.1 column, run `npm install @stencil/core@5.0.0-rc.12` before a reproduction.

| Reproduction           | Issue                                                                | 4.45.1                                          | 5.0.0-rc.10                                        |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| `should-update-parent` | [stenciljs/core#7038](https://github.com/stenciljs/core/issues/7038) | count 3, `componentDidUpdate` after every click | count stays at 1, no `componentDidUpdate`          |
| `force-update`         | [stenciljs/core#7039](https://github.com/stenciljs/core/issues/7039) | render count 1 → 2 → 3 → 4                      | render count 1 → 2 → 2 → 2                         |
| `cjs-interop`          | [stenciljs/core#7040](https://github.com/stenciljs/core/issues/7040) | component renders                               | `ReferenceError: _interopNamespace is not defined` |
| `changes-old-value`    | [stenciljs/core#7042](https://github.com/stenciljs/core/issues/7042) | the second element renders its `config`         | the second element keeps rendering `undefined`     |
| `types-import`         | [stenciljs/core#7048](https://github.com/stenciljs/core/issues/7048) | types work without `@stencil/core`              | `Cannot find module '@stencil/core/runtime'`       |

`ssr-streaming` is not in the table, because it is not a regression: it shows a gap in the parse gate that Stencil 5
added for streamed server markup ([stenciljs/core#7049](https://github.com/stenciljs/core/issues/7049)).

The 4.45.1 column comes from the same components with the Stencil 4 spelling of `@Component()` and
`componentShouldUpdate`, and from a `dist` output target with `extras.enableImportInjection`. The browser
reproductions were run in Chromium and WebKit.

```bash
npm install
```

## `should-update-parent`

`componentShouldUpdate` returning `false` in a child leaves the parent waiting for it forever.

```bash
npm start --workspace=should-update-parent   # http://localhost:3333
```

Click the button three times.

- Expected: the log gets `parent componentDidRender` and `parent componentDidUpdate` for every click, and the count
  goes up to 3.
- Actual: the log only has the `componentDidRender` of the first render. The count goes to 1 and then stays there,
  because the parent no longer updates at all.

The parent passes a new object with the same content to the child on every render, and the child's
`componentShouldUpdate` returns `false` for it.

## `force-update`

`forceUpdate()` is lost when the update that is queued in the same cycle is turned down by `componentShouldUpdate`.

```bash
npm start --workspace=force-update   # http://localhost:3334
```

- `forceUpdate()`: the render count goes up, as expected.
- `assign an equal value, then forceUpdate()`: expected to go up, stays the same.
- `forceUpdate(), then assign an equal value`: expected to go up, stays the same.

## `changes-old-value`

`componentShouldUpdate` gets the wrong `oldVal` for a prop that was `undefined` or `null` at the last render and is set
more than once before the next one.

```bash
npm start --workspace=changes-old-value   # http://localhost:3335
```

- `set config once`: the first element renders `{"label":"a"}`, as expected.
- `set config twice, to two objects with the same content`: the second element is expected to render `{"label":"b"}`
  and keeps rendering `undefined`. The log shows why: `oldVal` is the object of the first assignment, where it should
  be `undefined`, the value of the last render.

## `types-import`

`dist/types/components.d.ts` imports `@stencil/core/runtime`, so the published types only work in an application that
has `@stencil/core` installed.

```bash
npm run repro --workspace=types-import
```

The script prints the imports of Stencil in `dist/types`, copies the types out of the repository, where
`@stencil/core` can't be resolved, and type-checks a file that uses the element.

- Expected: `components.d.ts` imports `./stencil-public-runtime`, like the declaration file of the component, and the
  only error is the deliberate typo in `app.ts` (`labell`).
- Actual: `components.d.ts` imports `@stencil/core/runtime`. `tsc` reports
  `Cannot find module '@stencil/core/runtime'`, and `Property 'focus' does not exist on type 'HTMLReproTypesElement'`,
  because the element type lost everything it inherits from `HTMLElement`. With `skipLibCheck` the first error is
  hidden and the second stays.

## `ssr-streaming`

A server-rendered component that is streamed loses its declarative shadow root, gets content twice, or hydrates
without its children, when a script inserts a node into the document while the parser is inside the component.

```bash
npm start --workspace=ssr-streaming   # http://localhost:3336
```

The server renders `<repro-ssr>` with Stencil's `renderToString()`, streams the page once the component is defined, and
pauses in the middle of the host. Each page prints the light DOM children and the shadow root of the host.

- `control`: nothing is inserted. The host has its `span` and the shadow root has the label once.
- `insert-before-template`: the page appends a `div` to `<body>` after the opening tag of the host has arrived. Expected
  as in `control`. Actual: the `<template>` stays in the light DOM (`template, span`), and Chromium logs
  `A second declarative shadow root cannot be created on a host`.
- `insert-inside-template`: the same while the template is streamed. Expected as in `control`. Actual: the shadow root
  has the label twice.
- `control-children` and `insert-before-children` use `<repro-ssr-children>`, which renders the number of its children.
  The server renders `children: 1`. When the page appends the `div` after the template of the host has arrived and
  before its child has, the component hydrates without the child and shows `children: 0`, although the host has its
  `span` in the end. Without the `div` it stays `children: 1`.

## `cjs-interop`

The CommonJS build of `loader-bundle` (`cjs: true`) calls `_interopNamespace()`, which is not defined anywhere.

```bash
npm run repro --workspace=cjs-interop
```

- Expected: `shadow root content: "<p>rendered</p>"`.
- Actual: `ReferenceError: _interopNamespace is not defined`, then
  `Error: Constructor for "repro-cjs#undefined" was not found`, and the shadow root stays empty.

`grep -rn "_interopNamespace" cjs-interop/dist/loader-bundle/cjs` shows the one call in the runtime chunk and no
definition. With `compat: { enableImportInjection: false }` in `stencil.config.ts` the component renders.
