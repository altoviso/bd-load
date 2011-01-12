// this is the bootstrap configuration for the backdraft loader (bdLoad) in node.js
(
  // configuration never sent by means of global require since require is defined by the default node loader
  {}, 

  // default configuration
  {
    injectUrl: 
      (function() {
        var fs= require("fs");
        return function(url, callback) {
          process.compile(fs.readFileSync(url, "utf8"), url);
          callback();
        };
      })(),
    traceSet:{
      "loader-define":0,
      "loader-runFactory":0,
      "loader-execModule":0,
      "loader-execModule-out":0,
      "loader-defineModule":0
    }
  },

  // has.js
  (function() {
  // if has is not provided, define a trivial implementation
    var has= function(name) { 
      return arguments.callee.hasMap[name]; 
    };
    has.hasMap= {
      "loader-node": 1,
      "dom": 0,
      "console": 1,
      "console-log-apply": 1,
      "loader-injectApi": 1,
      "loader-timeoutApi": 0,
      "loader-traceApi": 1,
      "loader-catchApi": 1,
      "loader-pageLoadApi": 0,
      "loader-errorApi": 1,
      "loader-sniffApi": 0,
      "loader-undefApi": 1,
      "loader-requirejsApi": 0,
      "loader-amdFactoryScan": 1,
      "loader-throttleCheckComplete": 0,
      "loader-publish-privates":1
    };
    return has;
  })()
);
// Copyright (c) 2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.
