// this is the entry point to load the backdraft loader (bdLoad) in node.js
var 
  fs= require("fs"),
  bdLoadFilename= __dirname + "/require.js",
  requireSource= fs.readFileSync(bdLoadFilename, "ascii"),
  nodeConfig= fs.readFileSync(__dirname + "/nodeConfig.js", "ascii");
eval(requireSource.replace(/\/\/\sbegin\sdefault\sbootstrap[\w\W]+$/, nodeConfig));
