module.exports =
	Application:
		defaultPort: 3000
		defaultLang: "en-us"
		defaultCharset: "UTF-8"
		timeFormat: "LLLL"
		modulesPath: "/modules"
		publicPath: "/public"
		viewPath: "/views"
		viewEngine: "jade"
		techContact: "Technical Administrator"
		techContactEmail: "dev@example.com"
		adminModule: "admin"
	Experiment:
		experimentName: "A JDM Experiment"
		modules: ["consent","inventory", "jdm", "debriefing"]
		primaryInvestigator: "Primary Investigator"
		primaryInvestigatorEmail: "pi@example.com"