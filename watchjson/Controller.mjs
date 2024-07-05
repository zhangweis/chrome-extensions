import {vsprintf,sprintf} from 'https://jspm.dev/sprintf-js';
import forceArray from "https://jspm.dev/force-array";
async function parseFetchAndJq(filter1,context={},on={}) {
    var filter = filter1;
    const jq=context.jq;
  const fetchImpl = context.fetch||fetch;
async function importFunctions(context,imports) {
    var importText = await Promise.all(
      imports.map(async (url) => {
        return (await fetchText(url, context)).content;
      })
    );
    return importText.join("");
}
    async function fetchAndJq(fetchOption,context) {
    const { imports = [],importsContext, urls, jq: jqPath1="." } = fetchOption;
    if (importsContext) {
      context.functions=(context.functions||"")+await importFunctions(context, importsContext);
    }
    if (!urls) return {result:fetchOption,fetches:[fetchOption]};
    var importText = await importFunctions(context,imports);
    var jqPath = importText + jqPath1;
    var json = await Promise.all(
      urls.map(async (urlToGo) => {
        if (typeof urlToGo == "string") urlToGo = { url: urlToGo, method: "get" };
        // console.log("fetching ", urlToGo.url);
        if (typeof urlToGo.body == "object") {
          urlToGo.method = "post";
          urlToGo.body = JSON.stringify(urlToGo.body);
          urlToGo.headers = Object.assign({}, urlToGo.headers, {
            "Content-Type": "application/json",
          });
        }
        var json =
          urlToGo.data || (await fetchJson(urlToGo,context));
        return json;
      })
    );
    try {
    var result = await callJq(json, jqPath, context);
    } catch(e) {
      throw {origin:e,fetchOption,fetches:json,toString:()=>e.toString()};
    }
    return {fetches:json,result};
  }
  async function fetchJson(urlToGo,context) {
    try {
    return await fetchJsonOnce(urlToGo,context);
    }catch(e){
    return await fetchJsonOnce(urlToGo,context);
    }
  }
  async function fetchJsonOnce(urlToGo,context) {
    const url = getUrl(urlToGo.url,context);
    try {
    const fetched = await fetchImpl(url, Object.assign({signal: signalTimeout(context)},urlToGo));
    if (fetched.status>=300) throw new Error(fetched.statusText);
    const text = await fetched.text();
    var jsonContent;
    if (text[0]=='['||text[0]=='{') {
      jsonContent = JSON.parse(text);
    } else {
      jsonContent = text;
    }
    return jsonContent;
    } catch (e) {
      throw new Error(`baseUrl:${context.baseUrl},url:${url},status:${e}`);
    }
  }
function signalTimeout(context) {
  return AbortSignal.timeout(context.timeout||5000); 
}
  function getUrl(url,{baseUrl}={}){
    if (url.substring(0,5)=='data:') return url;
    if (baseUrl) {
      url = new URL(url, baseUrl).href;
    }
    return url.replaceAll(/\${(t|timestamp)}/g,Number(new Date()));
  }
  async function fetchText(url, context) {
    url = getUrl(url, context);

    try {
    const content = await (await fetchImpl(url,{signal: signalTimeout(context)})).text();
    return {content,url};
    } catch (e) {
      throw new Error(`baseUrl:${context.baseUrl},url:${url},status:${e}`);
    }
  }
    const filters = filter.split('>>>');
    // const filters = [filter];
    var last = {result:on};
    var results = [];
    for (var filter of filters) {
      last = await parseFetchAndJqSingle(filter,context,last.result);
      results.push(last);
    }
    var fetches = results.map(r=>r.fetches);

    if (results.length==1){
      fetches=fetches[0];
    }
    return {...last,fetches};
  async function parseFetchAndJqSingle(filter,context,on) {
    filter=(context.functions||"")+filter;
    let fetchOption = await callJq(on, filter,context);
    var fetchOptions = fetchOption;
    let isSingle = !Array.isArray(fetchOptions);
    if (isSingle) {fetchOptions=[fetchOptions];}
    var result = [];
    for (const [i, option] of fetchOptions.entries()) {
      result.push(await parseFetchAndJqSingleElement(option,context,on));
    }
    var results = result.map(r=>r.result);
    if (isSingle) results=results[0];
    var ret = result.length>0?result.pop():{fetchOptions:[{}],context};
    return Object.assign(ret,{result:results});
  }
  async function parseFetchAndJqSingleElement(fetchOption,context,on) {
    let originFetchOption = { ...fetchOption};
    var fetchOptions = [fetchOption];
      
    var finalResult;
    var fetches;
    if (fetchOption.args) {
      context.args=Object.assign({},context.args,fetchOption.args);
    }
    if (fetchOption.from) {
      var {url,content} = await fetchText(fetchOption.from, context)
      context.normalizedFroms=(context.normalizedFroms||[]);
      context.normalizedFroms.push(url);
      const {originFetchOption:options,result,fetches:fetches1} = await parseFetchAndJq(content,{...context,baseUrl:url},fetchOption.params||on);
      fetches = fetches1;
      finalResult = result;
      if (fetchOption.fromjq){
        finalResult = await callJq(finalResult, fetchOption.fromjq);
      }
      originFetchOption = { ...originFetchOption, froms: options };
    } else {
      var result = await fetchAndJq(fetchOption, context);
      fetches = result.fetches;
      finalResult = result.result;
    }
    if (fetchOption.add) {
      finalResult = await callJq([finalResult, fetchOption.add],'add');
    }
    if (fetchOption.asArg) {
      const arg = {};
      arg[fetchOption.asArg]=finalResult;
      context.args=Object.assign({},context.args,arg);
    }
    var result = finalResult;
    if (result.functions) {
//      console.warn("functions used, use importsContext instead", fetchOption);
      context.functions = result.functions;
    }
    return {result, fetchOptions, originFetchOption, fetches, context};
  }
  async function callJq(json, filter, context) {
    var flags = ['-c'];
    if (context) {
      var args = Object.assign({},context.args||{},{functions:context.functions||""});
      for (var key of Object.keys(args)) {
        flags.push("--argjson");
        flags.push(key);
        flags.push(JSON.stringify(args[key]));
      }
    }
    var result = await jq.promised.raw(JSON.stringify(json), filter, flags);
    return JSON.parse(result);
  }
  }
async function formatBadges(badges,{}={}) {
  return forceArray(badges).map(b=>{
    var array = forceArray(b);
    if (array.length==1&&typeof(array[0])=='number') array=['%f',...array];
    return sprintf.apply(this,array);
  });
}
export {parseFetchAndJq, formatBadges}
