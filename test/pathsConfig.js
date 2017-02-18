define(["smoke", "test/assert", "require"], function(smoke, assert, contextRequire){
	smoke.defTest({
		id: "paths config",
		before: function(){
			let self = this;
			return new Promise(function(resolve, reject){
				require.signal = function(e){
					reject(e);
				};
				require.config({
					packages: [{name: "pathTest", location: contextRequire.toUrl("./pathTestFake")}],
					paths: {
						"pathTest": contextRequire.toUrl("./pathTest"),
						"pathTest/moduleB": contextRequire.toUrl("./pathTest/alternate/moduleB")
					}
				});
				require(["pathTest/moduleA", "pathTest/moduleB"], function(moduleA, moduleB){
					self.user = {moduleA: moduleA, moduleB: moduleB};
					resolve();
				});
			})
		},
		test: function(){
			assert.deepEqual(this.user.moduleA, {value: "moduleA", moduleC:"moduleC"});
			assert.deepEqual(this.user.moduleB, {value: "moduleB", moduleC:"moduleC"});
		}
	})
});
