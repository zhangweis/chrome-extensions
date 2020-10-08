# chrome-extensions
- watchjson

 Periodically pull from urls and use jq to filter and show results.
 
 Use options to set urls (JSON Array where ${timestamp} is current timestamp). 
 
 Option jq which takes from urls fetch results as an array and results in {badge, content}, and badge will be shown in extension's badge and content will be shown as html in popup by https://www.npmjs.com/package/tableify.
 
 Option period controls period in seconds.

 Below is my example of watching otc price of okex.

 URL:

["https://www.okex.me/v3/c2c/tradingOrders/book?t=${timestamp}&quoteCurrency=CNY&baseCurrency=USDT&side=sell&paymentMethod=all&userType=all"]

jq({badge,content}):

.[0].data.sell|map(select(.quoteMinAmountPerOrder|tonumber<10000))|map({price, amount:.quoteMinAmountPerOrder,name:.creator.nickName})|{badge:.[0].price,content:.}

Period Seconds:

60
