define(["dojo", "dijit/dijit", "dijit/Calendar", "dojo/date/locale", "dojo/parser", "text!dijit/tests/_altCalendar.html"], function(dojo) {
	dojo.declare("BigCalendar", dijit.Calendar, {
		templateString: dojo.cache("dijit.tests", "_altCalendar.html"),
		isDisabledDate: dojo.date.locale.isWeekend,
		getClassForDate: function(date){
			if(!(date.getDate() % 10)){ return "blue"; } // apply special style to all days divisible by 10
		}
	});

	var bigCalendar = dojo.byId("calendar5");
	bigCalendar.setAttribute("data-dojo-type", "BigCalendar");
	dojo.parser.parse();
});

function myHandler(id,newValue){
	console.debug("onChange for id = " + id + ", value: " + newValue);
}
