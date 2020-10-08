# chrome-extensions
- watchjson
 Periodically pull from urls and use jq to filter and show results.
 
 Use options to set urls (JSON Array where ${timestamp} is current timestamp). 
 
 Option jq which results in {badge, content}, and badge will be shown in extension's badge and content will be shown as html in popup by https://www.npmjs.com/package/tableify.
 
 Option period controls period in seconds.