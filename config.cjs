/* Configuration file model */
module.exports = {
    "output": false,
    "scripts": [
        {
            "command": "babel",
            "description": "Babel (Transform code for old browser, remove unused code, minify code) [required]"
        },
        {
            "command": "purgecss",
            "description": "Purgecss (Remove unused CSS rules)"
        },
        {
            "command": "postcss",
            "description": "Postcss (Minify CSS rules)"
        },
        {
            "command": "sharp",
            "description": "Sharp (Images compression, WebP conversion)"
        }
    ],
    "history": {
        "path": [],
        "script": []
    },
    "ignore": [
        "\\**\\*.min.js",
        "\\**\\jquery*.js",
        "\\**\\bootstrap*.js",
        "\\**\\md5*.js",
        "\\**\\owl.carousel*.js",
        "\\**\\build",
        "\\**\\mask\\*",
        "\\**\\jquery-ui\\*"
    ]
};