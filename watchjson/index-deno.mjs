import jq from "https://raw.githubusercontent.com/zhangweis/deno-tools/main/jq.asm.bundle.js"
import {vsprintf,sprintf} from 'https://jspm.dev/sprintf-js';
import forceArray from "https://jspm.dev/force-array";
import {parseFetchAndJq,formatBadges} from "./Controller.mjs";
import { parse } from "https://deno.land/std/flags/mod.ts";
const args = parse(Deno.args);
const stdinContent = await Deno.readAll(Deno.stdin);
const input = new TextDecoder().decode(stdinContent);
var {result} =await parseFetchAndJq(input,{jq});
if (result.badge) {result.formattedBadges = formatBadges(result.badge,{vsprintf,sprintf,forceArray});if (!args.k)delete result.badge} 
console.log(JSON.stringify(result));
