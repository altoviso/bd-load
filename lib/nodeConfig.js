// this is the bootstrap configuration for the backdraft loader (bdLoad) in node.js
(
  // configuration never sent by means of global require
  {}, 

  // default configuration
  {
    traceSet: {}, // no tracing turned on
    nodeInject: 
      (function() {
        var fs= require("fs");
        return function(url, callback) {
          process.compile(fs.readFileSync(url, "utf8"), url);
          callback();
        };
      })()
  },

  // has switches for node.js
  {
    "loader-node": 1
    ,"dom": 0
    ,"dom-addEventListener": 0
    ,"console": 1
    ,"console-log-apply": 1
    ,"function-toString": 1
    ,"loader-injectApi": 1
    ,"loader-timeoutApi": 0
    ,"loader-traceApi": 1
    ,"loader-buildToolsApi": 0
    ,"loader-catchApi": 1
    ,"loader-pageLoadApi": 0
    ,"loader-errorApi": 1
    ,"loader-sniffApi": 0
    ,"loader-undefApi": 1
    ,"loader-libApi": 1
    ,"loader-requirejsApi": 0
    ,"loader-pushHas": 0
    ,"loader-amdFactoryScan": 1
    ,"loader-throttleCheckComplete": 0
  },

  // use bdLoad's has.js
  0
);
// Copyright (c) 2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.
