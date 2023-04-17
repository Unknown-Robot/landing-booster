/* Configuration file model */
export default {
    "scripts": [
        {
            "command": "babel",
            "description": "Babel (Transform code for old browser, remove unused code, minify code)"
        },
        {
            "command": "postcss",
            "description": "Postcss (Transform background CSS rules, HTML img to picture)"
        },
        {
            "command": "purgecss",
            "description": "Purgecss (Remove unused CSS rules)"
        },
        {
            "command": "csso",
            "description": "CSSO (Minify CSS rules)"
        },
        {
            "command": "sharp",
            "description": "Sharp (Images conversion WebP)"
        }
    ],
    "history": {
        "path": []
    },
    "ignore": []
}