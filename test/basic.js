define(["smoke", "test/assert"], function(smoke, assert){
	smoke.defTest({
		id: "basic",
		before: function(){
			let self = this;
			return new Promise(function(resolve, reject){
				require.signal = function(e){
					reject(e);
				};
				require(["test/basic/moduleA"], function(moduleA){
					self.user = moduleA;
					resolve();
				});
			})
		},
		test: function(){
			assert(this.user.moduleA === "moduleA");
			assert(this.user.moduleB === "moduleB");
			assert.deepEqual(this.user.moduleC, {value:"moduleC"});
			assert(this.user.moduleD === "moduleD");
		}
	})
});
