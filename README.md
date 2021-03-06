REciNK - Rethink Continuous Integration for JavaScript Applications
===================================================================

[![NPM Version](https://badge.fury.io/js/recink.svg?maxAge=0)](https://npmjs.org/package/recink)
[![Build Status](https://travis-ci.org/MitocGroup/recink.svg?branch=master&maxAge=0)](https://travis-ci.org/MitocGroup/recink)
[![Code Climate](https://codeclimate.com/github/MitocGroup/recink/badges/coverage.svg?maxAge=0)](https://codeclimate.com/github/MitocGroup/recink)
[![API Docs](https://mitocgroup.github.io/recink/api/badge.svg?maxAge=0)](https://mitocgroup.github.io/recink/api/)


REciNK was born from our need to automate the execution of JavaScript tests.
We quickly realized that we need to RETHINK (aka `REciNK`) entire Continuous
Integration process for JavaScript applications. Similar to `.travis.yml`, we
empower developers to simply drop the `.recink.yml` config file into GitHub
repository and follow below Getting Started guide to use it as part of their
Continuous Integration pipeline (maybe even extend to Continuous Deployment).


# Features

- [Install](https://github.com/MitocGroup/recink#installation).
[Configure](https://github.com/MitocGroup/recink/blob/master/docs/guide.md#configuring-github-project).
[Use](https://github.com/MitocGroup/recink#usage).
- Multi-module support for
[consolidated coverage](https://github.com/MitocGroup/recink/blob/master/bin/templates/.recink.yml#L50).
- Built-in support for [Travis](https://travis-ci.org),
[NPM](https://www.npmjs.com), [Chai](http://chaijs.com),
[Mocha](http://mochajs.org), [Istanbul](https://istanbul.js.org),
[TestCafe](https://devexpress.github.io/testcafe).
- Amazon S3 powered
[caching](https://github.com/MitocGroup/recink/blob/master/bin/templates/.recink.yml#L10).
- [Extendable](https://github.com/MitocGroup/recink#components).
[Debuggable](https://github.com/MitocGroup/recink#debugging).
[Documented](https://github.com/MitocGroup/recink#documentation).


# Prerequisites

- [x] Git >= v1.x
- [x] Node.js >= v6.x
- [x] NPM >= v3.x

> Use [nvm](https://github.com/creationix/nvm#installation) to install and
manage different versions of Node.js; Ideally, use v8+ for faster performance


# Installation

`npm install -g recink`


# Getting Started

@See [User Guide](https://github.com/MitocGroup/recink/blob/master/docs/guide.md#configuring-github-project)


# Usage

```shell
recink run [name] [path]               # Run a generic component
recink run unit [path]                 # Run unit tests                              
recink run e2e [path]                  # Run end to end tests                        
recink configure recink [path]         # Configure REciNK                            
recink configure travis [path]         # Configure Travis                            
recink travis encrypt [path]           # Encrypt Travis environment variables        
recink travis lint [path]              # Lint Travis configuration                   
recink component generate [path]       # Generate REciNK boilerplate component       
recink component add [name...]         # Add an REciNK component to the registry     
recink component remove [name...]      # Remove an REciNK component from the registry
recink component list                  # List REciNK components from the registry    
recink help <command>                  # Display help for a specific command   
```


# Debugging

To enable debug mode for both `unit` and `e2e` runtimes use `DEBUG=* recink run unit|e2e`.

[TestCafe](https://devexpress.github.io/testcafe) offers amazing debugging capabilities
[documented here](http://devexpress.github.io/testcafe/documentation/test-api/debugging.html).

We are using [Puppeteer](https://github.com/GoogleChrome/puppeteer)
as default browser, which provides native debugging capabilities
[documented here](https://github.com/GoogleChrome/puppeteer#debugging-tips).

> Use `-v` flag to enable verbose mode on any `recink` command.


# Supported CI Platforms

- [x] [Travis](https://travis-ci.org)
- [x] [Travis Pro](https://travis-ci.com)


# Documentation

- [x] [Quick Start Guide](https://github.com/MitocGroup/recink/blob/master/docs/guide.md)
- [x] [Crafting Components](https://github.com/MitocGroup/recink/blob/master/docs/component-guide.md)
- [x] [API Docs](https://mitocgroup.github.io/recink/api/identifiers.html)
- [x] [Module Diagram](https://mitocgroup.github.io/recink/module-diagram.html)
- [x] [FAQ](https://github.com/MitocGroup/recink/blob/master/docs/faq.md)


# Components

- :house: [CodeClimate](https://github.com/MitocGroup/recink/blob/master/components/codeclimate/README.md)
- :house: [Snyk.io](https://github.com/MitocGroup/recink/blob/master/components/snyk/README.md)
- :house: [PageSpeed](https://github.com/MitocGroup/recink/blob/master/components/pagespeed/README.md)
- :house: [Comment](https://github.com/MitocGroup/recink/blob/master/components/comment/README.md)
- :house: [Terraform](https://github.com/MitocGroup/recink/blob/master/components/terraform/README.md)

> Explore in-house built components [here](https://github.com/MitocGroup/recink/tree/master/components)


# Projects Using "REciNK"

- [Deep Framework](https://github.com/MitocGroup/deep-framework/blob/master/.recink.yml)

> To add you project to this list please open a PR ;)


# Roadmap

- [x] Implement smart cache invalidation
- [x] Add support for external components
- [x] Add support for fully automated `Travis` configuration 
- [x] Add support for End-to-End tests
- [x] Add component development guide
- [x] Add unit tests for critical functionality
- [x] Decouple e2e component
- [ ] Decouple unit component
- [ ] Decouple coverage component
- [ ] Add support for different CI platforms
- [ ] Craft a cool logo for the project :alien:
- [ ] Add unit tests to cover at least 80% of codebase


# Sponsors

This repository is being sponsored by:

- [Mitoc Group](https://www.mitocgroup.com)
- [AdTechMedia](https://www.adtechmedia.io)


# License

REciNK is released under the [MIT license][1].

[1]: https://github.com/MitocGroup/recink/blob/master/LICENSE.md
