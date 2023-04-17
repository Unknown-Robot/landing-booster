import purgecssConfig from "../purgecss.config.js";
import { parse } from "node-html-parser";
import { PurgeCSS } from "purgecss";
import path from "path";

const transformPurgecss = async(source, format, landingPath) => {
    if(["php", "html"].includes(format)) {
        /* Get all inline styles in DOM */
        const DOM = parse(source);
        const styles = DOM.querySelectorAll("style");
        for(let i = 0; i < styles.length; i++) {
            let style = styles[i];
            let html = style.innerHTML;
            /* Check if HTML contains PHP */
            if(html && html.length && !html.includes("<?php")) {
                /* Transform file with purgecss */
                let transformed = await new PurgeCSS().purge({
                    ...purgecssConfig,
                    content: purgecssConfig.content.map((value) => {
                        return path.join(landingPath, value);
                    }),
                    css: [{ raw: html }]
                });
                /* Replace unused style in document */
                source = source.replace(html, transformed[0].css);
            }
        }
    }
    else if(format === "css") {
        /* Transform file with purgecss */
        let transformed = await new PurgeCSS().purge({
            ...purgecssConfig,
            content: purgecssConfig.content.map((value) => {
                return path.join(landingPath, value);
            }),
            css: [{ raw: source }]
        });
        /* Replace unused style in document */
        source = transformed[0].css;
    }

    return source;
}

export default transformPurgecss;