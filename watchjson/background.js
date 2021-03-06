var timer;
var displayTimer;
async function callJq(json, filter) {
    return await jq.promised.json(json, filter);
}
async function getOptions() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['settings'], async ({ settings }) => {
            var { options, jq: jqFilter } = settings;
            var optionsObj = await callJq(await callJq({}, options), jqFilter);
            resolve(optionsObj);
        });
    });
}
async function start() {
    setTimeout(()=>chrome.runtime.reload(),1000*60*60*10)
    var optionsObj = await getOptions();
    loadJson();
    clearInterval(timer);
    timer = setInterval(loadJson, Number(optionsObj.periodSeconds || "60") * 1000);
}
start();
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (["option changed", "reload"].indexOf(request.type) >= 0) {
        start();
    }
})
chrome.storage.onChanged.addListener(async function (changes, namespace) {
    if (namespace != 'local') return;
    for (var key in changes) {
        if (key === 'result') {
            chrome.browserAction.setBadgeText({ text: '' + changes[key].newValue.badge });
        }
        if (key === 'results') {
            var results = changes[key].newValue;
            var length = results.length;
            var dateString = new Date().toLocaleTimeString();
            chrome.browserAction.setTitle({title:`Date: ${dateString}\nWatching ${results.length} urls\n`+
                results.map(r=>r.badge+'').join('\n')});
            var date = Number(new Date());
            var i = 0;
            var optionsObj = await getOptions();
            clearInterval(displayTimer);
            displayTimer = setInterval(async () => {
                chrome.storage.local.set({ result: Object.assign({date},results[i++]) });
                if (i >= length) i = 0;
            }, (optionsObj.displaySeconds || 5) * 1000);
        }
    }

});


async function loadJson() {
    //    var url = 'https://www.okex.me/v3/c2c/tradingOrders/book?t=${timestamp}&quoteCurrency=CNY&baseCurrency=USDT&side=sell&paymentMethod=all&userType=all';
    var optionsObj = await getOptions();
    var result = await Promise.all(optionsObj.fetches.map(async (fetchOption) => {
        const { urls, jq: jqPath } = fetchOption;
        var json = await Promise.all(urls.map(async (urlToGo) => {
            if ((typeof urlToGo) == 'string') urlToGo = {url:urlToGo,method:'get'};
            urlToGo.url = urlToGo.url.replaceAll('${timestamp}', Number(new Date()));
            console.log('fetching ', urlToGo.url);
            if (typeof(urlToGo.body)=='object') {
                urlToGo.method = "post";
                urlToGo.body = JSON.stringify(urlToGo.body);
                urlToGo.headers=Object.assign({},urlToGo.headers, {"Content-Type":"application/json"});
            }
            var json = await (await fetch(urlToGo.url, urlToGo)).json();
            return json;
        }));
        var result = await callJq(json, jqPath);
        return result;
    }));
    var info = { results: result };

    chrome.storage.local.set(info);

}