import jq from "https://bts.dexfree.com/john/dev/jq.asm.bundle.js"
import {parseFetchAndJq} from "./Controller.mjs";
const stdinContent = await Deno.readAll(Deno.stdin);
const input = new TextDecoder().decode(stdinContent);
var {result} =await parseFetchAndJq(input,{jq});
console.log(JSON.stringify(result));
