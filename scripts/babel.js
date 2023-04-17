import babelConfig from "../babel.config.js";
import { parse } from "node-html-parser";
import babel from "@babel/core";

const transformBabel = async(source, format) => {
    if(["php", "html"].includes(format)) {
        /* Get all inline scripts in DOM */
        const DOM = parse(source);
        const scripts = DOM.querySelectorAll("script");
        for(let i = 0; i < scripts.length; i++) {
            let script = scripts[i];
            let html = script.innerHTML;
            let type = script.getAttribute("type");
            if(html && html.length && !html.includes("<?php") && (!type || type.includes("/javascript"))) {
                /* Transform script with @babel/core */
                let transformed = await babel.transformAsync(html, babelConfig);
                /* Replace last script with transformed script in document */
                source = source.replace(html, transformed.code);
            }
        }
    }
    else if(format === "js") {
        /* Transform script with babel-core */
        let transformed = await babel.transformAsync(source, babelConfig);
        /* Replace last script with transformed script in file */
        source = transformed.code;
        /* Copy javascript mapping (.map) in build directory */
        /* await writeFile(path.join(build, `${file.name}.map`), JSON.stringify(transformed.map), "utf8"); */
    }

    return source;
}

export default transformBabel;