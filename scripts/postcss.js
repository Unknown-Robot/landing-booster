import postcssConfig from "../postcss.config.js";
import { parse } from "node-html-parser";
import postcss from "postcss";

const transformPostcss = async(source, format) => {
    if(["php", "html"].includes(format)) {
        /* Get all inline styles in DOM */
        const DOM = parse(source);
        const styles = DOM.querySelectorAll("style");
        for(let i = 0; i < styles.length; i++) {
            let style = styles[i];
            let html = style.innerHTML;
            /* Check if HTML contains PHP */
            if(html && html.length && !html.includes("<?php")) {
                /* Transform style with postcss */
                let transformed = await postcss(postcssConfig).process(html, { from: null, to: null });
                /* Replace webp style in inline document */
                source = source.replace(html, transformed.css);
            }
        }
    }
    else if(format === "css") {
        /* Transform style with postcss */
        let transformed = await postcss(postcssConfig).process(source, { from: null, to: null });
        /* Replace webp style in document */
        source = transformed.css;
    }

    return source;
}

export default transformPostcss;