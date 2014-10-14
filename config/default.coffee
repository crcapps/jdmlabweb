module.exports =
	Application:
		defaultPort: 3000
		defaultLang: "en-us"
		defaultCharset: "UTF-8"
		timeFormat: "LLLL"
		publicPath: "/public"
		viewPath: "/views"
		routePath: "/routes"
		viewEngine: "jade"
		techContact: "Technical Administrator"
		techContactEmail: "dev@example.com"
		Routes:
			adminRoute: "admin"
	Experiment:
		experimentName: "A JDM Experiment"
		modules: ["consent","inventory", "jdm", "debriefing"]
		primaryInvestigator: "Primary Investigator"
		primaryInvestigatorEmail: "pi@example.com"
