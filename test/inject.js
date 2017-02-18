"use strict";
define(["smoke", "test/assert", "require"], function(smoke, assert, contextRequire){
	smoke.defTest({
		id: "inject",
		tests: [{
			id: "existing-resources",
			before: function(){
				return new Promise(function(resolve, reject){
					require.signal = function(e){
						reject(e);
					};
					require.inject(contextRequire.toUrl("./raw/raw1.js")).then(() =>{
						resolve();
					}).catch(e =>{
						reject(e);
					});
				})
			},
			test: function(){
				let global = (new Function("return this;"))();
				assert(global.globalVariableInitialedBytestRawRaw1 === "raw1");
			}
		}, {
			id: "nonexisting-resource",
			test: function(){
				return new Promise(function(resolve, reject){
					require.signal = function(e){
						reject(e);
					};
					console.log("expect HTTP 404 error for rawx/raw1.js to immediately follow...");
					resolve(require.inject("rawx/raw1.js").then(() =>{
						assert("unexpected");
					}).catch(e =>{
						assert(e instanceof require.Error);
						assert(e.message=="inject failed");
					}));
				})
			}
		}]
	})
});
