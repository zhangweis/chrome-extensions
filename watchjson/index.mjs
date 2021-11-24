import getStdin from 'get-stdin';
import fetch from 'node-fetch';
import {parseFetchAndJq} from "./Controller.mjs";
global.fetch=fetch;
var input = await getStdin();
var result = await parseFetchAndJq(input);
console.log(JSON.stringify(result.result));

