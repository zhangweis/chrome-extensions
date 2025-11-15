import jqInit from "./jqweb.js";
//import jqWasm from './jq.wasm' with {type:"bytes"};
var jq;
export async function loadJq(wasmBinary){
  if (jq) return jq;
  if (!wasmBinary) 
    wasmBinary=(await import("./jq.wasm",{with:{type:"bytes"}})).default;
    jq  = await jqInit({wasmBinary});
jq.promised = {raw:jq.raw};
return jq;
}

