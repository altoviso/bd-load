var require= {
	packages:[{
		name: 'dojo',
		location:'../../../dojotoolkit/dojo',
		main:'lib/main-browser',
		lib: '.'
	},{
		name:'dijit',
		location: '../../../dojotoolkit/dijit',
		main:'lib/main',
		lib: '.'
	}],
	paths:{
		i18n:"../../../dojotoolkit/dojo/lib/plugins/i18n",
		text:"../../../dojotoolkit/dojo/lib/plugins/text"
	},
	deps:["main"],


	build:{
		files:[
      // the loader...
      ["../../lib/require.js", "./require.js"]
    ],

    destPaths:{
      // put i18n and text in the root of the default package
    },

	  packages:[{
      // since dojo uses the "text!" and "i18n!" plugin, and these are not really in the default package tree
      // we must tell bdBuild to discover them by explicitly asking for them which will cause paths
      // to be inspected
      name:"*",
      modules:{
        i18n:1,
        text:1
      }
    },{
  		name:"dijit",
      files:["./tests/_altCalendar.html", "./tests/css/dijitTests.css"],
      trees:[
        // this is the lib tree without the svn, tests, or robot modules
        [".", ".", "*/.*", "*/dijit/tests/*", /\/robot(x)?/],
        "./tests/images"
      ]
  	},{
  		name:"dojo",
      trees:[
        // this is the lib tree without the tests, svn, plugins, or temp files
        [".", ".", "*/dojo/tests/*", /\/robot(x)?/, "*/.*", "*/dojo/lib/plugins"]
      ]
  	}],

		replacements: {
			"./calendar.html": [
        ['tests.css', "css/tests.css"],
        ["../../../dojotoolkit/dijit/themes/claro/claro.css", "css/css.css"],
        ['<script type="text/javascript" src="config.js"></script>', ""],
        ["../../../bdLoad/lib/require.js", "boot.js"]
      ]
		},

    compactCssSet:{
      "./tests.css":"./css/tests.css",
      "../../../dojotoolkit/dijit/themes/claro/claro.css":"./css/css.css"
    },

		layers:{
			main:{
				boot:"./boot.js",
        bootText:"require(['main']);\n"
			}
		},

    dojoPragmaKwArgs:{
      asynchLoader:1
    }
	}
};
