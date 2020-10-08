var timer;
function start() {
  chrome.storage.sync.get(['settings'], async ({settings})=>{
    var {options,jq:jqFilter} = settings;
    const optionsObj = jq.json(JSON.parse(options), jqFilter);
    loadJson();
timer = setInterval(loadJson, Number(optionsObj.periodSeconds)*1000);
    });
}
start();
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if(["option changed","reload"].indexOf(request.type)>=0) {
            clearInterval(timer);
            start();
        }
    })
    
async function loadJson() {
//    var url = 'https://www.okex.me/v3/c2c/tradingOrders/book?t=${timestamp}&quoteCurrency=CNY&baseCurrency=USDT&side=sell&paymentMethod=all&userType=all';
    chrome.storage.sync.get(['settings'], async ({settings})=>{
        var {options,jq:jqFilter} = settings;
        var optionsObj = jq.json(JSON.parse(options), jqFilter);
        const {urls, jq:jqPath} = optionsObj;
        var json = await Promise.all(urls.map(async (urlToGo)=> {
            urlToGo = urlToGo.replaceAll('${timestamp}',Number(new Date()));
        console.log('fetching '+urlToGo);
            var json = await (await fetch(urlToGo)).json();
            return json;
        }));
var result = jq.json(json, jqPath);
        var info = {result: result};
        
    chrome.storage.local.set(info);
    chrome.browserAction.setBadgeText({text:''+info.result.badge});

    })
}