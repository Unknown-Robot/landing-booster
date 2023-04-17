export default {
    minified: true,
    comments: false,
    sourceMaps: false,
    plugins: ["minify-dead-code-elimination"],
    presets: [
        ["@babel/preset-env", {
            debug: false,
            modules: false,
            targets: {
                browsers: [ "last 2 version", "ie >= 11" ]
            }
        }]
    ]
}