# Stencil 5 reproductions

Three bugs found while moving a component library from Stencil 4.45 to `5.0.0-rc.9`. Each folder is a minimal project
of its own.

| Reproduction           | 4.45.1                                          | 5.0.0-rc.9                                         |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------- |
| `should-update-parent` | count 3, `componentDidUpdate` after every click | count stays at 1, no `componentDidUpdate`          |
| `force-update`         | render count 1 → 2 → 3 → 4                      | render count 1 → 2 → 2 → 2                         |
| `cjs-interop`          | component renders                               | `ReferenceError: _interopNamespace is not defined` |

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
