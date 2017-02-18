define(["smoke", "test/assert"], function(smoke, assert){
	let baseUrl = require.baseUrl;

	smoke.defTest({
		id: "baseUrl",
		tests: [{
			id: "change URL",
			before: function(){
				let self = this;
				require.baseUrl = "../../test/baseUrl";
				require.packages = [{name:"test2", location:"."}];
				return new Promise(function(resolve, reject){
					require.signal = function(e){
						reject(e);
					};
					require(["test2/module1ForBaseUrlTest"], function(moduleForBaseUrlTest){
						self.user = moduleForBaseUrlTest;
						resolve();
					});
				})
			},
			test: function(){
				assert(this.user.value === "module1 for baseUrl test");
			},
			after: function(){
				require.baseUrl = baseUrl;
			}
		}, {
			id: "change URL back",
			before: function(){
				let self = this;
				return new Promise(function(resolve, reject){
					require.signal = function(e){
						reject(e);
					};
					require(["test/baseUrl/module2ForBaseUrlTest"], function(moduleForBaseUrlTest){
						self.user = moduleForBaseUrlTest;
						resolve();
					});
				})
			},
			test: function(){
				assert(this.user.value === "module2 for baseUrl test");
			}
		}]
	})
});
