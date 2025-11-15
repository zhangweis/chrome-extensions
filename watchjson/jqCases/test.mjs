import assert from 'node:assert';
import timespan from 'npm:timespan-parser@1.2.0';

import {curlJq} from '../index-deno.mjs';
import { assertObjectMatch } from "jsr:@std/assert@1.0.15";
import { fromFileUrl, dirname, relative } from "jsr:@std/path";
import {glob} from "node:fs/promises";
  const currentModuleUrl = import.meta.url;
  const currentModulePath = fromFileUrl(currentModuleUrl);
  const currentModuleDir = dirname(currentModulePath);
  const files = await glob(`${currentModuleDir}/*.jq.txt`);
  const modules = [];
  for await (const file of files) {
    const moduleName = relative(currentModuleDir, file);
    modules.push(moduleName);
  }

describe('v2subfees/', function() {
  for (const moduleName of modules) {
  it(moduleName, async function(){
      const module = await import("./"+moduleName,{with:{type:"text"}});
      const txt = module.default;
      const {result} = await curlJq(txt, {timeout:timespan.parse("30s","msec")});
//    assert.partialDeepStrictEqual(result.actual, result.expected);
    assertObjectMatch(result.actual, result.expected);
  });
  }
  });
