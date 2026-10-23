#!/usr/bin/env node
/// <reference types="node" />
// The khe-design-lint bin (estate ADR-021, docs/adr/005). Node only: no browser entry imports it.
import { main } from './design-lint/run.js';

process.exitCode = main(process.argv.slice(2), (line) => console.log(line));
