require.config({
	packages: [
		{name: "chai", location: "../chai", main: "chai"},
		{name: "test", location: "../../test"}
	]
});

require("smoke").options.profile.push(
	"test/basic",
	"test/inject",
	"test/baseUrl",
	"test/toUrl",
	"test/contextRequire",
	"test/explicitDefine"
);
