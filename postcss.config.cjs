module.exports = {
    plugins: [
        require("./webp-in-css/plugin"),
        require("autoprefixer"),
        require("cssnano")({
            preset: "default",
        })
    ],
};