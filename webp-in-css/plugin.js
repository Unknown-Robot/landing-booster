const DEFAULT_OPTIONS = {
	rename: (oldName) => oldName.replace(/\.(jpe?g|png)/gi, ".webp").replace(/images(.*)\//, "images/webp/"),
	check: (decl) => /\.(jpe?g|png)(?!(\.webp|.*[&?]format=webp))/i.test(decl.value),
	noWebpClass: "no-webp",
	noJsClass: "no-js",
	webpClass: "webp",
	modules: false,
	addNoJs: true
}

const plugin = (opts = {}) => {
	let { modules, noWebpClass, webpClass, addNoJs, noJsClass, rename, check } = {
		...DEFAULT_OPTIONS,
		...opts
	}

	const removeBodyPrefix = (className) => {
		return className.replace(/body ?\./, "");
	}

	const addClass = (selector, className) => {
		let generatedNoJsClass;
		let initialClassName = className;
		if(className.includes("body")) {
			className = removeBodyPrefix(className);
		}
		if(modules) {
			className = `:global(.${className})`;
			generatedNoJsClass = `:global(.${noJsClass})`;
		}
		else {
			className = `.${className}`;
			generatedNoJsClass = `.${noJsClass}`;
		}
		if(selector.includes("body")) {
			selector = selector.replace(/body[^ ]*/, `$& html${className}`);
		}
		else {
			selector = `html${className} ` + selector;
		}
		if(addNoJs && initialClassName === noWebpClass) {
			selector += ", " + selector.split(`html${className}`).join(`html${generatedNoJsClass}`);
		}

		return selector;
	}

	return {
		postcssPlugin: "webp-in-css/plugin",
		Declaration(decl) {
			if(check(decl)) {
				let rule = decl.parent;
				if(rule.selector.includes(`.${removeBodyPrefix(noWebpClass)}`)) return;
				let webp = rule.cloneAfter();
				webp.each((i) => {
					if(i.prop !== decl.prop && i.value !== decl.value) {
						i.remove();
					}
				});
				webp.selectors = webp.selectors.map(i => addClass(i, webpClass));
				webp.each((i) => {
					if(rename && typeof(rename) === "function") {
						i.value = rename(i.value);
						i.prop = "background-image";
					}
				});
				let noWebp = rule.cloneAfter();
				noWebp.each((i) => {
					if(i.prop !== decl.prop && i.value !== decl.value) {
						i.remove();
					}
				});
				noWebp.selectors = noWebp.selectors.map(i => addClass(i, noWebpClass));
				noWebp.each((i) => {
					i.prop = "background-image";
				});
				rule.each((i) => {
					if(i.prop && (i.prop === "background-image" || i.prop === "background")) {
						i.remove();
					}
				});
			}
		}
	}
}

plugin.postcss = true;
export default plugin;