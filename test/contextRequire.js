define(["smoke", "test/assert"], function(smoke, assert){
	smoke.defTest({
		id: "contextRequire",
		before: function(){
			let self = this;
			return new Promise(function(resolve, reject){
				require.signal = function(e){
					reject(e);
				};
				require(["test/contextRequire/moduleA", "test/contextRequire/moduleI", "test/contextRequire/moduleJ"], function(moduleA, moduleI, moduleJ){
					self.user = {
						moduleA: moduleA,
						moduleI: moduleI,
						moduleJ: moduleJ
					};
					resolve();
				});
			});
		},
		test: function(){
			let requireError = this.user.moduleA[0];
			assert(requireError instanceof require.Error);
			assert.equal(requireError.message, "undefined module");
			assert.deepEqual(requireError.additionalInfo.module, {
				mid: "test/contextRequire/moduleX",
				pid: "test",
				url: "../../test/contextRequire/moduleX.js"
			});
			assert.deepEqual(this.user.moduleA[1], {
				moduleA: "moduleA",
				moduleB: {moduleB: "moduleB", moduleC: "moduleC"},
				moduleBViaSyncRequire: {moduleB: "moduleB", moduleC: "moduleC"},
				moduleCViaSyncRequire: "moduleC"
			});
			assert.deepEqual(this.user.moduleI, {moduleE: "moduleEFast", moduleF: "moduleFSlow"});
			assert.deepEqual(this.user.moduleJ, {moduleG: "moduleGFast", moduleH: "moduleHSlow"});
		}
	})
});
