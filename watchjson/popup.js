// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';


let infoDiv = document.getElementById('info');
let autoRefreshCheck = document.getElementById('autoRefresh');
let dateDiv = document.getElementById('date');
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace != 'local') return;
  for(var key in changes) {
    if(key === 'result' && autoRefreshCheck.checked) {
      refresh();
    }
  }
});
function refresh() {
chrome.storage.local.get(["result"], function(info) {
  const {result} = info;
  dateDiv.innerText = new Date(result.date).toISOString();
  infoDiv.innerHTML = tableify(result.content);
});
}
refresh();
document.getElementById('reloadButton').addEventListener('click', function(e) {
  chrome.runtime.sendMessage({type: "reload"});
});