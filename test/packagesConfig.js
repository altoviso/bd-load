define(["smoke", "test/assert", "require"], function(smoke, assert, contextRequire){
	smoke.defTest({
		id: "packages config",
		before: function(){
			let self = this;
			return new Promise(function(resolve, reject){
				require.signal = function(e){
					reject(e);
				};
				require.config({
					packages: [{
						name: "packageTest", location: contextRequire.toUrl("./packageTest"), main: "main"
					}, {
						name: "packageA", location: contextRequire.toUrl("./packageTest/packageA")
					}, {
						name: "packageB", location: contextRequire.toUrl("./packageTest/packageB")
					}, {
						name: "lib-v1", location: contextRequire.toUrl("./packageTest/lib-v1"), main: "main"
					}, {
						name: "lib-v2", location: contextRequire.toUrl("./packageTest/lib-v2"), main: "main"
					}],
					map: {
						"packageA": {
							"lib": "lib-v1"
						},
						"packageB": {
							"lib": "lib-v2"
						}
					}
				});
				require(["packageTest", "packageA/someModule", "packageB/someModule"], function(main, packageA, packageB){
					self.user = {main: main, packageA: packageA, packageB: packageB};
					resolve();
				});
			})
		},
		test: function(){
			assert.deepEqual(this.user.main, {value: "main", moduleA: "moduleA"});
			assert.deepEqual(this.user.packageA, {value: "module in package A", lib: "lib.v1"});
			assert.deepEqual(this.user.packageB, {value: "module in package B", lib: "lib.v2"});
		}
	})
})
;
