import txt from './v2subfees.jq.txt' with {type:"text"};
import assert from 'node:assert';
import timespan from 'npm:timespan-parser@1.2.0';

import {curlJq} from '../index-deno.mjs';
import { assertObjectMatch } from "jsr:@std/assert@1.0.15";

describe('v2subfees/', function() {
  it('v2subfees.jq.txt', async function(){
      const {result} = await curlJq(txt, {timeout:timespan.parse("30s","msec")});
//    assert.partialDeepStrictEqual(result.actual, result.expected);
    assertObjectMatch(result.actual, result.expected);
  });
  });

