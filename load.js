// bd-load: a minimal, optimized (time and space) AMD loader using JS6 features.
//
// Copyright (c) 2008-2017, Rawld Gill and ALTOVISO LLC (www.altoviso.com).
// Use, modification, and distribution subject to terms of license.
//
"use strict";
(function(global, environment){
	let
		contextRequire = function(referenceModule, a1, a2){
			if(Array.isArray(a1)){
				// signature is (requestList [,callback])
				return Promise.all(a1.map(item =>{
					return getModule(referenceModule, item).resultPromise;
				})).then(function(results){
					a2 && a2(...results);
				});
			}else{
				// a1 is a string; therefore, signature is (moduleId)
				let module = getModuleInfo(referenceModule, a1);
				if(!module.executed){
					throw new LoaderError("undefined module", {module: module});
				}
				return module.result;
			}
		},

		// the global require function
		req = contextRequire.bind(null, null),

		// AMD baseUrl config
		baseUrl = "./",

		// AMD paths config
		paths = new Map(),

		// a map from pid to package configuration object; see fixupPackageInfo
		packs = new Map(),

		// AMD map config variable
		map = new Map(),

		// list of (from-path, to-path, regex, length) derived from paths, see computeMapProg
		pathsMapProg = [],

		// vector of quads as described by computeMapProg; map-key is AMD map key, map-value is AMD map value
		mapProgs = [],

		// A hash:(mid) --> (module-object) the module namespace; a module-object has is a hash with the following properties
		//
		// pid: (string) the package identifier to which the module belongs, if any; otherwise, ""
		// mid: (string) the fully-resolved (i.e., mappings have been applied) module identifier
		// url: (string) the URL where the module resource resides
		// executing: (boolean or undefined) true => the deps tree of the modules factories, including the module's factories are being traversed and executed
		// executed: (boolean or undefined) true => the module's factory has been executed
		// deps: (vector of modules objects) the dependency vector for this module
		// def: (function or object) the factory for this module
		// result: (any) the result of the running the factory for this module
		// loadedPromise: (Promise) promise that the module and it's dependency tree of modules will be defined
		//
		// A module goes through a life cycle as follows:
		//
		//      injected
		//      the module has been requested by either a require application or appearing in the dependency vector
		//      of a define application. In either case the module's resource is evaluated in the JavaScript environment.
		//      In the browser, this means a <SCRIPT> element is injected into the document with a src attribute that
		//      references the module's resource. In node.js, this means that node require is applied to the fully-resolved
		//      module resource filename. Note that the moment a module is born, it is injected.
		//
		//      defined
		//      the loader's define() function has been applied with reference to the particular module.
		//
		//      evaluating
		//      the dependency tree of the module is being traversed, and each factory in that tree is being executed
		//      as the tree is being traversed, modules are marked as "evaluating" and once the factory has successfully
		//      executed, modules are marked as "evaluated". This bookkeeping allows the loader to detect circular
		//      references and allow them to proceed.
		//
		//      evaluated
		//      the factory has been evaluated successfully and the value of the module has been recorded
		//
		// A module is initially requested by either...
		//      1. a require application, or...
		//      2. appearing in the dependency vector of a module, perhaps transitively, of a module that was required
		//
		// Both of these cases must result in a define application that define's the module in question.
		//
		// Further, a module may be defined by an explicit application of define with the signature:
		//     define(<absolute-module-id>, <dependency vector>, <factory>)
		//
		// One a module is defined, the loader will take all measure necessary to move the module to the evaluated stage.
		// The algorithm is quite trivial: once the loadedPromise for a module is resolved, evaluate the module.
		//
		modules = new Map,

		mix = ((dest, src) =>{
			for(let p in src){
				dest[p] = src[p];
			}
			return dest;
		}),

		toMap = (src) =>{
			if(src instanceof Map){
				return new Map(src);
			}else{
				let result = new Map();
				Object.keys(src).forEach(key => result.set(key, src[key]));
				return result;
			}
		},

		LoaderError = class extends Error {
			constructor(text, additionalInfo){
				super(text);
				this.additionalInfo = additionalInfo;
			}
		},

		toAbsMid = function(referenceModule, mid){
			return getModuleInfo(referenceModule, mid).mid;
		},

		toUrl = function(referenceModule, name){
			let moduleInfo = getModuleInfo(referenceModule, name + "/x"),
				url = moduleInfo.url;
			// "/x.js" since getModuleInfo automatically appends ".js" and we appended "/x" to make name look like a module id
			return url.substring(0, url.length - 5);
		},

		makeCjs = function(mid){
			return modules.set(mid, {
				mid: mid, loadedPromise: new Promise(function(resolve){
					resolve();
				})
			}).get(mid);
		},
		cjsRequireModule = makeCjs("require"),
		cjsExportsModule = makeCjs("exports"),
		cjsModuleModule = makeCjs("module"),


		computeMapProg = function computeMapProg(map){
			// This routine takes a map as represented by a JavaScript object and initializes dest, a vector of
			// quads of (map-key, map-value, refex-for-map-key, length-of-map-key), sorted decreasing by length-
			// of-map-key. The regex looks for the map-key followed by either "/" or end-of-string at the beginning
			// of a the search source. Notice the map-value is irrelevent to the algorithm
			let result = [];
			for(const [key, value] of map.entries()){
				result.push([key, value, new RegExp("^" + key.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(c){
						return "\\" + c;
					}) + "(\/|$)"), key.length]);
			}
			result.sort(function(lhs, rhs){
				return rhs[3] - lhs[3];
			});
			return result;
		},

		runMapProg = function(targetMid, map){
			// search for targetMid in map; return the map item if found; falsy otherwise
			if(map){
				for(let i = 0; i < map.length; i++){
					if(map[i][2].test(targetMid)){
						return map[i];
					}
				}
			}
			return 0;
		},

		compactPath = function(path){
			let result = [],
				segment, lastSegment;
			path = path.replace(/\\/g, "/").split("/");
			while(path.length){
				segment = path.shift();
				if(segment == ".." && result.length && lastSegment != ".."){
					result.pop();
					lastSegment = result[result.length - 1];
				}else if(segment != "."){
					result.push(lastSegment = segment);
				} // else ignore "."
			}
			return result.join("/");
		},

		getModuleInfo = function(referenceModule, mid){
			// resolves all the naming stuff, but does NOT put into the modules map

			let match, pid, pack, midInPackage, mapItem, url, result;

			// relative module ids are relative to the referenceModule; get rid of any dots
			mid = compactPath(/^\./.test(mid) ? (referenceModule.mid + "/../" + mid) : mid);
			// at this point, mid is an absolute mid

			// map the mid
			mapItem = ((referenceModule && runMapProg(referenceModule.mid, mapProgs)) || mapProgs.star);
			mapItem = mapItem && runMapProg(mid, mapItem[1]);
			if(mapItem){
				mid = mapItem[1] + mid.substring(mapItem[3]);
			}

			match = mid.match(/^([^\/]+)(\/(.+))?$/);
			pid = match ? match[1] : "";
			if((pack = packs.get(pid))){
				mid = pid + "/" + (midInPackage = (match[3] || pack.main));
			}else{
				pid = "";
			}

			if(!(result = modules.get(mid))){
				mapItem = runMapProg(mid, pathsMapProg);
				url = mapItem ? mapItem[1] + mid.substring(mapItem[3]) : (pid ? pack.location + "/" + midInPackage : mid);
				result = {
					pid: pid,
					mid: mid,
					url: compactPath((/(^\/)|(\:)/.test(url) ? "" : baseUrl) + url + ".js")
				};
			}
			return result;
		},

		createModulePromises = function(module){
			module.resultPromise = new Promise(function(resolve){
				module.resultPromiseResolve = resolve;
			});
			module.loadedPromise = new Promise(function(resolve){
				module.loadedPromiseResolve = resolve;
			});
		},

		LOADER = Symbol("loader"),

		getModule = function(referenceModule, mid){
			// compute and construct (if necessary) the module implied by the mid with respect to referenceModule
			let module = getModuleInfo(referenceModule, mid);
			if(!modules.get(module.mid)){
				modules.set(module.mid, module);
				createModulePromises(module);
				let onLoadCallback = function(e){
					if(e){
						module.error = e;
						req.signal(new LoaderError("injected module failed to load", {module: module, error: e}));
					}else{
						defArgs && defineModule(module, ...defArgs);
					}
					defArgs = 0;
					holdInjections = false;
					if(delayedInjectList.length){
						let list = delayedInjectList;
						delayedInjectList = [];
						list.forEach(pair =>{
							if(!pair[0].def){
								// after delaying, the module still isn't defined; therefore, inject it
								pair[1]();
							}
						});
					}
				};
				if(holdInjections){
					delayedInjectList.push([module, injectUrl.bind(null, module, onLoadCallback, LOADER)]);
				}else{
					injectUrl(module, onLoadCallback, LOADER);
				}
			}
			return module;
		},

		defineModule = function(module, deps, def){
			if(module.def){
				req.signal(new LoaderError("module defined more than once", {module: module}));
				return;
			}
			mix(module, {
				def: def,
				deps: deps.map(getModule.bind(null, module)),
				cjs: {
					id: module.mid,
					uri: module.url,
					exports: (module.result = {}),
					setExports: function(exports){
						module.cjs.exports = exports;
					},
					config: function(){
						return module.config;
					}
				}
			});
			module.loadedPromise.then(execModule.bind(null, module));
			Promise.all(module.deps.map(dep => dep.loadedPromise)).then(module.loadedPromiseResolve);
		},

		execModule = function(module){
			// run the dependency vector, then run the factory for module
			if(module.executing){
				// for circular dependencies, assume the first module encountered was executed OK
				// modules that circularly depend on a module that has not run its factory will get
				// the premade cjs.exports===module.result. They can take a reference to this object and/or
				// add properties to it. When the module finally runs its factory, the factory can
				// read/write/replace this object. Notice that so long as the object isn't replaced, any
				// reference taken earlier while walking the deps list is still valid.
				return module.cjs.exports;
			}

			if(!module.executed){
				if(typeof module.def !== "function"){
					module.executed = true;
					module.resultPromiseResolve(module.cjs.exports = module.result = module.def);
				}else{
					let createRequire = function(module){
						return mix(contextRequire.bind(null, module), {
							toUrl: toUrl.bind(null, module),
							toAbsMid: toAbsMid.bind(null, module)
						});
					};

					let cjsRequire, result, args;
					module.executing = true;
					args = module.deps.map(dep =>{
						return ((dep === cjsRequireModule) ? (cjsRequire || (cjsRequire = createRequire(module))) :
							((dep === cjsExportsModule) ? module.cjs.exports :
								((dep === cjsModuleModule) ? module.cjs :
									execModule(dep))));
					});
					try{
						result = module.def.apply(null, args) || module.cjs.exports;
					}catch(e){
						module.error = e;
						req.signal(new LoaderError("module factory threw", {module: module, error: e}))
					}
					delete module.executing;
					module.executed = true;
					if(!module.error){
						if(result instanceof Promise){
							result.then(result =>{
								module.resultPromiseResolve(module.result = result);
							});
						}else{
							module.resultPromiseResolve(module.result = result)
						}
					}
				}
			}

			return module.result;
		};


	let waitCount = 0,
		injectUrl;
	if(environment === "browser"){
		let insertPoint = document.getElementsByTagName("script")[0].parentNode;
		injectUrl = function(module, callback, callingCode){
			if(typeof module === "string"){
				module = {url: module};
			}
			let handled = false,
				node = module.node = document.createElement("script"),
				handler = function(e){
					if(!handled){
						handled = true;
						callingCode === LOADER && waitCount--;
						callback(e.type === "load" ? undefined : e);
					}
				};
			node.addEventListener("load", handler);
			node.addEventListener("error", handler);
			callingCode === LOADER && waitCount++;
			node.src = module.url;
			insertPoint.appendChild(node);
		};
	}else{
		// node
		module.exports = req;
		req.nodeRequire = require;

		let vm = require("vm"),
			fs = require("fs");

		injectUrl = function(module, callback, callingCode){
			if(typeof module === "string"){
				module = {url: module};
			}
			try{
				callingCode === LOADER && waitCount++;
				vm.runInThisContext(fs.readFileSync(module.url, "utf8"), {filename: module.url, displayErrors: true});
				callingCode === LOADER && waitCount--;
				callback();
			}catch(e){
				callingCode === LOADER && waitCount--;
				callback(e);
			}
		};
	}

	Object.defineProperties(req, {
		baseUrl: {
			get: function(){
				return baseUrl;
			},
			set: function(value){
				baseUrl = (value + "/").replace(/\/\//g, "/");
			}
		},
		paths: {
			get: function(){
				return paths;
			},
			set: function(value){
				pathsMapProg = computeMapProg((paths = toMap(value)));
			}
		},
		map: {
			get: function(){
				return map;
			},
			set: function(value){
				mapProgs = computeMapProg(toMap(map = value));
				for(const [key, value] of mapProgs.entries()){
					value[1] = computeMapProg(toMap(value[1]));
					if(value[0] == "*"){
						mapProgs.star = value[1];
					}
				}
			}
		},
		packages: {
			get: function(){
				return packs;
			},
			set: function(value){
				value.forEach(p => packs.set(p.name, p));
			}
		},
		signal: {
			value: function(e){
				console.log(e);
			},
			writable: true
		},
		config: {
			value: function(config){
				Object.keys(config).forEach(key => this[key] = config[key]);
			}
		},
		Error: {
			value: LoaderError
		},
		toAbsMid: {
			value: toAbsMid.bind(null, null)
		},
		toUrl: {
			value: toUrl.bind(null, null)
		},
		inject: {
			value: function(url){
				return new Promise(function(resolve, reject){
					let callback = function(e){
						if(e){
							reject(new LoaderError("inject failed", {error: e}));
						}else{
							resolve();
						}
					};
					injectUrl(url, callback);
				})
			}
		},
		modules: {
			// sophisticated clients can mutate the contents of modules to fix error conditions, unload, reload, etc.
			value: modules
		}
	});
	global.require = req;

	let defArgs = 0,
		holdInjections = false,
		delayedInjectList = [];
	global.define = function(a1, a2, a3){
		if(arguments.length == 1){
			// signature is (factory)
			defArgs = [["require", "exports", "module"], a1];
		}else if(typeof a1 === "string"){
			// signature is either (mid, factory) or (mid, deps, factory)
			let threeArgs = arguments.length === 3,
				mid = a1,
				deps = threeArgs ? a2 : [],
				factory = threeArgs ? a3 : a2;
			if(/\./.test(mid)){
				req.signal(new LoaderError("module id in define cannot be relative", {mid: mid}))
			}
			let module = getModuleInfo(null, mid);
			if(!modules.get(module.mid)){
				modules.set(module.mid, module);
				createModulePromises(module);
			}
			if(waitCount){
				holdInjections = true;
			}
			defineModule(module, deps, factory);
		}else{
			// signature is (deps, factory)
			defArgs = [a1, a2];
		}
	};
	global.define.amd = {};
})(...(typeof document === "undefined" ? [global, "node"] : [this, "browser"]));
