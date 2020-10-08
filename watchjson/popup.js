// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';


let infoDiv = document.getElementById('info');
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace != 'local') return;
  for(var key in changes) {
    if(key === 'result') {
      refresh();
    }
  }
});
function refresh() {
chrome.storage.local.get(["result"], function(info) {
  infoDiv.innerHTML = tableify(info.result.content);
});
}
refresh();
document.getElementById('reloadButton').addEventListener('click', function(e) {
  chrome.runtime.sendMessage({type: "reload"});
});