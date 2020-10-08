# chrome-extensions
- watchjson

 Periodically pull from urls and use jq to filter and show results.
 
 Options is a JSON object and filtered by jq filter.
 
 This is to support multiple options. You can store multiple options and use jq filter to select which one to use.

 The result object {fetches, periodSeconds, displaySeconds} fetches field is an array which contains below fields:

 urls: JSON Array where ${timestamp} will be replaced with current timestamp. 
 
 jq: which takes from urls fetch results as an array and results in {badge, content}, and badge will be shown in extension's badge and content will be shown as html in popup by https://www.npmjs.com/package/tableify.

--
 periodSeconds: controls period in seconds.
 displaySeconds: controls display period in seconds. This is to support multiple results.

 Below is my example of watching otc price and funding_time (currently selected) of okex.

Options(urls, jq, periodSeconds): 
{
"fetches":
[{
"urls":
["https://www.okex.me/v3/c2c/tradingOrders/book?t=${timestamp}&quoteCurrency=CNY&baseCurrency=USDT&side=sell&paymentMethod=all&userType=all"]
,"jq":
".[0].data.sell|map(select(.quoteMinAmountPerOrder|tonumber<10000))|map({price, amount:.quoteMinAmountPerOrder,name:.creator.nickName})|{badge:.[0].price,content:.}"
},
{
"urls":
["https://www.okex.com/api/swap/v3/instruments/BSV-USD-SWAP/funding_time"]
,"jq":
".[0]|{badge:(.estimated_rate|tonumber*10000|tostring[:4]),content:.}"
}]
,"periodSeconds":
60
,"displaySeconds":
10
}

jq(filter which option to use):
.
