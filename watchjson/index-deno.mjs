import jq from "https://raw.githubusercontent.com/zhangweis/deno-tools/main/jq.asm.bundle.js"
import {vsprintf,sprintf} from 'https://jspm.dev/sprintf-js';
import {parseFetchAndJq,formatBadges} from "./Controller.mjs";
const stdinContent = await Deno.readAll(Deno.stdin);
const input = new TextDecoder().decode(stdinContent);
var {result} =await parseFetchAndJq(input,{jq});
if (result.badge) {result.formattedBadges = formatBadges(result.badge,{vsprintf,sprintf})} 
console.log(JSON.stringify(result));
