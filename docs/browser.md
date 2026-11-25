# In the browser

symcrys runs in a web page as it is, without a bundler: the package's `dist/` imports only
relative `.js` paths, so a copy of it next to the page is loaded by the browser module by module,
as the crystallography teaching apps do. An import map gives it the name `symcrys`, so that the page
script imports it as in Node.

<a href="browser/index.html">The example as a page of this site</a> shows the form of a property
tensor for a crystal class, a setting and a property chosen in three lists: the free components,
and how each other component follows from them.

## The files

Copy `dist/` of the package (from the npm tarball, `node_modules/symcrys/dist/`, or the release on
GitHub) to `symcrys/` next to the page, and serve the folder over HTTP (for instance
`python3 -m http.server` in it): a browser does not load modules from a page opened as a file.

```text
index.html
main.js       the page: lists, events, output
form.js       the form as text, without the DOM
symcrys/      a copy of dist/
```

The import map names only `symcrys`; the other entry points are added in the same way
(`"symcrys/magnetic": "./symcrys/magnetic.js"`, `"symcrys/plane": "./symcrys/plane.js"`).

```{literalinclude} examples/browser/index.html
:language: html
```

```{literalinclude} examples/browser/main.js
:language: js
```

`form.js` turns the numbers of `tensorForm` into text: the free components are the index lists of
`parameters`, and each row of `relations` has 1 at a dependent component and minus its coefficients at
the free ones, a row with a single 1 a component that is 0 ([Conventions](conventions.md), "Tensors"). Such text is the application's choice,
not symcrys' ([Conventions](conventions.md), "Tensors").

```{literalinclude} examples/browser/form.js
:language: js
```

## The same logic in Node

`form.js` takes the module as an argument, so the page and Node run the same code. When the site is
built, it runs as follows, and the page script is type-checked against the DOM:

```{ts-example} browser-form.ts

```
