define(["./A1", "./A2", "./A3", "./A4"], function(A1, A2, A3, A4){
	return {
		A1: A1,
		A2: A2,
		A3: A3,
		A4: A4
	};
});

define("test/explicitDefine/A1", function(){
	return "test/explicitDefine/A1"
});

define("test/explicitDefine/A2", ["./dependentA2"], function(dependentA2){
	return {
		value: "test/explicitDefine/A2",
		dependentA2: dependentA2
	};
});

define("test/explicitDefine/A3", {value: "test/explicitDefine/A3"});

define("test/explicitDefine/A4", "test/explicitDefine/A4");