import jq from "jq-web";
 
  async function fetchAndJq(fetchOption,context) {
    const { imports = [], urls, jq: jqPath1="." } = fetchOption;
    if (!urls) return fetchOption;
    var importText = await Promise.all(
      imports.map(async (url) => {
        return (await fetchText(url, context)).content;
      })
    );
    var jqPath = importText.join("") + jqPath1;
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
    var result = await callJq(json, jqPath);
    } catch(e) {
      throw {origin:e,fetchOption,fetches:json,toString:()=>e.toString()};
    }
    return {fetches:json,result};
  }
  async function fetchJson(urlToGo,context) {
    const fetched = await fetch(getUrl(urlToGo.url,context), urlToGo);
    const text = await fetched.text();
    var jsonContent;
    if (text[0]=='['||text[0]=='{') {
      jsonContent = JSON.parse(text);
    } else {
      jsonContent = text;
    }
    return jsonContent;
  }
  function getUrl(url,{baseUrl}={}){
    if (baseUrl) {
      url = new URL(url, baseUrl).href;
    }
    return url.replaceAll(/\${(t|timestamp)}/g,Number(new Date()));
  }
  async function fetchText(url, context) {
    url = getUrl(url, context);

    const content = await (await fetch(url)).text();
    return {content,url};
  }
  async function parseAndFetch(filter,on={},context={}) {
    return await parseFetchAndJq(filter,on,context);
  }
  async function parseFetchAndJq(filter,context={},on={}) {
    const filters = filter.split('>>>');
    // const filters = [filter];
    var last = {result:on};
    for (var filter of filters) {
      last = await parseFetchAndJqSingle(filter,context,last.result);
    }
    return last;
  }
  async function parseFetchAndJqSingle(filter,context,on) {
    filter=(on.functions||"")+filter;
    let fetchOption = await callJq(on, filter);
    let originFetchOption = { ...fetchOption };
    var fetchOptions = [fetchOption];
      
    var finalResult;
    var fetches;
    if (fetchOption.from) {
      var {url,content} = await fetchText(fetchOption.from, context)
      const {originFetchOption:options,result,fetches:fetches1} = await parseFetchAndJq(content,{...context,baseUrl:url});
      fetches = fetches1;
      finalResult = result;
      if (fetchOption.fromjq){
        finalResult = await callJq(finalResult, fetchOption.fromjq);
      }
      if (fetchOption.add) {
        finalResult = Object.assign(finalResult, fetchOption.add);
      }
      originFetchOption = { ...originFetchOption, froms: options };
    } else {
      var result = await fetchAndJq(fetchOption, context);
      fetches = result.fetches;
      finalResult = result.result;
    }
    var result = finalResult;
    return {result, fetchOptions, originFetchOption, fetches};
  }
  async function callJq(json, filter) {
    return await jq.promised.json(json, filter);
  }
  
export {parseFetchAndJq}
