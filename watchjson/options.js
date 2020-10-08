// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
let optionsText = document.getElementById('options');
let jqText = document.getElementById('jq');
chrome.storage.sync.get(['settings'],function({settings}){
  optionsText.value = settings.options||JSON.stringify({urls:[],jq:'.[0]|{badge:"name",content:.}',periodSeconds:60});
  jqText.value = settings.jq||".";
});
document.getElementById('saveButton').addEventListener('click', function(e) {
  chrome.storage.sync.set({settings:{options:optionsText.value, jq: jqText.value}},()=>{
    chrome.runtime.sendMessage({type: "option changed"});
  });
});
