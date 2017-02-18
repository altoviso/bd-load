// module that uses context required to load a relative module
define(["require"], function(require){
	return new Promise(function(resolve, reject){
		require(["./moduleEFast", "./moduleFSlow"], function(moduleE, moduleF){
			resolve({moduleE:moduleE, moduleF:moduleF});
		})
	})
});