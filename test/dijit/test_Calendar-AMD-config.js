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
	deps:["test_Calendar-AMD-main"]
};
