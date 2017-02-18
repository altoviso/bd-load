define(["smoke", "test/assert"], function(smoke, assert){
	smoke.defTest({
		id: "contextRequire",
		before: function(){
			let self = this;
			return new Promise(function(resolve, reject){
				require.signal = function(e){
					reject(e);
				};
				require(["test/explicitDefine/moduleA"], function(moduleA, moduleB){
					self.user = {
						moduleA: moduleA,
						moduleB: moduleB
					};
					resolve();
				});
			});
		},
		test: function(){
			assert.deepEqual(this.user.moduleA, {
				A1: "test/explicitDefine/A1",
				A2: {value: "test/explicitDefine/A2", dependentA2: {value: "test/explicitDefine/dependentA2"}},
				A3: {value: "test/explicitDefine/A3"},
				A4: "test/explicitDefine/A4"
			})
		}
	})
});
