# PageLifecycle.js

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [Properties](#properties)
  - [Methods](#methods)
  - [Events](#events)
- [Browser Support](#browser-support)


## Overview

PageLifecycle.js is a tiny JavaScript library (<1K gzipped) that allows developers to easily observe [Page Lifecycle API](https://github.com/WICG/page-lifecycle) state changes and implement Page Lifecycle best practices consistently across all browsers.

**▶️ View demo: [page-lifecycle.glitch.me](https://page-lifecycle.glitch.me/) 👀**

## Installation

You can install this library from npm by running:

```sh
npm install --save-dev page-lifecycle
```

## Usage

Releases of this library include three minified, production-ready versions:

**1. ES5: [`dist/lifecycle.es5.js`](/dist/lifecycle.es5.js)** (UMD) ⭐

Use this version for maximum compatibility with legacy browsers (that can't run ES2015+ code).

As a UMD bundle, it can be required in CommonJS or AMD environments, or it can be loaded with a script tag as the browser global `lifecycle`.

```html
<script defer src="/path/to/lifecycle.es5.js"></script>
<script defer>
lifecycle.addEventListener('statechange', function(event) {
  console.log(event.oldState, event.newState);
});
</script>
```

**2. ES2015: [`dist/lifecycle.mjs`](/dist/lifecycle.mjs)** (ESM) 🔥

Use this version if you only support ES module-capable browsers or if you're using `<script type="module">` and the `nomodule` fallback [to conditionally target modern browsers](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/).

```html
<script type="module">
import lifecycle from '/path/to/page-lifecycle.mjs';

lifecycle.addEventListener('statechange', function(event) {
  console.log(event.oldState, event.newState);
});
</script>
```


**3. ES2015 (native): [`dist/lifecycle.native.mjs`](/dist/lifecycle.native.mjs)** (ESM w/o `EventTarget` and `Event` shims) ⚠️

Use this version if you're only targeting browsers that [support extending `EventTarget` and `Event` constructors](https://www.chromestatus.com/features/5721972856061952).

*Note: this version is the smallest but will only work in some browsers. The implementation instructions are the same as the ES2015 version above.*

## API

The PageLifecycle.js library exports a `lifecycle` object, which is a singleton instance of the [`Lifecycle`](/src/Lifecycle.mjs) class. The `Lifecycle` class has the following properties, methods, and events:

### Properties

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Type</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>state</code></td>
    <td><code>string</code></td>
    <td>
      Returns the current Page Lifecycle state.
    </td>
  </tr>
  <tr valign="top">
    <td><code>pageWasDiscarded</code></td>
    <td><code>boolean</code></td>
    <td>
      Returns the value of <code>document.wasDiscarded</code> (or <code>false</code> if not present).
    </td>
  </tr>
</table>

### Methods

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>addEventListener</code></td>
    <td>
      <p><strong>Parameters:</strong></p>
      <ul>
        <li><em>type</em>: <code>string</code></li>
        <li><em>listener</em>: <code>function(Event)</code></li>
      </ul>
      <p>Adds a callback function to be invoked whenever the passed event type is detected. <em>(Note: at the moment only the "statechange" event type is supported.)</em></p>
    </td>
  </tr>
  <tr valign="top">
    <td><code>removeEventListener</code></td>
    <td>
      <p><strong>Parameters:</strong></p>
      <ul>
        <li><em>type</em>: <code>string</code></li>
        <li><em>listener</em>: <code>function(Event)</code></li>
      </ul>
      <p>Removes a function from the current list of listeners for the passed event type. <em>(Note: at the moment only the "statechange" event type is supported.)</em></p>
    </td>
  </tr>
  <tr valign="top">
    <td><code>addUnsavedChanges</code></td>
    <td>
      <p><strong>Parameters:</strong></p>
      <ul>
        <li><em>id</em>: <code>Object|Symbol</code></li>
      </ul>
      <p>Adds an item to an internal pending-changes stack. Calling this method adds a generic <code>beforeunload</code> listener to the window (if one isn't already added).</p>
      <p>The argument passed should be unique to this state, as it can only be removed by passing the same argument to <code>removeUnsavedChanges()</code>.
      </p>
    </td>
  </tr>
  <tr valign="top">
    <td><code>removeEventListener</code></td>
    <td>
      <p><strong>Parameters:</strong></p>
      <ul>
        <li><em>id</em>: <code>Object|Symbol</code></li>
      </ul>
      <p>Removes an item matching the passed argument from an internal pending-changes stack. If the stack is empty, the generic <code>beforeunload</code> listener is removed from the window.</p>
    </td>
  </tr>
</table>

### Events

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>statechange</code></td>
    <td>
      <p><strong>Properties:</strong></p>
      <ul>
        <li><em>newState</em>: <code>string</code> The current lifecycle state the page just transitioned to.</li>
        <li><em>oldState</em>: <code>string</code> The previous lifecycle state the page just transitioned from.</li>
        <li><em>originalEvent</em>: <code>Event</code> the DOM event that triggered the state change.</li>
      </ul>
      <p>The <code>statechange</code> event is fired whenever the page's lifecycle state changes.</p>
    </td>
  </tr>
</table>


## Browser Support

<table>
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/chrome/chrome_48x48.png" alt="Chrome"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/firefox/firefox_48x48.png" alt="Firefox"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/safari/safari_48x48.png" alt="Safari"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/edge/edge_48x48.png" alt="Edge"><br>
      ✔
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/archive/internet-explorer_9-11/internet-explorer_9-11_48x48.png" alt="Internet Explorer"><br>
      9+
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/alrra/browser-logos/39.2.2/src/opera/opera_48x48.png" alt="Opera"><br>
      ✔
    </td>
  </tr>
</table>

PageLifecycle.js has been tested and known to work in the above browsers.
