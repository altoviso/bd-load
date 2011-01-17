// this is the entry point to load the backdraft loader (bdLoad) in node.js
exports.boot= function(userConfig) {
  if (global.define) {
    console.log("global define already defined; did you try to load or boot multiple AMD loaders?");
    return 0;
  }

  var
    fs= require("fs"),
    bdLoadFilename= __dirname + "/require.js",
    requireSource= fs.readFileSync(bdLoadFilename, "ascii"),

    defaultConfig= {
      injectUrl: function(url, callback) {
        try {
          process.compile(fs.readFileSync(url, "utf8"), url);
          callback();
        } catch(e) {
          console.log("bdLoad: failed to load resource (" + url + ")");
          console.log(e);
        }
      },
  
      traceSet:{
        "loader-define":0,
        "loader-runFactory":0,
        "loader-execModule":0,
        "loader-execModule-out":0,
        "loader-defineModule":0
      },
  
      cache: {
        // text! plugin in node
        "*text": function() {
          define([], function(require) {
            var strip= function(text){
              //note: this function courtesy of James Burke (https://github.com/jrburke/requirejs)
              //Strips <?xml ...?> declarations so that external SVG and XML
              //documents can be added to a document without worry. Also, if the string
              //is an HTML document, only the part inside the body tag is returned.
              if (text) {
                text= text.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, "");
                var matches= text.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
                if (matches) {
                  text= matches[1];
                }
              } else {
                text = "";
              }
              return text;
            };

            return {
              load: function(require, id, loaded) {
                var 
                  parts= id.split("!"),
                  text= fs.readFileSync(require.nameToUrl(parts[0]), "utf8");
                if (parts[1] && parts[1]=="strip"){
                  text= strip(text);
                }
                loaded(text); 
              }
             };
          });
        }
      }
    },

    // bdLoads naive has.js
    has= (function() {
      var has= function(name) { 
        return has.hasMap[name]; 
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
    })();

  // since we're using node's process.compile for nice stack traces, we lose all the local variables; therefore, pass the configuration in global.define
  global.define= {
    userConfig: userConfig || {},
    defaultConfig: defaultConfig,
    has:has
  };
  process.compile(requireSource.replace(/\/\/\sbegin\sdefault\sbootstrap[\w\W]+$/, "(define.userConfig, define.defaultConfig, define.has)"), bdLoadFilename);

  // bdLoad stuffs the require function into define.req so that this bootstrap can pull, publish, and delete
  var result= global.define.require;
  delete global.define.require;
  return {require:result};
};
// Copyright (c) 2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.
