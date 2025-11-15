import {loadJq} from "./jq.js";
import { getStdin } from 'https://deno.land/x/get_stdin@v1.1.0/mod.ts';
import {parseFetchAndJq,formatBadges} from "./Controller.mjs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import timespan from 'npm:timespan-parser@1.2.0';
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

export async function curlJq(input, params) {
  return await parseFetchAndJq(input,{jq:await loadJq(),fetch:fetchImpl,...params});
}
if (import.meta.main) {
const args = parseArgs(Deno.args,{default:{timeout:"30s"}});
const input = await getStdin({exitOnEnter: false});
var {result} = await curlJq(input, {timeout:timespan.parse(args.timeout,"msec")});
if (result.badge) {result.formattedBadges = await formatBadges(result.badge);if (!args.k)delete result.badge} 
console.log(JSON.stringify(result));
}
