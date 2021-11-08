import assert from 'assert';
import {fetchAndJq, parseFetchAndJq, parseAndFetch} from "../Controller.mjs";
import hungryFetch from './hungry-fetch.js';
import mockdate from 'mockdate'

import {Response} from 'node-fetch';

global.Response = Response;
hungryFetch.mockResponse('http://good.com/', {
  data: 'some data'
});

describe('Array', function() {
  beforeEach(() => {
    hungryFetch.clear();
   });
  describe('pureData', function() {
    it('pureData', async function() {
      var {result:resp} = await fetchAndJq({
        urls:[{data:{pure:1}}]
        ,jq:'.[0]'
      });
      assert.deepStrictEqual({pure:1}, resp);
    });
    it('returns fetches', async function() {
      var {fetches} = await fetchAndJq({
        urls:[{data:{pure:1}}]
        ,jq:'.[0]'
      });
      assert.deepStrictEqual([{pure:1}], fetches);
    });
    it('parseAndFetch', async function() {
      var {result} = await parseAndFetch(`{
        urls:[{data:{pure:1}}]
      }
      `
      );
      assert.deepStrictEqual([{pure:1}], result);
    });
    it('error contains fetches when jq fails', async function() {
      hungryFetch.mockResponse('from', `{
        "data":"data"
      }
      `);
      try {
      var {options,result} = await parseAndFetch(`{
        urls:[{url:"from"}],
        jq:"error"
      }
      `
      );
      assert.fail("should fail as jq is error");
      }catch(e){
        assert.deepStrictEqual(e.fetches, [{data:"data"}]);
      }
    });
   it('parseAndFetch supports from', async function() {
      hungryFetch.mockResponse('from', `{
        urls:[{data:{pure:1}}]
      }
      `);
      var {options,result} = await parseAndFetch(`{
        from:"from"
      }
      `
      );
      assert.deepStrictEqual(options,{urls:[{data:{pure:1}}]});
      assert.deepStrictEqual(result,[{pure:1}]);
    });
    it('pureData1', async function() {
      hungryFetch.mockResponse('/path/to/nowhere', {
        data: 'some data'
      });
    var resp = await (await fetch("/path/to/nowhere")).json();
    assert.deepStrictEqual({data:'some data'}, resp);
  });
  describe('parseFetchAndJq', function() {
    it('is normal', async function() {
      var {result} = await parseFetchAndJq(`{
        urls:[{data:{pure:1}}]
      }
      `
      );
      assert.deepStrictEqual([{pure:1}], result);
    });
    it('supports multiple', async function() {
      var {result} = await parseFetchAndJq(`
      {urls:[{data:"data"}]}
      >>>
      .[0]|
      {
        urls:[{data:.}]
      }
      `
      );
      assert.deepStrictEqual(result,["data"]);
    });
    it('multiple supports from', async function() {
      hungryFetch.mockResponse('from0', `
      {urls:[{data:"data"}]}
      `);
      var {result} = await parseFetchAndJq(`
      {from:"from0"}
      >>>
      .[0]|
      {
        urls:[{data:.}]
      }
      `
      );
      assert.deepStrictEqual(result,["data"]);
    });
    it('multiple from supports relative url', async function() {
      hungryFetch.mockResponse('http://site/one/from0', `
      {urls:[{data:"data"}]}
      `);
      var {result} = await parseFetchAndJq(`
      {from:"../from0"}
      >>>
      .[0]|
      {
        urls:[{data:.}]
      }
      `,{baseUrl:'http://site/one/two/abc.jq.txt'}
      );
      assert.deepStrictEqual(result,["data"]);
    });
    it('from multiple', async function() {
      hungryFetch.mockResponse('from0', `
      {urls:[{data:"data"}]}
      >>>
      .[0]|
      {
        urls:[{data:.}]
      }
      `);

      var {result} = await parseFetchAndJq(`
      {from:"from0"}
      `
      );
      assert.deepStrictEqual(result,["data"]);
    });
    it('multiple supports function', async function() {
      var {result} = await parseFetchAndJq(`
      {urls:[{data:{functions:"def abc:1;"}}],
      jq:".[0]"}
      >>>
      {
        urls:[{data:abc}]
      }
      `
      );
      assert.deepStrictEqual(result,[1]);
    });
    it('supports text url', async function() {
      hungryFetch.mockResponse('text.txt', `text`);
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"text.txt"}]
      }
      `
      );
      assert.deepStrictEqual(result,["text"]);
    });
    it('supports relative url', async function() {
      hungryFetch.mockResponse('http://site/one/two/text.txt', `text`);
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"./text.txt"}]
      }
      `,{baseUrl:'http://site/one/two/abc.jq.txt'}
      );
      assert.deepStrictEqual(result,["text"]);
    });
  });
  describe('timestamp', function() {
  beforeEach(() => {
    mockdate.set(new Date(1))
  })
  afterEach(() => {
    mockdate.reset()
  })

    it('supports t_only', async function() {
      hungryFetch.mockResponse('http://site/one/two/text.txt?t=1', `text`);
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"./text.txt?t=\${t}"}]
      }
      `,{baseUrl:'http://site/one/two/abc.jq.txt'}
      );
      assert.deepStrictEqual(result,["text"]);
    });
    it('supports timestamp', async function() {
      hungryFetch.mockResponse('http://site/one/two/text.txt?t=1', `text`);
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"./text.txt?t=\${timestamp}"}]
      }
      `,{baseUrl:'http://site/one/two/abc.jq.txt'}
      );
      assert.deepStrictEqual(result,["text"]);
    });

  });
});
});
