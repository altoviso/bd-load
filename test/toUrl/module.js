define(["require"], function(require){
	return [
		["../../test/toUrl/main.html", require.toUrl("./main.html")],
		["../../test/toUrl/main", require.toUrl("./main")],
		["../../test/toUrl/.main.html", require.toUrl("./.main.html")],
		["../../test/toUrl/.main", require.toUrl("./.main")],

		// these resolve differently than requirejs, which imagines a ./ prefix for each of the following
		// but "sub/main" (et al) is an absolute module id...no matter where it appears. If you want relative, say so!
		// ergo, we think requirejs is wrong
		["sub/main", require.toUrl("sub/main")],
		["sub/.main", require.toUrl("sub/.main")],
		["sub/main.html", require.toUrl("sub/main.html")],
		["sub/.main.html", require.toUrl("sub/.main.html")]

	];
});