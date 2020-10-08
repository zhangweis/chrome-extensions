var timer;
var displayTimer;

function start() {
    chrome.storage.sync.get(['settings'], async ({ settings }) => {
        var { options, jq: jqFilter } = settings;
        var optionsObj = jq.json(jq.json({}, options), jqFilter);
        loadJson();
        clearInterval(timer);
        timer = setInterval(loadJson, Number(optionsObj.periodSeconds || "60") * 1000);
    });
}
start();
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (["option changed", "reload"].indexOf(request.type) >= 0) {
        start();
    }
})
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace != 'local') return;
    for (var key in changes) {
        if (key === 'result') {
            chrome.browserAction.setBadgeText({ text: '' + changes[key].newValue.badge });
        }
        if (key === 'results') {
            var results = changes[key].newValue;
            var length = results.length;
            var i = 0;
            chrome.storage.sync.get(['settings'], async ({ settings }) => {
                var { options, jq: jqFilter } = settings;
                var optionsObj = jq.json(jq.json({}, options), jqFilter);
                clearInterval(displayTimer);
                displayTimer = setInterval(async () => {
                    chrome.storage.local.set({ result: results[i++] });
                    if (i >= length) i = 0;
                }, (optionsObj.displaySeconds || 5) * 1000);
            });
        }
    }

});


async function loadJson() {
    //    var url = 'https://www.okex.me/v3/c2c/tradingOrders/book?t=${timestamp}&quoteCurrency=CNY&baseCurrency=USDT&side=sell&paymentMethod=all&userType=all';
    chrome.storage.sync.get(['settings'], async ({ settings }) => {
        var { options, jq: jqFilter } = settings;
        var optionsObj = jq.json(jq.json({}, options), jqFilter);
        var result = await Promise.all(optionsObj.fetches.map(async (fetchOption) => {
            const { urls, jq: jqPath } = fetchOption;
            var json = await Promise.all(urls.map(async (urlToGo) => {
                urlToGo = urlToGo.replaceAll('${timestamp}', Number(new Date()));
                console.log('fetching ' + urlToGo);
                var json = await (await fetch(urlToGo)).json();
                return json;
            }));
            var result = jq.json(json, jqPath);
            return result;
        }));
        var info = { results: result };

        chrome.storage.local.set(info);

    })
}