//
// text! plugin without dojo
//
// TODOC
//
define(function(require) {
    //no dojo; do it the hard way...
    var getXhr, xhr;
    if (/*require.has("native-xhr")*/true) {
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

  return {
    load: function(require, id, loaded) {
      xhr(require.toUrl(id), function(text) { loaded(text); });
   }
  };
});
// Copyright (c) 2008-2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.
