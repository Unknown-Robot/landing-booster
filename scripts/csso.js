import { parse } from "node-html-parser";
import { minify } from "csso";

const transformCSSO = async(source, format) => {
    if(["php", "html"].includes(format)) {
        /* Get all inline styles in DOM */
        const DOM = parse(source);
        const styles = DOM.querySelectorAll("style");
        for(let i = 0; i < styles.length; i++) {
            let style = styles[i];
            let html = style.innerHTML;
            /* Check if HTML contains PHP */
            if(html && html.length && !html.includes("<?php")) {
                /* Transform minify style with csso */
                let transformed = minify(html, { comments: false, restructure: false });
                /* Replace last style with minified style in document */
                source = source.replace(html, transformed.css);
            }
        }
    }
    else if(format === "css") {
        /* Transform minify style with csso */
        let transformed = minify(source, { comments: false, restructure: false });
        /* Replace minified style in document */
        source = transformed.css;
    }

    return source;
}

export default transformCSSO;