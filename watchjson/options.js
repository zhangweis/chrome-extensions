// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
let page = document.getElementById('buttonDiv');
let urlText = document.getElementById('url');
let jqText = document.getElementById('jq');
let periodSecondsText = document.getElementById('periodSeconds');
chrome.storage.sync.get(['settings'],function({settings}){
  jqText.value = settings.jq;
  urlText.value = settings.url;
  periodSecondsText.value = settings.periodSeconds||60;
});
document.getElementById('saveButton').addEventListener('click', function(e) {
  try {
    if (!Array.isArray(JSON.parse(urlText.value))) throw 'URL must be array';
  } catch (e) {
    alert(e.toString());
    return;
  }
  chrome.storage.sync.set({settings:{url:urlText.value, jq: jqText.value, periodSeconds:periodSecondsText.value}},()=>{
    chrome.runtime.sendMessage({type: "option changed"});
  });
});
