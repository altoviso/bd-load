// module that uses context required to load a relative module
define(["require"], function(require){
	return (new Promise(function(resolve, reject){
		require(["./moduleC"], function(moduleC){
			resolve(moduleC);
		})
	})).then(moduleC =>{
		return {
			moduleB: "moduleB",
			moduleC: moduleC
		};
	});
});