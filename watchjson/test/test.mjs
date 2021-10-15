import assert from 'assert';
import {fetchAndJq, parseFetchAndJq, parseAndFetch} from "../Controller.mjs";
import hungryFetch from './hungry-fetch.js';
import {Response} from 'node-fetch';
global.Response = Response;
hungryFetch.mockResponse('http://good.com/', {
  data: 'some data'
});

describe('Array', function() {
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
    it('supports configs', async function() {
      hungryFetch.mockResponse('config', `{
        urls:[{data:{pure:1}}],jq:".[0]"
      }
      `);
      hungryFetch.mockResponse('from1', `{
        urls:[{data:.}]
      }
      `);
      var {result} = await parseFetchAndJq(`{
        config:["config"],configJq:".[0]",
        from:"from1"
      }
      `
      );
      assert.deepStrictEqual(result,[{pure:1}]);
    });
    it('from content contains configs', async function() {
      hungryFetch.mockResponse('config', `{
        urls:[{data:{pure:1}}],jq:".[0]"
      }
      `);
      hungryFetch.mockResponse('from0', `{
        config:["config"],configJq:".[0]",
        from:"from1"
      }
      `);
      hungryFetch.mockResponse('from1', `{
        urls:[{data:.}]
      }
      `);
      var {result} = await parseFetchAndJq(`{
        from:"from0"
      }
      `
      );
      assert.deepStrictEqual(result,[{pure:1}]);
    });
    it('supports multiple', async function() {
      hungryFetch.mockResponse('config', `{
        urls:[{data:{pure:1}}],jq:".[0]"
      }
      `);
      hungryFetch.mockResponse('from1', `{
        urls:[{data:.}]
      }
      `);
      var {result} = await parseFetchAndJq(`
      {urls:[{data:"data"}]}
      >>
      .[0]|
      {
        urls:[{data:.}]
      }
      `
      );
      assert.deepStrictEqual(result,["data"]);
    });

  });
});
});