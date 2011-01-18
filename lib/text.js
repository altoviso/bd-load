//
// text! plugin without dojo
//
// TODOC
//
define(function(require) {
    //no dojo; do it the hard way...
    var getXhr, xhr, strip;
    if (require.has("native-xhr")) {
      getXhr= function() {
        return new XMLHttpRequest();
      };
    } else {
      //TODO
    }

    xhr= function(url, load) {
      var xhr= getXhr();
      xhr.open('GET', url, true);
      xhr.onreadystatechange= function () {
        xhr.readyState==4 && load(xhr.responseText);
      };
      xhr.send(null);
    };

    strip= function(text){
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
        url= require.nameToUrl(parts[0]),
        pqn= "text!"+url,
        text= require(pqn);
      if (text) {
        loaded(parts[1] && parts[1]=="strip" ? strip(text) : text);
      } else {
        xhr(url, function(text) { 
          define(pqn, 0, text);
          loaded(parts[1] && parts[1]=="strip" ? strip(text) : text);
        });
      }
   }
  };
});
// Copyright (c) 2008-2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.
