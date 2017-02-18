// module with dependencies and an ordinary factory
define(["./moduleB", "./moduleC", "./moduleD"], function(moduleB, moduleC, moduleD){
	return {
		moduleA: "moduleA",
		moduleB: moduleB,
		moduleC: moduleC,
		moduleD: moduleD
	};
});