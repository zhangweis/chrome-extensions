import jqInit from "./jqweb.js";
//import jqWasm from './jq.wasm' with {type:"bytes"};
var jq;
export async function loadJq(wasmBinary){
  if (jq) return jq;
    jq  = await jqInit({wasmBinary});
jq.promised = {raw:jq.raw};
return jq;
}

