import jq from "https://raw.githubusercontent.com/zhangweis/deno-tools/main/jq.asm.bundle.js"
import { getStdin } from 'https://deno.land/x/get_stdin@v1.1.0/mod.ts';
import {parseFetchAndJq,formatBadges} from "./Controller.mjs";
import { parse } from "https://deno.land/std@0.213.0/flags/mod.ts";
import fetchCached from 'npm:fetch-cached@2.0.3';
function promisifySync(o) {
  const ret = {};
  for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(o))) {
    if (typeof o[key]=="function") {
      ret[key]=()=> 
         Promise.resolve(o[key].apply(o, arguments));
    }
  }
  return ret;
}
const cache = promisifySync(new Map());
const fetchImpl = fetchCached.default({
  fetch,
  cache
});

const args = parse(Deno.args);
const input = await getStdin({exitOnEnter: false});
var {result} =await parseFetchAndJq(input,{jq,fetch:fetchImpl});
if (result.badge) {result.formattedBadges = await formatBadges(result.badge);if (!args.k)delete result.badge} 
console.log(JSON.stringify(result));
