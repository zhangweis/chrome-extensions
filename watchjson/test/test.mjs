import assert from 'assert';
import {parseFetchAndJq as originParse} from "../Controller.mjs";
import hungryFetch from './hungry-fetch.js';
import mockdate from 'mockdate'
import chai,{expect} from 'chai';
import jq from "jq-web";
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import {Response} from 'node-fetch';

global.Response = Response;
async function parseFetchAndJq(filter,context={},on) {
  return await originParse(filter,{...context,jq},on);
}
hungryFetch.mockResponse('http://good.com/', {
  data: 'some data'
});
async function fetchAndJq(o) {
  return await parseFetchAndJq(JSON.stringify(o));
}
describe('parseFetchAndJq', function() {
  beforeEach(() => {
    hungryFetch.clear();
   });
    it('supports function import', async function() {
      hungryFetch.mockResponse('function.txt', `def abc:1;`);
      var {result} = await parseFetchAndJq(`
      {imports:["function.txt"]
      ,
      urls:[],
      jq:"abc"}
      `
      );
      assert.deepStrictEqual(result,1);
    });
  describe('pureData', function() {
    it('simplifiedPureData', async function() {
      var {result:resp} = await fetchAndJq({
        pure:1
      });
      assert.deepStrictEqual({pure:1}, resp);
    });
    
    it('pureData', async function() {
      var {result:resp} = await fetchAndJq({
        urls:[{data:{pure:1}}]
        ,jq:'.[0]'
      });
      assert.deepStrictEqual({pure:1}, resp);
    });
    it('no jq', async function() {
      var {result} = await parseFetchAndJq(`{
        urls:[{data:{pure:1}}]
      }
      `
      );
      assert.deepStrictEqual([{pure:1}], result);
    });
    it('returns fetches', async function() {
      var {fetches} = await fetchAndJq({
        urls:[{data:{pure:1}}]
        ,jq:'.[0]'
      });
      assert.deepStrictEqual([{pure:1}], fetches);
    });
    it('array_puredata', async function() {
      var {result} = await fetchAndJq([{
        urls:[{data:{pure:1}}]
      },{
        urls:[{data:{pure:2}}]
      }]);
      assert.deepStrictEqual([[{pure:1}],[{pure:2}]], result);
    });
    it('parseFetchAndJq', async function() {
      var {result} = await parseFetchAndJq(`{
        urls:[{data:{pure:1}}]
      }
      `
      );
      assert.deepStrictEqual([{pure:1}], result);
    });
    it('pureData1', async function() {
      hungryFetch.mockResponse('/path/to/nowhere', {
        data: 'some data'
      });
    var resp = await (await fetch("/path/to/nowhere")).json();
    assert.deepStrictEqual({data:'some data'}, resp);
  });
  });
  describe('httpFetch', function() {
    it('throws error when status=500', async function() {
      hungryFetch.mockResponse('retry-able', `text`,{
        status:500
      });
      await expect((async()=>{
      return await parseFetchAndJq(`
      {
        urls:[{url:"retry-able"}]
      }
      `
      )
      })()).to.be.rejectedWith(Error)
      });
    it('succeed only once', async function() {
      hungryFetch.mockResponse('retry-able', `text`);
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"retry-able"}]
      }
      `
      );
      assert.deepStrictEqual(hungryFetch.calls().length,1);
      });
    it('retries 2times', async function() {
      hungryFetch.mockResponse('retry-able', `text`,{
        status:500
      });
      try{
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"retry-able"}]
      }
      `
      );
      }catch(e){
      assert.deepStrictEqual(hungryFetch.calls().length,2);
      }
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
    it('error contains fetches when jq fails', async function() {
      hungryFetch.mockResponse('from', `{
        "data":"data"
      }
      `);
      try {
      var {options,result} = await parseFetchAndJq(`{
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
  describe('fetchFrom', function() {
   it('parseFetchAndJq supports from', async function() {
      hungryFetch.mockResponse('from', `{
        urls:[{data:{pure:1}}]
      }
      `);
      var {originFetchOption:options,result} = await parseFetchAndJq(`{
        from:"from"
      }
      `
      );
      assert.deepStrictEqual(options.froms.urls,[{data:{pure:1}}]);
      assert.deepStrictEqual(result,[{pure:1}]);
    });
   it('from supports fromjq', async function() {
      hungryFetch.mockResponse('from', `{
        urls:[{data:{pure:1}}]
      }
      `);
      var {options,result} = await parseFetchAndJq(`{
        from:"from",fromjq:"{data1:.[0]}"
      }
      `
      );
      assert.deepStrictEqual(result,{data1:{pure:1}});
    });
   it('from supports append', async function() {
      hungryFetch.mockResponse('from', `{
        urls:[{data:{pure:1}}]
      }
      `);
      var {options,result} = await parseFetchAndJq(`{
        from:"from",fromjq:"{data1:.[0]}",
        add:{data2:"data2"}
      }
      `
      );
      assert.deepStrictEqual(result,{data1:{pure:1},data2:"data2"});
    });
    it('from supports array append', async function() {
      hungryFetch.mockResponse('from', `{
        urls:[{data:{pure:1}}]
      }
      `);
      var {options,result} = await parseFetchAndJq(`{
        from:"from",
        add:[{data2:"data2"}]
      }
      `
      );
      assert.deepStrictEqual(result,[{pure:1},{data2:"data2"}]);
    });
});

  describe('multiple segments', function() {
    it('supports multiple puredata', async function() {
      var {result} = await parseFetchAndJq(`
      {data:"data"}
      >>>
      {
        urls:[{data:.data}]
      }
      `
      );
      assert.deepStrictEqual(result,["data"]);
    });
    it('normalized from url', async function() {
      hungryFetch.mockResponse('http://site/one/from0', `
      {urls:[{data:"data"}]}
      `);
      var {originFetchOption,normalizedFroms} = await parseFetchAndJq(`
      {from:"../from0"}
      >>>
      .[0]|
      {
        urls:[{data:.}]
      }
      `,{baseUrl:'http://site/one/two/abc.jq.txt'}
      );
      assert.deepStrictEqual(originFetchOption.normalizedFroms,["http://site/one/from0"]);
    });
    it('from supports data input', async function() {
      hungryFetch.mockResponse('from', `
      {urls:[{data:.data}]}
      `);
      var {result} = await parseFetchAndJq(`
      {data:"data"}
      >>>
      {from:"from"}
      `
      );
      assert.deepStrictEqual(result,["data"]);
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
    it('fetches contain hierarchy', async function() {
      hungryFetch.mockResponse('from0', `
      {urls:[{data:"data"}]}
      `);
      var {fetches} = await parseFetchAndJq(`
      {from:"from0"}
      >>>
      .[0]|
      {
        urls:[{data:.}]
      }
      `
      );
      assert.deepStrictEqual(fetches,[["data"],["data"]]);
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
  });
});
