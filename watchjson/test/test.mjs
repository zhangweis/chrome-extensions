//import assert from 'assert';
import assert from 'node:assert';
import {parseFetchAndJq as originParse, formatBadges as orginFormatBadges} from "../Controller.mjs";
//import hungryFetch from './hungry-fetch.js';
import * as hungryFetch from 'https://jspm.dev/hungry-fetch';
import mockdate from 'mockdate'
import chai,{expect} from 'chai';
//import jq from "jq-web";
import jq from "../jq.asm.bundle1.js";
import chaiAsPromised from 'chai-as-promised';
import forceArray from "force-array";
import {vsprintf,sprintf} from 'sprintf-js';
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/x/deno_mocha/mod.ts";

chai.use(chaiAsPromised);

async function parseFetchAndJq(filter,context={},on) {
  return await originParse(filter,{...context,jq},on);
}
function formatBadges(badges) {
  return orginFormatBadges(badges, {forceArray, vsprintf,sprintf});
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
    it('import as context functions', async function() {
      hungryFetch.mockResponse('function.txt', `def abc:1;`);
      var {result} = await parseFetchAndJq(`
      {importsContext:["function.txt"]}
      >>>
      abc
      `
      );
      assert.deepStrictEqual(result,1);
    });
/*    it('import as context functions keeps original value', async function() {
      hungryFetch.mockResponse('function.txt', `def abc:1;`);
      var {result} = await parseFetchAndJq(`
      2>>>
      {importsContext:["function.txt"]}
      >>>
      .
      `
      );
      assert.deepStrictEqual(result,2);
    });
*/
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
    it('supportsAdd', async function() {
      var {result:resp} = await fetchAndJq({
        urls:[{data:{pure:1}}]
        ,jq:'.[0]',add:{added:2}
      });
      assert.deepStrictEqual({pure:1,added:2}, resp);
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
  beforeEach(() => {
    hungryFetch.clear();
   });
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
    it('error contains current baseUrl', async function() {
      hungryFetch.mockResponse('http://site/a/retry-able', `text`,{
        status:500
      });
      try {
      await parseFetchAndJq(`
      {
        urls:[{url:"./retry-able"}]
      }
      `
      ,{baseUrl:'http://site/a/a.jq.txt'})
        chai.fail('no throw');
      } catch (e) {
        expect(e.message).to.include("a/retry-able");
      }
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
    it('supports post object as body', async function() {
      hungryFetch.mockResponse('post', `{"ok":1}`);
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"post",body:{body:1}}]
      }
      `
      );
      const call = hungryFetch.singleCall();
      expect(call.json()).to.deep.equal({body:1});

      assert.deepStrictEqual(result,[{ok:1}]);
    });
/*    it('supports data urls', async function() {
      var {result} = await parseFetchAndJq(`
      {
        urls:[{url:"data:text/plain;charset=utf-8;base64,dGV4dA=="}]
      }
      `
      );
      assert.deepStrictEqual(result,["text"]);
    });
*/
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
  beforeEach(() => {
    hungryFetch.clear();
   });
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
   it('from supports params', async function() {
      hungryFetch.mockResponse('from', `{
        urls:[{data:.}]
      }
      `);
      var {options,result} = await parseFetchAndJq(`{
        from:"from",params:{param1:1}
      }
      `
      );
      assert.deepStrictEqual(result,[{param1:1}]);
    });
});

  describe('multiple segments', function() {
  beforeEach(() => {
    hungryFetch.clear();
   });
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
    it('supportsFunctions', async function() {
      var {result} = await parseFetchAndJq(`
      {functions:"def func1:1;def func2:2;"}
      >>>
      {
        a:func1
      }
      `
      );
      assert.deepStrictEqual(result,{a:1});
    });
    it('functionsOnContext', async function() {
      var {result} = await parseFetchAndJq(`
      {functions:"def func1:1;def func2:2;"}
      >>>
      1
      >>>
      {
        a:func1
      }
      `
      );
      assert.deepStrictEqual(result,{a:1});
    });
    it('supportsDollarContext', async function() {
      var {result} = await parseFetchAndJq(`
      {functions:"def func1:1;def func2:2;"}
      >>>
      1
      >>>
      {
        a:$functions
      }
      `
      );
      assert.deepStrictEqual(result,{a:"def func1:1;def func2:2;"});
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
    it('useOriginWhenNoUrls', async function() {
      var {result} = await parseFetchAndJq(`
      {urls:[{data:"data"}]}
      >>>
      .[0]
      `
      );
      assert.deepStrictEqual(result,"data");
    });
    it('argsWithoutFromOrUrls', async function() {
      var {result} = await parseFetchAndJq(`
      {args:{params:{p1:1}}}
      >>>
      2
      >>>
      $params.p1
      `
      );
      assert.deepStrictEqual(result,1);
    });
    it('supportsArgs', async function() {
      var {result} = await parseFetchAndJq(`
      {urls:[{data:"data"}],args:{params:{p1:1}}}
      >>>
      2
      >>>
      $params.p1
      `
      );
      assert.deepStrictEqual(result,1);
    });
    it('argsCumulates', async function() {
      var {result} = await parseFetchAndJq(`
      {args:{p1:1}}
      >>>
      {args:{p2:2}}
      >>>
      [$p1,$p2]
      `
      );
      assert.deepStrictEqual(result,[1,2]);
    });
    it('recursiveArgs', async function() {
      hungryFetch.mockResponse('from', `
      {args:{params:{p1:2}}}
      >>>
      $params.p1
      `);
      var {result} = await parseFetchAndJq(`
      {urls:[{data:"data"}],args:{params:{p1:1}}}
      >>>
      {from:"from"} 
      >>>
      {p1From:.,p1:$params.p1}
      `
      );
      assert.deepStrictEqual(result,{p1From:2,p1:1});
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
  describe('formatBadges', function() {
    it('supports string', async function() {
      var result = formatBadges('string');
      assert.deepStrictEqual(['string'], result);
    });
    it('support string array', async function() {
      var result = formatBadges(['s1','s2']);
      assert.deepStrictEqual(['s1','s2'], result);
    });
    it('supports number', async function() {
      var result = formatBadges(1);
      assert.deepStrictEqual(['1'], result);
    });
    it('supports number format', async function() {
      var result = formatBadges([['%.2f',0.3]]);
      assert.deepStrictEqual(['0.30'], result);
    });
  });
});
