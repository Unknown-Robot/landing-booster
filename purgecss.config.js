export default {
    content: [
        "**/*.html",
        "**/*.php",
        "**/*.js"
    ],
    css: [
        "**/*.css",
    ],
    skippedContentGlobs: [
        "node_modules/**",
        "build/**"
    ],
    output: "build/",
    keyframes: true,
    fontFace: true,
    rejected: true,
    stdout: true,
    stdin: true
}