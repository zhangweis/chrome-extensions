import jq from "jq-web";
async function fetchUrl(from) {
  var url = from;
  if (Array.isArray(url)) url = url[0];
    return await fetch(
      url.replaceAll(/\${timestamp}/g, Number(new Date()))
    );
  }
  
  async function fetchAndJq(fetchOption) {
    const { imports = [], urls, jq: jqPath1="." } = fetchOption;
    if (!urls) return fetchOption;
    var importText = await Promise.all(
      imports.map(async (url) => {
        return await (await fetch(url)).text();
      })
    );
    var jqPath = importText.join("") + jqPath1;
    var json = await Promise.all(
      urls.map(async (urlToGo) => {
        if (typeof urlToGo == "string") urlToGo = { url: urlToGo, method: "get" };
        urlToGo.url = (urlToGo.url || "").replaceAll(
          "${timestamp}",
          Number(new Date())
        );
        // console.log("fetching ", urlToGo.url);
        if (typeof urlToGo.body == "object") {
          urlToGo.method = "post";
          urlToGo.body = JSON.stringify(urlToGo.body);
          urlToGo.headers = Object.assign({}, urlToGo.headers, {
            "Content-Type": "application/json",
          });
        }
        var json =
          urlToGo.data || (await (await fetch(urlToGo.url, urlToGo)).json());
        return json;
      })
    );
    try {
    var result = await callJq(json, jqPath);
    } catch(e) {
      throw {origin:e,fetches:json,toString:()=>e.toString()};
    }
    return {fetches:json,result};
  }
  async function fetchText(url, {baseUrl}) {
    if (baseUrl) {
      url = new URL(url, baseUrl).href;
    }

    const content = await (await fetchUrl(url)).text();
    return {content,url};
  }
  async function parseAndFetch(filter,on={},context={}) {
    var options = await callJq(on, filter);
    if (options.from) {
      const {content,url} = await fetchText(options.from,{});
      const ret = await parseAndFetch(content,on,{baseUrl:url});
      return ret;
    }
    return {options, ...(await fetchAndJq(JSON.parse(JSON.stringify(options))))};
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
    let fetchOption = await callJq(on, filter);
    let originFetchOption = { ...fetchOption };
    var fetchOptions = [fetchOption];
      
    var configs = await Promise.all((fetchOption.config||[]).map(async (from)=>{
      var option = await callJq(
            {},
              (await fetchText(from, context)).content
          );
          
        return (await fetchAndJq(option)).result;
    }));
    var configResults = await callJq(configs,fetchOption.configJq||'.');
    var finalResult;
    var fetches;
    if (fetchOption.from) {
      var {url,content} = await fetchText(fetchOption.from, context)
      const {originFetchOption:options,result,fetches:fetches1} = await parseFetchAndJq(content,{...context,baseUrl:url},configResults);
      fetches = fetches1;
      finalResult = result;
      originFetchOption = { ...originFetchOption, froms: options };
    } else {
      // const {options,result} = await parseAndFetch(configResults, JSON.stringify(fetchOption));
      // finalResult = result;
      var result = await fetchAndJq(fetchOption);
      fetches = result.fetches;
      finalResult = result.result;
    }
    var result = finalResult;
    return {result, fetchOptions, originFetchOption, fetches};
  }
  async function callJq(json, filter) {
    return await jq.promised.json(json, filter);
  }
  
export {fetchUrl, fetchAndJq, callJq,parseFetchAndJq, parseAndFetch}