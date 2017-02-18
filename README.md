# bd-load
### The Backdraft AMD loader by [ALTOVISO](http://www.altoviso.com/).

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]

## The fastest and smallest AMD loader ever built

# Features

* Extremely compact--less than 500 lines of code

* Algorithms optimized to theoretical minimum time complexity possible

* Executes on node.js and in the browser

* Includes the features required to construct large applications

* Does not include unnecessary, outdated, and/or naive features present in other loaders

* Fully leverages JS6

# Why Another Version of bd-load?

Version 1.x of bd-load was rolled into Dojo back in 2011 and is probably the second-most used AMD loader next to Requirejs.
It is still the most capable AMD loader today and contains many features and capabilities not available in other loaders. It
is also one of the fastest and smallest.

Although it was important to add tons of capabilities and features into the loader back six years ago for historical and marketing reasons,
much of that machinery was never needed to build optimal applications.

###Most AMD loaders either solve problems we don't care about--and are therefore bloated--or are poorly built...or both!

Furthermore, native ES6 modules are vaporware and, when they do become available, add almost nothing to the party.

###bd-load implements exactly the features needed to build modern applications and leverages ES6 to express the fastest and smallest AMD loader ever built.

If you want to write programs that have a loader 5X bigger, slower, and does foolish things like scans module text
for require statements, bd-load is not the loader for you.

If you want to load AMD- or UMD-compliant modules in either the browser or node while incurring the minimum cost in time
and space, then bd-load is likely the best option.

## Installation

Coming soon.


# History

Though not common knowledge, bd-load has been in wide-scale continuous use with Dojo since 2011. The project was initially
made public in late 2010 and rapidly incorporated into the [Dojo Toolkit](https://dojotoolkit.org/) culminating in release 1.5 of 
Dojo.

The v1.x loader is extremely advanced and implements the original Dojo synchronous and cross-domain APIs
as well as the AMD API. It includes many still-novel features, and can be built exemplifying one of the smallest and fastest
AMD-compatible loaders available using the Dojo build system (also originally an ALTOVISO project).

From mid 2011, almost all maintenance of the backdraft loader took place within the Dojo project. In late 2012, a prototype
space-optimized version of the loader ([bdload-so.js](https://github.com/altoviso/bdLoad/blob/0f62f334a751e8d4b4620af0d08c9fb33a7a644a/lib/bdload-so.js)) 
was constructed. That loader was used as inspiration for the Dojo v2.0 loader.

Since JS6 includes several features that make a smaller loader possible, and further since the typical loaders available 
are packed full of cruft, outdated APIs, and naive features, ALTOVISO built and released v2.x of bd-load in early 2017.

## Status

As of February 2017, the loader is under active development. It includes tests that prove most of the AMD specification.
Currently the plugin API is not available. Although we find that API mostly unnecessary, it is currently being added, and
with more advanced features than are specified in the AMD specification.

## License

bd-load is free and open source software available under a BSD-3-Clause license.

[deps-image]:     https://img.shields.io/david/altoviso/bd-load.svg
[deps-url]:       https://david-dm.org/altoviso/bd-load
[dev-deps-image]: https://img.shields.io/david/dev/altoviso/bd-load.svg
[dev-deps-url]:   https://david-dm.org/altoviso/bd-load#info=devDependencies
[travis-image]:   https://img.shields.io/travis/altoviso/bd-load.svg
[travis-url]:     https://travis-ci.org/altoviso/bd-load

