define(["smoke", "test/assert"], function(smoke, assert){
	smoke.defTest({
		id: "toUrl",
		before: function(){
			let self = this;
			return new Promise(function(resolve, reject){
				require.signal = function(e){
					reject(e);
				};
				require(["test/toUrl/module"], function(module){
					self.user = module;
					resolve();
				});
			})
		},
		test: function(){
			this.user.forEach(pair=>{
				assert.equal(pair[0], pair[1]);

			});
		}
	})
});
