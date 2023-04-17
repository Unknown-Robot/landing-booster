import { parse } from "node-html-parser";

const transformWebp = async(source, format, polyfill) => {
    /* Get all images in DOM */
    const DOM = parse(source);
    const images = DOM.querySelectorAll("img[src*='images/']");
    if(images.length) {
        /* Inject webp polyfill inside document */
        let entry = "</head>";
        let script = `<script type="text/javascript">${polyfill}</script>`;
        if(source.includes(entry) && !source.includes(script)) {
            source = source.replace(entry, `\t${script}\n${entry}`);
        }
        /* Browse all images in DOM */
        for(let i = 0; i < images.length; i++) {
            let image = images[i];
            let src = image.getAttribute("src");
            let alt = image.getAttribute("alt");
            let type = src.split(".").pop();
            let name = src.split("/").pop();
            let html = image.outerHTML;
            /* Check if src attribute is base64 */
            if(["png", "jpg", "jpeg"].includes(type) && !src.includes("data:image/")) {
                let picture = 
                `<picture>` +
                    `<source srcset="images/webp/${encodeURI(name.replace(type, "webp"))}" type="image/webp">` +
                    `<source srcset="${encodeURI(src)}" type="image/${type}">` +
                    /* Add data-transform attribute to avoid replace duplication */
                    /* Add alt attribute if doesn't exist on original image element */
                    `${html.replace("<img", `<img data-transform ${(!alt)? `alt="${name.replace(`.${type}`, "")}"`: ""}`)}` +
                `</picture>`;
                /* Ref: https://developer.mozilla.org/en-US/docs/Glossary/Void_element */
                /* Self-closing tags (<img/>) do not exist in HTML. */
                /* If a trailing / (slash) character is present in the start tag of an HTML element, HTML parsers ignore that slash character. */
                source = source.replace(/\/>/gm, ">").replace(html, picture);
            }
        }
    }

    return source;
}

export default transformWebp;