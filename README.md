@swc/register
========
One of the ways you can use swc is through the require hook. The require hook
will bind itself to node's require and automatically compile files on the fly.

### Install
```bash
npm i -D @swc/core @swc/register
```

or

```bash
yarn add --dev @swc/core @swc/register
```

### Usage
```bash
require("@swc/register");
```

All subsequent files required by node will be transformed by swc. You can also
call @swc/register directly from command line.

```bash
swc-node <filename>
node -r '@swc/register' <filename>
```

&nbsp;

--------
*@swc/register* is primarily distributed under the terms of both the [MIT
license] and the [Apache License (Version 2.0)]. See [COPYRIGHT] for details.

[MIT license]: LICENSE-MIT
[Apache License (Version 2.0)]: LICENSE-APACHE
[COPYRIGHT]: COPYRIGHT
