import { rm, access, readFile, writeFile, readdir, mkdir, stat } from "fs/promises";
import { isBinaryFile } from "isbinaryfile";
import ansiEscapes from "ansi-escapes";
import path, { resolve } from "path";
import probe from "probe-image-size";
import inquirer from "inquirer";
import { constants } from "fs";
import moment from "moment";

import { formatBytes, getExtension, sortDirectory, log, clean } from "./utils/helpers.js";
import transformPurgecss from "./scripts/purgecss.js";
import transformPostcss from "./scripts/postcss.js";
import transformBabel from "./scripts/babel.js";
import transformSharp from "./scripts/sharp.js";
import transformWebp from "./scripts/webp.js";
import transformCSSO from "./scripts/csso.js";
import model from "./config.js";

/* 
    TODO: 
        - Test path system for Unix OS
        - Add ignore files system (Maybe glob pattern)
        
*/

/* OS Path folder script execution */
const __dirname = resolve();

/* Main app entry */
const main = async () => {
    let start = 0;
    let config = null;
    let polyfill = null;
    let landingPath = null;
    let landingBuildPath = null;
    let landingSize = 0;
    let landingBuildSize = 0;
    let sourceImgSize = 0;
    let buildWebpSize = 0;
    let scripts = [];
    let output = [];

    /* Loader */
    const character = ["⠻", "⠽", "⠾", "⠷", "⠯", "⠟"];
    let increment = 0;
    let loader = null;

    const createLoader = (message) => {
        log(message);
        return setInterval(() => {
            clean();
            log(`${message} ${character[increment++]}`);
            increment %= character.length;
        }, 150);
    }

    try {
        /* Try to read config.json */
        const data = await readFile(path.join(__dirname, "config.json"), "utf-8");
        /* Try to parse file data */
        config = JSON.parse(data);
    }
    catch(error) {
        /* If catch any error, use config default model in config.js */
        config = model;
    }

    try {
        /* Try to read webp-in-css/polyfill.js */
        const data = await readFile(path.join(__dirname, "webp-in-css", "polyfill.js"), "utf-8");
        if(!data || !data.length) throw(new Error());
        polyfill = data;
    }
    catch(error) {
        throw(new Error(`Cannot access file "webp-in-css/polyfill.js", please use command : git reset --hard`));
    }

    /* Remove specify path to history["path"] */
    const removePath = (path) => {
        const index = config["history"]["path"].findIndex((value) => value == path);
        if(index !== -1) {
            config["history"]["path"].splice(index, 1);
        }
    }

    /* Console steps */
    const steps = [
        {
            type: "list",
            message: "Select landing folder path :",
            name: "path",
            choices: ["Insert new path", ...config["history"]["path"]]
        },
        {
            type: "checkbox",
            name: "script",
            message: "Select booster script :",
            choices: config["scripts"].map((x) => x["description"]),
            default() {
                return config["scripts"].map((x) => x["description"]);
            },
            validate(result) {
                if(!result || !result.length) {
                    return "Select a minimum of one script.";
                }
                return true;
            }
        }
    ];

    try {
        /* Perform landing booster process */
        const landingProcess = await inquirer.prompt(steps);
        /* Create new landing folder path */
        if(landingProcess["path"] === "Insert new path") {
            /* New folder path input */
            let addProcess = await inquirer.prompt({
                type: "input",
                name: "new_path",
                message: "Insert new landing folder path :",
                validate: async(value) => {
                    try {
                        if(!value || !value.length) {
                            return "Please enter a valid landing folder path";
                        }
                        await access(value, constants.R_OK | constants.W_OK);
                        return true;
                    }
                    catch(error) {
                        return "Cannot access landing folder, please check your path";
                    }
                }
            });
            landingPath = addProcess["new_path"];
        }
        else {
            landingPath = landingProcess["path"];
        }
        /* Check if landing folder exist */
        await access(landingPath, constants.R_OK | constants.W_OK);
        /* Remove path if exist in config.json */
        removePath(landingPath);
        /* Push path to top array in config.json */
        config["history"]["path"].unshift(landingPath);
        /* Get user selected scripts */
        scripts = landingProcess["script"].map((value) => {
            const script = config["scripts"].find((script) => script["description"] === value);
            return script["command"];
        });
        /* Set landing build path */
        landingBuildPath = path.join(landingPath, "build");
        /* Remove landing build folder if already exist */
        try {
            await access(landingBuildPath, constants.R_OK | constants.W_OK);
            await rm(landingBuildPath, { recursive: true, force: true });
        }
        catch(error) {}
        /* Hide console cursor */
        process.stderr.write(ansiEscapes.cursorHide);
        /* Create loader optimize loading */
        loader = createLoader(`Run booster script`);
        /* Set start timestamp process */
        start = moment().unix();
        /* Perform all booster script */
        const tranformFiles = async(folder, build) => {
            const files = sortDirectory(await readdir(folder, { encoding: "utf8", withFileTypes: true }));
            /* Create build directory */
            await mkdir(build, { recursive: true, mode: "0755" });
            /* Create webp images directory */
            if(scripts.includes("sharp") && folder === path.join(landingPath, "images")) {
                await mkdir(path.join(build, "webp"), { recursive: true, mode: "0755" });
            }
            /* Browse directory contents */
            for(let i = 0; i < files.length; i++) {
                let file = files[i];
                let sourcePath = path.join(folder, file.name);
                let buildPath = path.join(build, file.name);
                if(file.isFile()) {
                    /* Check if file data is binary */
                    let binary = await isBinaryFile(sourcePath);
                    /* Get file size in bytes */
                    let sourceStat = await stat(sourcePath);
                    /* Get file type extension */
                    let format = getExtension(file.name);
                    /* Copy file binary data */
                    if(binary) {
                        /* Read file binary data */
                        let source = await readFile(sourcePath, "binary");
                        /* Transform images with sharp */
                        if(scripts.includes("sharp") && ["png", "jpg", "jpeg"].includes(format) && folder.includes(path.join(landingPath, "images"))) {
                            output.push(`Sharp : ${sourcePath}`);
                            const webpPath = path.join(landingBuildPath, "images", "webp", file.name.replace(format, "webp"));
                            await transformSharp(sourcePath, webpPath);
                            const webpStat = await stat(webpPath);
                            sourceImgSize += sourceStat.size;
                            buildWebpSize += webpStat.size;
                        }
                        output.push(`Copy binary file : ${sourcePath}`);
                        /* Write file binary data in build folder */
                        await writeFile(buildPath, source, "binary");
                    }
                    /* Copy file data */
                    else {
                        /* Read file data */
                        let source = await readFile(sourcePath, "utf8");
                        /* Transform source with @babel/core */
                        if(scripts.includes("babel") && ["php", "html", "js"].includes(format)) {
                            output.push(`Babel file : ${sourcePath}`);
                            source = await transformBabel(source, format);
                        }
                        /* Transform source with purgecss */
                        if(scripts.includes("purgecss") && ["php", "html", "css"].includes(format)) {
                            output.push(`Purgecss file : ${sourcePath}`);
                            source = await transformPurgecss(source, format, landingPath);
                        }
                        if(scripts.includes("postcss")) {
                            /* Transform source with postcss */
                            if(["php", "html"].includes(format) && landingPath === folder.replace(`\/${file.name}`, "")
                            || ["css"].includes(format) && folder.includes(path.join(landingPath, "css"))) {
                                output.push(`Postcss file : ${sourcePath}`);
                                source = await transformPostcss(source, format);
                            }
                            /* Transform source HTML img to picture */
                            if(["php", "html"].includes(format) && landingPath === folder.replace(`\/${file.name}`, "")) {
                                output.push(`Webp file : ${sourcePath}`);
                                source = await transformWebp(source, format, polyfill);
                            }
                        }
                        /* Transform source with CSSO */
                        if(scripts.includes("csso") && ["php", "html", "css"].includes(format)) {
                            output.push(`CSSO file : ${sourcePath}`);
                            source = await transformCSSO(source, format);
                        }
                        /* Write file data in build folder */
                        await writeFile(buildPath, source, "utf8");
                    }
                    /* Get file size in landing and build directory */
                    const buildStat = await stat(buildPath);
                    landingBuildSize += buildStat.size;
                    landingSize += sourceStat.size;
                }
                else if(file.isDirectory() && !["build"].includes(file.name)) {
                    await tranformFiles(sourcePath, buildPath);
                }
            }
        }

        await tranformFiles(landingPath, landingBuildPath);
        clearTimeout(loader);
        clean();
        log(`Run booster script ✔`, "valid");
    }
    catch(error) {
        if(error.code === "ENOENT") {
            log("Cannot access landing folder, please check your path.", "error");
            /* Remove broken path if exist in history */
            removePath(landingPath);
            landingPath = null;
        }
        clearTimeout(loader);
        clean();
        log(`Run booster script ✖`, "error");
        console.error(error);
    }
    finally {
        clearInterval(loader);
        /* Write perform landing history in config.json */
        await writeFile(path.join(__dirname, "config.json"), JSON.stringify(config, null, 4), "utf-8");
        /* Write sdtout and sdterr output in log file */
        await writeFile(path.join(__dirname, "output.json"), JSON.stringify(output, null, 4), "utf-8");
        if(landingPath) {
            /* Show total size saved between source and build */
            log(`Document size saved : ${formatBytes(landingSize - landingBuildSize)}`);
            if(scripts.includes("sharp")) {
                log(`Webp size saved : ${formatBytes(sourceImgSize - buildWebpSize)}`);
            }
            /* Show duration time */
            if(start > 0) {
                log(`Duration : ${moment().unix() - start} seconds`);
            }
            /* Show console cursor */
            process.stderr.write(ansiEscapes.cursorShow);
            /* Jump line */
            console.log("");
            /* Restart landing booster */
            let restartProcess = await inquirer.prompt({
                type: "input",
                name: "retry",
                message: "Need start again [Y/n] ?",
                default() {
                    return "yes";
                }
            });
            /* Restart after user say yes */
            if(restartProcess["retry"].includes("yes") || restartProcess["retry"].toLowerCase() === "y") {
                /* Jump line */
                console.log("");
                return await main();
            }
        }
        /* Restart after cannot access landing path */
        else {
            return await main();
        }
        
        /* Jump line */
        console.log("");
        /* Notify user need verify transformed images in landing */
        if(scripts.includes("sharp")) {
            log(`Warning : You need verify that all transformed images are correctly displayed in landing. All transformed images have been wrapped in a <picture> tag to ensure cross browser compatibility. Example if the image size was based on the parent originally = broken CSS`, "output");
        }
        log(`Warning : There is always a possibility of javascript error after transformation, sometimes it is necessary to add new babel plugins to support some javascript functions.`, "output");
        log(`Warning : Please always test your landing before transfer to production.`, "output");
        /* Show console cursor */
        process.stderr.write(ansiEscapes.cursorShow);
        process.exit(0);
    }
}

console.clear();
log("\n  Start landing booster 🚀");
main();