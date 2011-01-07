//
// i18n! plugin; assumes locale set in require
//
// TODOC
//
define(["require"], function(require) {
  var
    nlsRe=
      // regexp for reconstructing the master bundle name from parts of the regexp match
      // nlsRe.exec("foo/bar/baz/nls/en-ca/foo") gives:
      // ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
      // nlsRe.exec("foo/bar/baz/nls/foo") gives:
      // ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
      // so, if match[5] is blank, it means this is the top bundle definition.
      // courtesy of James Burke (https://github.com/jrburke/requirejs)
      /(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/,
    
    getAvailableLocales= function(
      root, 
      locale,
      bundlePath,
      bundleName
    ) {
      for (var result= [bundlePath + bundleName], localeParts= locale.split("-"), current= 0, i= 0; i<localeParts.length; i++) {
        current= (current ? current + "-" : "") + localeParts[i];
        if (root[current]) {
          result.push(bundlePath + current + "/" + bundleName);
        }
      }
      return result;
    };

  return {
    load: function(require, id, loaded) {
      var
        match= nlsRe.exec(id),
        bundlePath= match[1],
        bundleName= match[5] || match[4],
        bundleNameAndPath= bundlePath + bundleName,
        locale= (match[5] && match[4]) || require.locale || "en-us";

      // get the root bundle which instructs which other bundles are required to contruct the localized bundle
      require([bundleNameAndPath], function(root) {
        require(getAvailableLocales(root, locale, bundlePath, bundleName), function() {
          var 
            args= arguments,
            result= require.mix({}, args[0].root),
            i= 1; 
          for (; i<args.length; i++) {
            require.mix(result, arguments[i]);
          }
          loaded(result);
        });
      });
    }
  };
});
// Copyright (c) 2008-2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.
