(function(
  userConfig, 
  defaultConfig, 
  hasMap, 
  has
) {
  //
  // This function defines the backdraft JavaScript script-inject loader--an AMD-compliant 
  // (http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition), requirejs-compatible 
  // (http://requirejs.org/) loader.
  // 
  // For a complete tutorial on the use of this loader, see xxx
  // The loader may be run-time configured with several configuration variables; see xxx.
  // The loader may be run-time and/or build-time configured with has.js switches; see xxx.
  // 
  // In addition to AMD-compliance and requirejs-compatibility, the loader has the following
  // features:
  // 
  //  * It is highly configurable. The has.js interface is used for both run-time and build-time
  //    configuration. The default implementation assumes a full feature set for the browser. 
  //    However, this can be changed quite dramatically by providing a has.js implementation
  //    and configuration prior to entry. For example, by providing alternate inject functions 
  //    and a has.js configuration that detects a non-brow  ser environment (e.g., V8), the loader
  //    is made available to a wide variety of non-browser environments.
  // 
  //  * The features mentioned above are useful in constructing highly optimized release
  //    packaging. For example, it is possible to remove all dynamic script-injecting and receiving
  //    so that an entire application can be bundled into a single file.
  // 
  //  * Generalized error detection and reporting, configurable tracing, and descriptive object 
  //    state variables are included to help find and solve programming errors, with special
  //    emphasis on loading errors.
  // 
  // Since this machinery implements a loader, it does not have the luxury of using a load system
  // to divide the implementation among several resources. This results in an unpleasantly long file.
  // Here is a roadmap of the contents:
  // 
  //   1. Optional, trivial, naive has.js if real has.js was not provided
  //   2. Small library for use implementing the loader
  //   3. Once-only protection.
  //   4. Define global AMD define and require functions.
  //   5. Define configuration machinery and configure the loader
  //   6. Core loader machinery that instantiates modules as given by factories and dependencies.
  //   7. Machinery to request, receive, and process module definions.
  //   8. Browser-based machinery--for use when the loader is used in a browser
  //   9  DOM content loaded detection machinery
  //  10. Trace, error detection, and miscellaneous other optional machinery.
  // 
  // Language and Acronyms and Idioms
  // 
  // moduleId: a CJS module identifier, (used for public APIs)
  // mid: moduleId (used internally)
  // packageId: a package identifier (used for public APIs)
  // pid: packageId (used internally); the implied system or default package has pid===""
  // context-qualified name: a mid qualified by the pid of which the module is a member; result is the string pid + "*" + mid
  // cqn: context-qualified name
  // pack: package is used internally to reference a package object (since lame JavaScript has reserved words including "package")
  // The integer constant 1 is used in place of true and 0 in place of false.
 
  // if has is not provided, define a trivial implementation
  if (!has) {
    has= function(name) { 
      return hasMap[name]; 
    };
  }

  var
    // define a minimal library to help build the loader

    noop= function() {
    },

    isEmpty= function(it) {
      for (var p in it) return false;
      return true;
    },
    
    isFunction= function(it) {
      return (typeof it=="function");
    },
    
    isString= function(it) {
      return (typeof it=="string");
    },

    isArray= function(it) {
      return (it instanceof Array);
    },

    forEach= function(vector, callback) {
      for (var i= 0; vector && i<vector.length;) callback(vector[i++]);
    },

    setIns= function(set, name) {
      set[name]= 1;
    },

    setDel= function(set, name) {
      delete set[name];
    },

    mix= function(dest, src) {
      for (var p in src) dest[p]= src[p];
      return dest;
    },

    uidSeed= 
      1,

    uid= 
      function() {
        ///
        // Returns a unique indentifier (within the lifetime of the document) of the form /_d+/.
        return "_" + uidSeed++; 
      },

    // the loader will use these like symbols
    requested= {},
    arrived= {},
    nonmodule= {},

    //bring in the backdraft documentation generating machinery (stripped during builds)
    bd= {
      docGen: 
        // Documentation generator hook; facilitates generating documentation for named entities that have 
        // no place in normal JavaScript code such as keyword arguments, overload function signatures, and types.
        // 
        // bd.docGen has no actual run-time function; if called it simply execute a no-op. All bd.doc
        // calls are removed by the Backdraft build utility (and/or other intelligent compilers) for
        // release versions of the code.  See the ALTOVISO js-proc manual for further details.
        noop
    };

  // the loader can be defined exactly once
  if (isFunction(userConfig)) {
    return;
  }

  //
  // Global Loader API
  // 
  // define and require make up the global, public API
  //
  var 
    injectDependencies= function(module) {
      forEach(module.deps, injectModule);
    },
  
    contextRequire= function(a1, a2, a3, referenceModule, contextRequire) {
      if (isString(a1)) {
        // signature is (moduleId)
        var module= getModule(a1, referenceModule, 1);
        return module && module.result;
      }
      if (!isArray(a1)) {
        // a1 is a configuration
        config(a1);
        // juggle args; (a2, a3) may be (dependencies, callback)
        a1= a2;
        a2= a3;
      }
      if (isArray(a1)) {
        // signature is (requestList [,callback])
        injectDependencies(defineModule(getModule(uid(), referenceModule), a1, a2 || noop));
        checkComplete();
      }
      return contextRequire;
    },

    createRequire= function(module) {
      var result= module.require;
      if (!result) {
        result= function(a1, a2, a3) {
          return contextRequire(a1, a2, a3, module, result);
        };
        result.toUrl= function(name) {
          return nameToUrl(name, module, 1);
        };
        if (has("loader-undefApi")) {
          result.undef= function(moduleId) {
           // In order to reload a module, it must be undefined (this routine) and then re-requested.
           // This is useful for testing frameworks (at least).
             var 
               module= getModule(moduleId, module, 1),
               cqn= module.cqn;
             setDel(modules, cqn);
             setDel(waiting, cqn);
             setDel(injectedUrls, module.url);
          };
        }
        if (has("loader-requirejsApi")) {
          result.nameToUrl= result.toUrl;
        }
        module.require= mix(result, req);
      }
      return result;
    },

    def= function(
      mid,          //(commonjs.moduleId, optional) list of modules to be loaded before running factory
      dependencies, //(array of commonjs.moduleId, optional)
      factory       //(any)
    ) {
      ///
      // Advises the loader of a module factory. //Implements http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition.
      ///
      //note
      // CommonJS factory scan courtesy of James Burke at http://requirejs.org
  
      var 
        arity= arguments.length,
        args= 0,
        defaultDeps= ["require", "exports", "module"];
      if (has("loader-amdFactoryScan")) {
        if (arity==1) {
          dependencies= [];
          mid.toString()
            .replace(/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg, "")
            .replace(/require\(["']([\w\!\-_\.\/]+)["']\)/g, function (match, dep) {
              dependencies.push(dep);
            });
          args= [0, defaultDeps.concat(dependencies), mid];
        }
      }
      if (!args) {
        if (/^\*/.test(mid)) {
          if (mid=="*config") {
            config(dependencies);
          } else if (mid=="*load") {
            req(dependencies, factory);
          }
          return;
        }
        if (arity==3 && isString(mid) && mid.charAt(0)!="." && dependencies==0) {
          // immediate signature
          execModule(defineModule(getModule(mid), [], factory, 0));
        }
        args= arity==1 ? [0, defaultDeps, mid] :
                         (arity==2 ? (isArray(mid) ? [0, mid, dependencies] : [mid, defaultDeps, dependencies]) :
                                                     [mid, dependencies, factory]);
      }
      if (has("loader-traceApi")) {
        req.trace("loader-define", args.slice(0, 2));
      }
      defQ.push(args);
    },
  
    req= function(
      config,       //(object, optional) hash of configuration properties
      dependencies, //(array of commonjs.moduleId, optional) list of modules to be loaded before applying callback 
      callback      //(function, optional) lamda expression to apply to module values implied by dependencies
    ) {
      ///
      // Loads the modules given by dependencies, and then applies callback (if any) to the values of those modules. //The
      // values of the modules given in dependencies are passed as arguments.
      //
      // If config is provided, then adjust the loaders configuration as given by config hash before proceeding. 
      //
      //note
      // `require([], 0)` will cause the loader to check to see if it can execute more modules; this can be useful for build systems.
      bd.docGen("overload",
        function(
          moduleId //(commonjs.moduleId) the module identifier of which value to return
        ) {
          /// 
          // Return the module value for the module implied by `moduleId`. //If the implied
          // module has not been defined, then `undefined` is returned.
        }
      );
      return contextRequire(config, dependencies, callback, 0, req);
    };

  if (has("loader-node")) {
    global.define= def;
  } else {
    define= def;
    //require= req;
  }

  // now that we've defined the global require variable, we can start hanging properties off it it
  var
    urlMap=
      // list of functions from URL(string) to URL(string)
      [],

    paths=
      // requirejs paths
      {},

    pathsMapProg=
      // list of (from-path, to-path, regex, length) derived from paths;
      // a "program" to apply paths; see computeMapProg
      [],

    packages=
      // a map from packageId to package configuration object
      {},

    packageMap=
      // map from package name to local-installed package name
      {},

    packageMapProg=
      // list of (from-package, to-package, regex, length) derived from packageMap;
      // a "program" to apply paths; see computeMapProg
      [];

  // configure require
  var
    computeMapProg= function(map) {
      // This routine takes a map target-prefix(string)-->replacement(string) into a vector 
      // of quads (target-prefix, replacement, regex-for-target-prefix, length-of-target-prefix)
      // 
      // The loader contains processes that map one string prefix to another. These
      // are encountered when applying the requirejs paths configuration and when mapping
      // package names. We can make the mapping and any replacement easier and faster by
      // replacing the map with a vector of quads and then using this structure in simple machine.
      var p, i, item, mapProg= [];
      for (p in map) mapProg.push([p, map[p]]);
      mapProg.sort(function(lhs, rhs) { return rhs[0].length - lhs[0].length; });
      for (i= 0; i<mapProg.length;) {
        item= mapProg[i++];
        item[2]= new RegExp("^" + item[0] + "(\/|$)");
        item[3]= item[0].length;
      }
      return mapProg;
    },

    fixupPackageInfo= function(packageInfo, baseUrl) {
      // calculate the precise (name, baseUrl, lib, main, mappings) for a package
      baseUrl= baseUrl || "";
      packageInfo= mix({lib:"lib", main:"main", urlMap:[]}, (isString(packageInfo) ? {name:packageInfo} : packageInfo));
      packageInfo.location= baseUrl + (packageInfo.location ? packageInfo.location : packageInfo.name);
      packageInfo.mapProg= computeMapProg(packageInfo.packageMap);
      var name= packageInfo.name;

      // now that we've got a fully-resolved package object, push it into the configuration
      packages[name]= packageInfo;
      packageMap[name]= name;
    },

    config= function(config) {
      // mix config into require, but don't trash the urlMap
      var p, i, configUrlMap;

      // push config into require, but don't step on certain properties that are expected and
      // require special processing; notice that client code can use config to hold client
      // configuration switches that have nothing to do with require
      for (p in config) if (!/urlMap|paths|packages|packageMap|packagePaths|hasValues/.test(p)) {
        req[p]= config[p];
      };

      // interpret a urlMap as items that should be added to the end of the existing map
      for (configUrlMap= config.urlMap, i= 0; configUrlMap && i<configUrlMap.length; i++) {
        urlMap.push(configUrlMap[i]);
      }

      // push in any paths and recompute the internal pathmap
      pathsMapProg= computeMapProg(mix(paths, config.paths));

      // for each package found in any packages config item, augment the packages map owned by the loader
      forEach(config.packages, fixupPackageInfo);

      // for each packagePath found in any packagePaths config item, augment the packages map owned by the loader
      for (baseUrl in config.packagePaths) {
        forEach(config.packagePaths[baseUrl], function(packageInfo) {
          fixupPackageInfo(packageInfo, baseUrl + "/");
        });
      }

      // mix any packageMap config item and recompute the internal packageMapProg
      packageMapProg= computeMapProg(mix(packageMap, config.packageMap));

      // push in any new has values
      for (p in config.hasValues) {
        hasMap[p]= config.hasValues[p];
      }

      config.deps && req(config.deps, config.cb);
    };
  // configure require; let client-set switches override defaults
  req.has= has;
  mix(req, defaultConfig);
  config(userConfig);

  if (has("loader-traceApi")) {
    // these make debugging nice
    var
      symbols= 
        {},

      symbol= function(name) {
        return symbols[name] || (symbols[name]= {value:name});    
      };

    requested =symbol("requested");
    arrived   =symbol("arrived");
    nonmodule =symbol("not-a-module");
  }

  // at this point req===require is configured; define the loader
  var
    modules=
      // A hash:(cqn) --> (module-object). module objects are simple JavaScript objects with the
      // following properties:
      // 
      //   pid: the package identifier to which the module belongs; "" indicates the system or default package
      //   id: the module identifier without the package identifier
      //   cqn: the full context-qualified name
      //   url: the URL from which the module was retrieved
      //   pack: the package object of the package to which the module belongs
      //   path: the full module name (package + path) resolved with respect to the loader (i.e., mappings have been applied)
      //   executed: 1 <==> the factory has been executed
      //   deps: the dependency vector for this module (vector of modules objects)
      //   def: the factory for this module
      //   result: the result of the running the factory for this module
      //   injected: (requested | arrived | nonmodule) the status of the module; nonmodule means the resource did not call define
      //   ready: 1 <==> all prerequisite fullfilled to execute the module
      //   load: plugin load function; applicable only for plugins
      // 
      // Modules go through several phases in creation:
      // 
      // 1. Requested: some other module's definition contains the requested module in
      //    its dependency vector or executing code explicitly demands a module via req.require.
      // 
      // 2. Injected: a script element has been appended to the head element demanding the resource implied by the URL
      // 
      // 3. Loaded: the resource injected in [2] has been evaluated.
      // 
      // 4. Defined: the resource contained a define statement that advised the loader
      //    about the module. Notice that some resources may just contain a bundle of code
      //    and never formally define a module via define
      // 
      // 5. Evaluated: the module was defined via define and the loader has evaluated the factory and computed a result.
      {},

    execQ=
      ///
      // The list of modules that need to be evaluated.
      [],

    waiting= 
      // The set of modules upon which the loader is waiting.
      {},

    execComplete=
      // says the loader has completed (or not) its work
      function() {
        return defQ && !defQ.length && isEmpty(waiting) && !execQ.length;
      },

    runMapProg= function(targetMid, map) {
      // search for targetMid in map; return the map item if found; falsy otherwise
      for (var i= 0; i<map.length; i++) {
        if (map[i][2].test(targetMid)) {
          return map[i];
        }
      }
      return 0;
    },

    normalizeName= function(name, base) {
      // normalize name with respect to base iff name starts with a relative module name; return result
      if (name.charAt(0)==".") {
        // find non-empty string, followed by "/", followed by non-empty string without "/" followed by end
        var match= base.match(/(.+)\/[^\/]+$/);
        if (match) {
          // base was m0/m1/../mn-1/mn; prefix name with m0/m1/../mn-1
          name= (match[1] + "/" + name).replace(/\/\.\//g, "/");
        } else if (name.substring(0, 2)=="./") {
          // base was a single name; stip off the "./"
          name= name.substring(2);
        } // else do nothing
        // optionally anything followed by a "/", followed by a non-empty string without "/", followed by "/../", followed by anything
        while ((match= name.match(/(.*\/)?[^\/]+\/\.\.\/(.*)/))) {
          name= match[1] + match[2];
        }
      }
      return name;
    },
  
    getModule= function(mid, referenceModule, doNotCreate) {
      // compute and optionally construct (if necessary) the module implied by the mid with respect to referenceModule
      referenceModule= referenceModule || {};
      var
        path= referenceModule && referenceModule.path,
        parts= normalizeName(mid, path).split("!"),
        targetMid= parts[0],
        pluginTargetMid= parts[1],
        targetPid= 0,
        mapProg= referenceModule.pack && referenceModule.pack.mapProg,
        mapItem= (mapProg && runMapProg(targetMid, mapProg)) || runMapProg(targetMid, packageMapProg),
        mainModule= 0, 
        cqn, 
        result;
      if (mapItem) {
        // mid specified a module that's a member of a package; figure out the package id and module id
        targetPid= mapItem[1];
        targetMid= targetMid.substring(mapItem[3] + 1);
        if (!targetMid.length) {
          // this is the main module for a package
          targetMid= packages[targetPid].main;
          mainModule= 1;
        }
      }
      cqn= (targetPid ? targetPid : "") + "*" + (mainModule ? "" : targetMid);
      result= modules[cqn];
      if (!result) {
        result= {
          pid:targetPid, 
          id:targetMid,
          cqn:cqn,
          pack:targetPid && packages[targetPid],
          path:(targetPid ? targetPid : "") + (mainModule ? "/"+targetPid : (targetPid ? "/" : "") + targetMid)};
        if (!doNotCreate) {
          modules[cqn]= result;
        }
      }
      if (pluginTargetMid) {
        // result is actually the plugin; resolve the plugin target module with respect to referenceModule
        var 
          plugin= result,
          pluginTarget= getModule(pluginTargetMid, referenceModule, 1);
        // adjust the cqn to be fully qualified: "<plugin-cqn>!<plugin-module-cqn>"
        cqn= plugin.cqn + "!" + pluginTarget.cqn;
        result= modules[cqn];
        if (!result) {
          // create a *completely* new object since the getModule call 3 lines up may have returned an existing module
          result= modules[cqn]= mix(mix({}, pluginTarget), {cqn:cqn, plugin:plugin});
          if (!doNotCreate) {
            modules[cqn]= result;
          }
        }
      }
      return result;
    },

    cjsModuleInfo= {
      injected: arrived,
      deps: [],
      executed: 1,
      result: 1
    },
    cjsRequireModule= mix(getModule("require", 0, 0), cjsModuleInfo),
    cjsExportsModule= mix(getModule("exports", 0, 0), cjsModuleInfo),
    cjsModuleModule= mix(getModule("module", 0, 0), cjsModuleInfo),

    runFactory= function(cqn, factory, args, exports) {
      if (has("loader-traceApi")) {
        req.trace("loader-runFactory", [cqn]);
      }
      if (has("loader-buildToolsApi")) {
        var
          m= modules[cqn],
          parts= cqn.split("*"),
          url= m.url;
        req.buildQ= (req.buildQ || "") + "(\"" + parts[0] + "\", \"" + parts[1] + "\", \"" + (url ? url : "") + "\")\n";
      }
      return isFunction(factory) ? (factory.apply(null, args) || exports) : factory;
    },

    evalOrder= 0,

    execModule= function(
      module
    ) {
      // run the dependency vector, then run the factory for module
      if (!module.executed) {
        var
          cqn= module.cqn,
          deps= module.deps || [],
          arg, 
          args= [], 
          i= 0, 
          cjsexports= {};

        if (has("loader-traceApi")) {
          req.trace("loader-execModule", [cqn]);
        }

        // guard against circular dependencies
        module.executed= 1;
        while (i<deps.length) {
          arg= deps[i++];
          args.push((arg===cjsRequireModule) ? createRequire(module) :
                                               ((arg===cjsExportsModule) ? cjsexports :
                                                                           ((arg===cjsModuleModule) ? module.module :
                                                                                                      execModule(arg))));
        }
        if (has("loader-catchApi")) {
          try {
            module.result= runFactory(cqn, module.def, args, cjsexports);
          } catch (e) {
            if (!has("loader-errorApi") || !req.onError("loader/exec", [e, cqn].concat(args))) {
              throw e;
            }
          }
        } else {
          module.result= runFactory(cqn, module.def, args, cjsexports);
        }
        module.evalOrder= evalOrder++;
        if (has("loader-pushHas")) {
          if (module.id=="has") {
            var p, hasModule= module.result;
            for (p in hasMap) {
              hasModule.add(p, function(){ return hasMap[p]; }, 1);
            }
            req.has= hasModule;
          }
        }
        if (module.loadQ) {
          // this was a plugin module
          var
            q= module.loadQ,
            load= module.load= module.result.load;
          while (q.length) {
            load.apply(null, q.shift());
          }
        }
        if (has("loader-traceApi")) {
          req.trace("loader-execModule-out", [cqn]);
        }
      }
      return module.result;
    },

    checkCompleteTimer= 0,
    checkComplete= function() {
      if (has("loader-throttleCheckComplete")) {
        if (!checkCompleteTimer) {
          checkCompleteTimer= setInterval(function() { doCheckComplete(); }, 50);
        }
      } else {
        doCheckComplete();
      }
    },

    checkCompleteRecursiveGuard= 0,
    doCheckComplete= function() {
      if (checkCompleteRecursiveGuard) {
        return;
      }
      checkCompleteRecursiveGuard= 1;

      var 
        readySet= {},
        rerun= 1,
        notReadySet, visited, module, i,
        ready= function(module) {
          var cqn= module.cqn;
          if (readySet[cqn] || visited[cqn]) {
            return 1;
          }
          visited[cqn]= 1;
          if ((!module.executed && !module.def) || notReadySet[cqn]) {
            notReadySet[module.cqn]= 1;
            return 0;
          }
          for (var deps= module.deps, i= 0; deps && i<deps.length;) {
            if (!ready(deps[i++])) {
              notReadySet[cqn]= 1;
              return 0;
            }
          }
          readySet[cqn]= 1;
          return 1;
        };

      while (rerun) {
        notReadySet= {};
        rerun= 0;
        for (i= 0; i<execQ.length;) {
          visited= {};
          module= execQ[i];
          if (module.executed) {
            execQ.splice(i, 1);
          } else if (ready(module)) {
            execModule(module);
            execQ.splice(i, 1);
            // executing a module may result in a plugin calling load which
            // may result in yet another module becoming ready; therefore,
            rerun= 1;
          } else {
            i++;
          }
        }
      }

      checkCompleteRecursiveGuard= 0;
      if (!execQ.length && checkCompleteTimer) {
        clearInterval(checkCompleteTimer);
        checkCompleteTimer= 0;
      }
      if (has("loader-pageLoadApi")) {
        onLoad();
      }
    };


  if (has("loader-injectApi")) {
    var
      mapUrl= function(
        url, 
        urlMap
      ) {
        for (var i= 0, result= 0, item; !result && i<urlMap.length;) {
          item= urlMap[i++];
          if (isFunction(item)) {
            result= item(url);
          } else {
            result= item[0].test(url) && url.replace(item[0], item[1]);
          }
        }
        return result;
      },
  
      nameToUrl= function(
        name, 
        module, 
        resolve
      ) {
        // converts a name to a URL with respect to module as given by configuration. The name is processed
        // as if it is a module name:
        // 
        //   * it is normalized with respect to module
        //   * the package is derived
        //   * mappings are applied with respect to the package
        //   * paths are applied
        //   * ".js" is appended if name does not already have a filetype
        //   * the urlMap is applied.
        // 
        // Notice, however, the processing above is perfectly happy transforming names that do not happen to
        // be modules (i.e., whether or not the name points to a module is unknown by this routine and names
        // with non-module extensions (like .html) can be provided as arguments).

        var path, targetMid, pack, mapProg, mapItem, url, i;
        if (resolve) {
          // fully resolve
          path= module && module.path,
          targetMid= normalizeName(name, path),
          pack= module.pack,
          mapProg= pack && pack.mapProg,
          mapItem= (mapProg && runMapProg(targetMid, mapProg)) || runMapProg(targetMid, packageMapProg);
          if (mapItem) {
            pack= packages[mapItem[1]];
            targetMid= targetMid.substring(mapItem[3] + 1);
          } else {
            // a module in the default package
            pack= 0;
          }
        } else {
          pack= module.pack;
          targetMid= name;
        }
        url= (pack ? (pack.name + "/") : "") + targetMid;

        for (i= 0; i<pathsMapProg.length; i++) {
          if (pathsMapProg[i][2].test(url)) {
            url= url.substring(pathsMapProg[i][3]) + pathsMapProg[i][1];
            break;
          }
        }
        if (i==pathsMapProg.length) {
          // did not map the path above; therefore...
          // submit the url to the urlMap transforms; the first one wins
          url= (pack && mapUrl(url, pack.urlMap)) || mapUrl(url, urlMap);

          // no winner? Then its a module in a standard location...
          url= url || (pack ? pack.location + "/" + (pack.lib ? pack.lib + "/" : ""): "" ) + targetMid;
        }
  
        // if result is not absolute, add baseUrl
        // TODO: why do we care about the .js suffix?
        if (!(/(^\/)|(\:)|(\.js$)/.test(url))) {
          url= req.baseUrl + url;
        }
  
        // add the extension if required
        // TODOC: notice that this algorithm insists on a url having an extension
        url+= /\.[^\/]+$/.test(url) ? "" : ".js";

        return url;
      },

      injectedUrls= 
        ///
        // hash:(cqn)-->(requested | arrived)
        ///
        //note
        // `requested` and `arrived` give "symbol-like" behavior since JavaScript doesn't have symbole; See
        // bd.symbol for an in-depth explanation.
        //
        {},

      injectUrl,
 
      cache= 
        ///
        // hash:(cqn)-->(function)
        ///
        // Gives the contents of a cached script; function should cause the same actions as if the given cqn was downloaded
        // and evaluated by the host environment
        req.cache || {},
  
      injectPlugin= function(
        module
      ) {
        // injects the plugin module given by module; may have to inject the plugin itself
        var 
          cqn= module.cqn,
          onload= function(def) {
            mix(module, {executed:1, result:def});           
            setDel(waiting, cqn);
            checkComplete();
          };
        if (cache[cqn]) {
          onload(cache[cqn]);
        } else {
          var plugin= module.plugin;
          if (!plugin.load) {
            plugin.loadQ= [];
            plugin.load= function(require, id, callback) {
              plugin.loadQ.push([require, id, callback]);
            };
            injectModule(plugin);
          }
          setIns(waiting, cqn);
          plugin.load(createRequire(module), module.path, onload);
        }
      },

      injectModule= function(
        module
      ) {
        // Inject the module. In the browser environment, this means appending a script element into 
        // the head; in other environments, it means loading a file.
  
        var cqn= module.cqn;
        if (module.injected || waiting[cqn]) {
          return;
        }
        if (module.plugin) {
          injectPlugin(module);
          return;
        }
    
        // not a plugi-- a normal module
        module.injected= requested;
        setIns(waiting, cqn);
        var 
          url= module.url= nameToUrl(module.id, module, 0),
          cqu= (module.pid || "") + "*" + url;
        if (injectedUrls[cqu]) {
          // the script has already been requested (two different modules resolve to the same URL)
          return;
        }
  
        // the url implied by module has not been requested; therefore, request it
        // note that it is possible for two different cqns to imply the same url
        injectedUrls[cqu]= requested;
        var onLoadCallback= function() { 
          injectedUrls[cqu]= arrived;
          setDel(waiting, cqn);
          runDefQ(module);
          if (module.injected!==arrived) {
            // the script that contained the module arrived and has been executed yet
            // the injected prop was not advanced to arrived; therefore, onModule must
            // not have been called; therefore, it must not have been a module (it was
            // just some code); adjust state accordingly
            mix(module, {
              injected: arrived,
              deps: [],
              def: nonmodule,
              result: nonmodule
            });
          }
          checkComplete();
        };
        if (cache[cqn]) {
          cache[cqn].call(null);
          onLoadCallback();
        } else {
          injectUrl(url, onLoadCallback);
          startTimer();
        }
      },

      defQ= 
        // The queue of define arguments sent to loader.
        [],
  
      defineModule= function(module, deps, def, url) {
        if (has("loader-traceApi")) {
          req.trace("loader-defineModule", [module, deps]);
        }
  
        var cqn= module.cqn;
        if (module.injected==arrived) {
          req.onError("loader/multiple-define", [cqn]); 
          return module;
        }
        mix(module, {
          injected: arrived,
          url: url,
          deps: deps,
          def: def
        });

        // resolve deps with respect to pid
        for (var i= 0; i<deps.length; i++) {
          deps[i]= getModule(deps[i], module);
        }
        
        setDel(waiting, cqn);
        execQ.push(module);
  
        // don't inject dependencies; wait until the current script has completed executing and then inject. 
        // This allows several definitions to be contained within one script without prematurely requesting
        // resources from the server.

        return module;
      },
  
      runDefQ= function(referenceModule) {
        //defQ is an array of [id, dependencies, factory]
        var
          rPath= referenceModule.path,
          definedModules= [],
          args, module;
        while (defQ.length) {
          args= defQ.shift();
          // explicit define indicates possilbe multiple modules in a single file; therefore, the module may not yet exists
          module= args[0] ? getModule(normalizeName(args[0], rPath), referenceModule) : referenceModule;
          definedModules.push(defineModule(module, args[1], args[2], referenceModule.url));
        }
        forEach(definedModules, injectDependencies);
      };
  } else {
    req.injectModule= function(pid, id, deps, def) {
      var cqn= pid + "*" + id;
      execQ.push(modules[cqn]= {
        pid:pid,
        id:id,
        path: pid + "/" + (id || pid),
        cqn:cqn,
        injected:arrived,
        deps:deps,
        def:def
      });
    };
    req.go= function() {
      for (var p in modules) {
        for (var module= modules[p], deps= module.deps, i= 0; i<deps.length; i++) {
          deps[i]= getModule(deps[i], module);
        }
      }
      doCheckComplete();
    };
  }

  if (has("loader-timeoutApi")) {
    var
      // Timer machinery that monitors how long the loader is waiting and signals
      // an error when the timer runs out.
      timerId=
        0,
  
      clearTimer= function() {
        timerId && clearTimeout(timerId);
        timerId= 0;
      },
  
      startTimer= function() {
        clearTimer();
        req.timeout && (timerId= setTimeout(function() { 
          clearTimer();
          req.onError("loader/timeout", [waiting]); 
        }, req.timeout));
      };
  } else {
    var 
      clearTimer= noop,
      startTimer= noop;
  }

  if (has("dom")) {
    req.host= "browser";
    req.isBrowser= 1;
    var doc= document;

    if (has("loader-pageLoadApi") || has("loader-injectApi")) {
      var on= function(node, eventName, handler, useCapture, ieEventName) {
        // Add an event listener to a DOM node using the API appropriate for the current browser; 
        // return a function that will disconnect the listener.
        if (has("dom-addEventListener")) {
          node.addEventListener(eventName, handler, !!useCapture);
          return function() {
            node.removeEventListener(eventName, handler, !!useCapture);
          };
        } else {
          if (ieEventName!==false) {
            eventName= ieEventName || "on"+eventName;
            node.attachEvent(eventName, handler);
            return function() {
              node.detachEvent(eventName, handler);
            };
          } else {
            return noop;
          }
        }
      };
    }

    if (has("loader-injectApi")) {
      var
        head= doc.getElementsByTagName("head")[0] || doc.getElementsByTagName("html")[0],
        injectUrl= function(url, callback) {
          // Append a script element to the head element with src=url; apply callback upon 
          // detecting the script has loaded.
          var 
            node= doc.createElement("script"),
            onLoad= function(e) {
              e= e || window.event;
              var node= e.target || e.srcElement;
              if (e.type==="load" || /complete|loaded/.test(node.readyState)) {
                disconnector();
                callback && callback.call();
              }
            },
            disconnector= on(node, "load", onLoad, false, "onreadystatechange");
          node.src= url;
          node.type= "text/javascript";
          node.charset= "utf-8";
          head.appendChild(node);
        };
  
      if (has("loader-sniffApi")) {
        if (!req.baseUrl) {
          req.baseUrl= "";
          for (var match, src, scripts= doc.getElementsByTagName("script"), i= 0; i<scripts.length; i++) {
            src= scripts[i].getAttribute("src") || "";
            if ((match= src.match(/require\.js$/))) {
              req.baseUrl= src.substring(0, match.index) || "./";
              req.main=  req.main || scripts[i].getAttribute("data-main") || "";
              // remember the base node so other machinery can use it to pass parameters (e.g., djConfig)
              req.baseNode= scripts[i];
              break;
            }
          }
        }
      }
    }  

    if (has("loader-pageLoadApi")) {
      // page load detect code derived from Dojo, Copyright (c) 2005-2010, The Dojo Foundation. Use, modification, and distribution subject to terms of license.

      //warn
      // document.readyState does not work with Firefox before 3.6. To support
      // those browsers, manually init require.pageLoaded in configuration.
    
      // require.pageLoaded can be set truthy to indicate the app "knows" the page is loaded and/or just wants it to behave as such
      req.pageLoaded= req.pageLoaded || document.readyState=="complete";

      // no need to detect if we already know...
      if (!req.pageLoaded) {
        var
          loadDisconnector= 0,
          DOMContentLoadedDisconnector= 0,
          scrollIntervalId= 0,
          detectPageLoadedFired= 0,
          detectPageLoaded= function() {
            if (detectPageLoadedFired) {
              return;
            }
            detectPageLoadedFired= 1;
      
            if (scrollIntervalId) {
              clearInterval(scrollIntervalId);
              scrollIntervalId = 0;
            }
            loadDisconnector && loadDisconnector();
            DOMContentLoadedDisconnector && DOMContentLoadedDisconnector();
            req.pageLoaded= true;
            onLoad();
          };
      
        if (!req.pageLoaded) {
          loadDisconnector= on(window, "load", detectPageLoaded, false);
          DOMContentLoadedDisconnector= on(doc, "DOMContentLoaded", detectPageLoaded, false, false);
        }

        if (!has("dom-addEventListener")) {
          // note: this code courtesy of James Burke (https://github.com/jrburke/requirejs)
          //DOMContentLoaded approximation, as found by Diego Perini:
          //http://javascript.nwbox.com/IEContentLoaded/
          if (self === self.top) {
            scrollIntervalId = setInterval(function () {
              try {
                //From this ticket:
                //http://bugs.dojotoolkit.org/ticket/11106,
                //In IE HTML Application (HTA), such as in a selenium test,
                //javascript in the iframe can't see anything outside
                //of it, so self===self.top is true, but the iframe is
                //not the top window and doScroll will be available
                //before document.body is set. Test document.body
                //before trying the doScroll trick.
                if (doc.body) {
                  doc.documentElement.doScroll("left");
                  detectPageLoaded();
                }
              } catch (e) {}
            }, 30);
          }
        }
      }

      var 
        loadQ= 
          // The queue of functions waiting to execute as soon as all conditions given
          // in require.onLoad are satisfied; see require.onLoad
          [],

        onLoadRecursiveGuard= 0,
        onLoad= function() {
          // TODOC
          while (execComplete() && !checkCompleteRecursiveGuard && !onLoadRecursiveGuard && req.pageLoaded && loadQ.length) {
            //guard against recursions into this function
            onLoadRecursiveGuard= true;
            var f= loadQ.shift();
            if (has("loader-catchApi")) {
              try {
                f.call(null);
              } catch (e) {
                onLoadRecursiveGuard= 0;
                if (!req.onError("loader/onLoad", [e])) {
                  throw e;
                }
              }
            } else {
              f.call(null);
            }
            onLoadRecursiveGuard= 0;
          }
        };

      req.addOnLoad= function(
        context, //(object) The context in which to run execute callback
                 //(function) callback, if context missing
        callback //(function) The function to execute.
      ) {
        ///
        // Add a function to execute on DOM content loaded and all requests have arrived and been evaluated.
    
        if (callback) {
          isString(callback) && (callback= context[callback]);
          loadQ.push(function() {
            callback.call(context);
          });
        } else {
          loadQ.push(context);
        }
        onLoad();
      };
    }
  }

  if (has("loader-node")) {
    injectUrl= function(url, callback) {
      req.nodeInject(url, callback);
    };
  }  

  if (has("loader-traceApi")) {
    req.trace= function(
      group, // the trace group to which this application belongs
      args   // the contents of the trace
    ) {
      ///
      // Tracing interface by group.
      // 
      // Sends the contents of args to the console iff require.trace[group] is truthy.
      if (req.traceSet[group]) {
        if (has("console-log-apply")) {
          console.log.apply(console, [group+": "].concat(args));
        } else {
          //IE...
          for (var i= 0; i<args.length; i++) {
            console.log(args[i]);
          }
        }
      }
    };
  } else {
    req.trace= req.trace || noop;
  }

  //
  // Error Detection and Recovery
  //
  // Several things can go wrong during loader operation:
  //
  // * A resource may not be accessible, giving a 404 error in the browser or a file error in other environments
  //   (this is usally caught by a loader timeout (see require.timeout) in the browser environment).
  // * The loader may timeout (after the period set by require.timeout) waiting for a resource to be delivered.
  // * Executing a module may cause an exception to be thrown.
  // * Executing the onLoad queue may cause an exception to be thrown.
  // 
  // In all these cases, the loader publishes the problem to interested subscribers via the function require.onError.
  // If the error was an uncaught exception, then if some subscriber signals that it has taken actions to recover 
  // and it is OK to continue by returning truthy, the exception is quashed; otherwise, the exception is rethrown. 
  // Other error conditions are handled as applicable for the particular error.
  if (has("loader-errorApi")) {
    var onError= req.onError= 
      function(
        messageId, //(string) The topic to publish
        args       //(array of anything, optional, []) The arguments to be applied to each subscriber.
      ) {
        ///
        // Publishes messageId to all subscribers, passing args; returns result as affected by subscribers.
        ///
        // A listener subscribes by writing
        // 
        //code
        // require.onError.listeners.push(myListener);
        ///
        // The listener signature must be `function(messageId, args`) where messageId indentifies 
        // where the exception was caught and args is an array of information gathered by the catch
        // clause. If the listener has taken corrective actions and want to stop the exception and
        // let the loader continue, it must return truthy. If no listener returns truthy, then
        // the exception is rethrown.
    
        for (var errorbacks= onError.listeners, result= false, i= 0; i<errorbacks.length; i++) {
          result= result || errorbacks[i](messageId, args);
        }
        console.error(messageId);
        onError.log.push(args);
        return result;
      };
    onError.listeners= [];
    onError.log= [];
  } else {
    req.onError= req.onError || noop;
  }

  if (has("loader-requirejsApi")) {
    req.onLoad= req.onLoad || req.ready;
    req.addOnLoad && (req.ready= req.addOnLoad);
    req.pause= req.resume= noop;
    req.def= define;
  }

  if (has("loader-libApi")) {
    mix(req, {
      isEmpty:isEmpty,
      isFunction:isFunction,
      isString:isString,
      isArray:isArray,
      forEach:forEach,
      setIns:setIns,
      setDel:setDel,
      mix:mix,
      uid:uid,
      on:on,
      injectUrl:injectUrl
    });
  }

  if (has("loader-traceApi")) {
    mix(req, {
      urlMap:urlMap,
      path:paths,
      packages:packages,
      packageMap:packageMap,
      modules:modules,
      execQ:execQ,
      defQ:defQ,
      waiting:waiting,
      injectedUrls:injectedUrls,
      cache:cache,
      loadQ:loadQ
    });
  } else {
    mix(req, {
      urlMap:urlMap,
      path:paths,
      packages:packages,
      packageMap:packageMap
    });
  }

  if (has("loader-createHasModule")) {
    mix(getModule("has", 0, 0), {injected:arrived, deps:[], executed:1, result:has});
  }

  var 
    deps= (req.main && [req.main]) || req.deps || req.defaultDeps,
    callback= req.callback;
  if (deps || callback) {
    req(deps || [], callback || 0);
  }
  if (req.onLoad) {
    loadQ.push(req.onLoad);
  }
})
// begin default bootstrap configuration
// note: typically, some or all of these arguments are replaced when compiling the loader for a particular target
(

  // the use can send in a configuration by defining a global require object
  this.require || {}, 

  // default configuration
  {
    baseUrl:""
    , defaultDeps: ["config"]
    , timeout:0      // 5 second timeout before loader detects inject error
    ,traceSet: {}    // not tracing turned on
  },

  // default has switches
  {
    "dom": !!this.document,
    "dom-addEventListener": this.document && !!document.addEventListener,
    "console": typeof console!="undefined",
    "console-log-apply": !!(typeof console!="undefined" && console.log && console.log.apply),
    "loader-injectApi": 1,
    "loader-timeoutApi": 1,
    "loader-traceApi": 1,
    "loader-buildToolsApi": 1,
    "loader-catchApi": 1,
    "loader-pageLoadApi": 1,
    "loader-errorApi": 1,
    "loader-sniffApi": 0,
    "loader-undefApi": 1,
    "loader-libApi": 1,
    "loader-requirejsApi": 1,
    "loader-pushHas": 1,
    "loader-createHasModule": 1,
    "loader-amdFactoryScan": 1,
    "loader-throttleCheckComplete": 1,
    "native-xhr": !!this.XMLHttpRequest
  },

  // has.js
  this.has
);
// Copyright (c) 2008-2010, Rawld Gill and ALTOVISO LLC (www.altoviso.com). Use, modification, and distribution subject to terms of license.

