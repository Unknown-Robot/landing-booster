import webp from "./webp-in-css/plugin.js";
import autoprefixer from "autoprefixer";

export default {
    plugins: [
        webp(),
        autoprefixer()
    ]
}