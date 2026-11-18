# SCSS parity: compiled CSS before and after

Method: `npm run build` with `index.html` linking `src/styles/index.css` (today), then again with the link switched to
`src/styles/index.scss` (local edit, reverted), and the two emitted `dist/assets/*.css` bundles compared, raw and after
collapsing whitespace.

Result: the bundles are **byte-identical** (44 051 bytes each; 44 035 after whitespace normalising). There is no
difference to explain.

What changed in the source only:

- 44 partials `src/styles/<area>/_<name>.scss`, copied from the `.css` files; `index.scss` `@use`s them in the
  `index.css` order. Six `ma/*` partials share a basename with a `panels/*` or `desk/*` one and get an `as ma-<name>`
  namespace (Sass needs unique namespaces; the output is unchanged).
- `abstracts/_mixins.scss`: `caption-caps` (`#cueHud .l1`, `.mGo .sx`) and `flex-fill` (`#pbSlot`, `#kpSlot`), the
  only declaration blocks of four or more lines repeated word for word.
- `abstracts/_breakpoints.scss`: the two top-bar media-query widths and a `below()` mixin (`desk/_top-bar-layout.scss`).
- No nesting added, no `@extend`, theme values stay custom properties.
