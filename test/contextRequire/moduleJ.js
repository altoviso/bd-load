// module that uses context required to load a relative module
define(["require"], function(require){
	return new Promise(function(resolve, reject){
		require(["./moduleHSlow", "./moduleGFast"], function(moduleH, moduleG){
			resolve({moduleG:moduleG, moduleH:moduleH});
		})
	})
});