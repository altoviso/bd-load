require.config({
	packages: [
		{name: "chai", location: "../chai", main: "chai"},
	]
});

define([
	"test/basic",
	"test/inject",
	"test/baseUrl",
	"test/toUrl",
	"test/contextRequire",
	"test/explicitDefine",
	"test/pathsConfig",
	"test/packagesConfig"
], {});
