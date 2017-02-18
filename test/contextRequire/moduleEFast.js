// module that uses context required to load a relative module
define(["require"], function(require){
	return new Promise(function(resolve, reject){
		setTimeout(function(){
			resolve("moduleEFast");
		}, 50);
	});
});