async function parseFetchAndJq(filter1,context={},on={}) {
    var filter = filter1;
    const jq=context.jq;
    async function fetchAndJq(fetchOption,context) {
    const { imports = [], urls, jq: jqPath1="." } = fetchOption;
    if (!urls) return {result:fetchOption,fetches:[fetchOption]};
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
    const fetched = await fetch(getUrl(urlToGo.url,context), urlToGo);
    if (fetched.status>=300) throw new Error(fetched.statusText);
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
    const filters = filter.split('>>>');
    // const filters = [filter];
    var last = {result:on};
    var results = [];
    for (var filter of filters) {
      last = await parseFetchAndJqSingle(filter,context,last.result);
      results.push(last);
    }
    var fetches = results.map(r=>r.fetches);

    var normalizedFroms = results.reduce((s,r)=>{
      return s.concat(r.originFetchOption.normalizedFroms);
    },[]);
    if (results.length==1){
      fetches=fetches[0];
    }
    last.originFetchOption.normalizedFroms=normalizedFroms;
    return {...last,fetches,normalizedFroms};
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
    var ret = result.pop();
    return Object.assign(ret,{result:results});
  }
  async function parseFetchAndJqSingleElement(fetchOption,context,on) {
    let originFetchOption = { ...fetchOption,normalizedFroms:[] };
    var fetchOptions = [fetchOption];
      
    var finalResult;
    var fetches;
    if (fetchOption.args) {
      context.args=fetchOption.args;
    }
    if (fetchOption.from) {
      var {url,content} = await fetchText(fetchOption.from, context)
      const {originFetchOption:options,result,fetches:fetches1} = await parseFetchAndJq(content,{...context,baseUrl:url},fetchOption.params||on);
      fetches = fetches1;
      originFetchOption.normalizedFroms=[url];
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
    var result = finalResult;
    if (result.functions) {
      context.functions = result.functions;
    }
    return {result, fetchOptions, originFetchOption, fetches};
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

    return JSON.parse(await jq.promised.raw(JSON.stringify(json), filter, flags));
  }
  }
function formatBadges(badges,{vsprintf,sprintf,forceArray}) {
  return forceArray(badges).map(b=>{
    var array = forceArray(b);
    if (array.length==1&&typeof(array[0])=='number') array=['%f',...array];
    return sprintf.apply(this,array);
  });
}
export {parseFetchAndJq, formatBadges}
