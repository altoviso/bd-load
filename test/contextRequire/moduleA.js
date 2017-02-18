// module that uses context required to load a relative module
define(["require"], function(require){
	return (new Promise(function(resolve, reject){
		require(["./moduleB"], function(moduleB){
			resolve(moduleB);
		})
	})).then(moduleB =>{
		let requireError = false;
		try{
			require("./moduleX");
		}catch(e){
			requireError = e;
		}
		return [requireError, {
			moduleA: "moduleA",
			moduleB: moduleB,
			moduleBViaSyncRequire: require("./moduleB"),
			moduleCViaSyncRequire: require("test/contextRequire/moduleC")
		}];
	});
});