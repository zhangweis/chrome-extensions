import jq from "https://raw.githubusercontent.com/zhangweis/deno-tools/main/jq.asm.bundle.js"
import { getStdin } from 'https://deno.land/x/get_stdin@v1.1.0/mod.ts';
import {vsprintf,sprintf} from 'https://jspm.dev/sprintf-js';
import forceArray from "https://jspm.dev/force-array";
import {parseFetchAndJq,formatBadges} from "./Controller.mjs";
import { parse } from "https://deno.land/std@0.213.0/flags/mod.ts";
const args = parse(Deno.args);
const input = await getStdin({exitOnEnter: false});
var {result} =await parseFetchAndJq(input,{jq});
if (result.badge) {result.formattedBadges = await formatBadges(result.badge,{vsprintf,sprintf,forceArray});if (!args.k)delete result.badge} 
console.log(JSON.stringify(result));
