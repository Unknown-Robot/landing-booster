import ansiEscapes from "ansi-escapes";
import chalk from "chalk";

/* Get file name extension */
export const getExtension = (filename) => {
    let format = filename.split(".");
    return format[format.length - 1];
}

/* Sanitize path to Windows format */
export const sanitizePathEntry = (path) => {
    return path.replace("/", "\\").replace("\/", "\\");
}

/* Sort folder to first */
export const sortDirectory = (files) => {
    return files.sort((a, b) => {
        return a.isDirectory() < b.isDirectory()? 1: -1;
    });
}

/* Convert bytes format to string */
export const formatBytes = (bytes, decimals = 2) => {
    if(bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = (decimals < 0)? 0: decimals;
    const sizes = ["Bytes", "Kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/* Logger */
export const log = (message, type = "normal", splitter = "") => {
    const types = {
        "normal": chalk.white.bold,
        "valid": chalk.green.bold,
        "error": chalk.red.bold,
        "output": chalk.yellow
    }
    if(splitter.length) {
        let split = message.split(splitter);
        return console.log(`  ${types["normal"](split[0])}${splitter}${types[type](split[1])}`);
    }

    return console.log(`  ${types[type](message)}`);
}

/* Clear last sdtout line */
export const clean = () => {
    process.stdout.write(ansiEscapes.cursorPrevLine);
    process.stdout.write(ansiEscapes.eraseEndLine);
}