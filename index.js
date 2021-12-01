import { rm, access, readFile, writeFile, readdir, stat } from "fs/promises";
import ansiEscapes from "ansi-escapes";
import { exec } from "child_process";
import probe from "probe-image-size";
import model from "./config.cjs";
import inquirer from "inquirer";
import { constants } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import util from "util";
import url from "url";

/* 
    TODO: 
        - Fix empty sdtout for purgecss and postcss
        - Update path system for Unix OS now work only Windows OS
        - Add file extension list in config.json to custom purgecss content 
        
*/

/* Transform exec function to promise */
const pipe = util.promisify(exec);

/* OS Path folder script execution */
const __dirname = resolve();
const __bin = `${__dirname}\\node_modules\\.bin`;

/* Convert bytes format to string */
const formatBytes = (bytes, decimals = 2) => {
    if(bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = (decimals < 0)? 0: decimals;
    const sizes = ["Bytes", "Kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/* Get file name extension */
const getExtension = (filename) => {
    let format = filename.split(".");
    return format[format.length - 1];
}

/* Logger */
const log = (message, type = "normal", splitter = "") => {
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
const clean = () => {
    process.stdout.write(ansiEscapes.cursorPrevLine);
    process.stdout.write(ansiEscapes.eraseEndLine);
}

/* Main app entry */
const main = async () => {
    let execution = 0;
    let config = null;
    let polyfill = null;
    let landingPath = null;
    let scriptOutput = [];

    /* Sharp output */
    let sharpCommands = [];
    let sharpOutput = [];
    let sharpImages = [];
    let sharpSaved = 0;

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
        }, 250);
    };

    try {
        /* Try to read config.json */
        let data = await readFile(__dirname + "\\config.json", "utf-8");
        /* Try to parse file data */
        config = JSON.parse(data);
    }
    catch(error) {
        /* If catch any error, config default model in config.cjs */
        config = model;
    }

    try {
        /* Try to read webp-in-css/polyfill.js */
        let data = await readFile(__dirname + "\\webp-in-css\\polyfill.js", "utf-8");
        polyfill = (data && data.length)? data: "";
    }
    catch(error) {
        if(error.code === "ENOENT") {
            throw(new Error(`Cannot access file "webp-in-css/polyfill.js", please rebase landing-booster repository to master.`));
        }
    }

    /* Find item in array object from key == value */
    const find = (data, key, value) => {
        for(let i = 0; i < data.length; i++) {
            if(data[i][key] == value) {
                return data[i];
            }
        }
        return null;
    }

    /* Convert Unix timestamp to Date string */
    const convertDate = (timestamp) => {
        const format = (number) => (number <= 9)? `0${number}`: number; 
        let date = new Date(timestamp * 1000),
            day = format(date.getDate()),
            month = format(date.getMonth()),
            year = date.getFullYear(),
            hours = format(date.getHours()),
            minutes = format(date.getMinutes()),
            seconds = format(date.getSeconds());
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }

    /* Get folder Bytes size from path */
    const folderSize = async(path, exclude = false) => {
        let size = 0;
        const files = await readdir(path, { encoding: "utf8", withFileTypes: true });
        for(let i = 0; i < files.length; i++) {
            let file = files[i];
            if(file.isFile()) {
                /* Exclude all original images */
                if(exclude) {
                    let format = getExtension(file["name"]);
                    if(["png", "jpg", "jpeg", "gif"].includes(format)) {
                        continue;
                    }
                }
                let source = path + `\\${file.name}`;
                let sourceSize = await stat(source);
                size = size + sourceSize.size;
            }
            else if(file.name != "build") {
                size = size + await folderSize(path + "\\" + file.name, exclude);
            }
        }
        return size;
    }

    /* Remove specify path to history["path"] */
    const removePath = (path) => {
        for(let i = 0; i < config["history"]["path"].length; i++) {
            if(config["history"]["path"][i] == path) {
                config["history"]["path"].splice(i, 1);
            }
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
                let def = [];
                for(let i = 0; i < config["history"]["script"].length; i++) {
                    let value = find(config["scripts"], "command", config["history"]["script"][i]);
                    if(value) def.push(value["description"]);
                }
                return def;
            },
            validate(result) {
                if(!result || !result.length || !result.includes(find(config["scripts"], "command", "babel")["description"])) {
                    return "babel is required.";
                }
                return true;
            }
        }
    ];

    /* Sanitize path to Windows format */
    const sanitizePathEntry = (path) => {
        return path.replace("/", "\\").replace("\/", "\\");
    }

    try {
        /* Perform landing booster process */
        let landingProcess = await inquirer.prompt(steps);
        /* Create new landing folder path */
        if(landingProcess["path"] === "Insert new path") {
            /* New folder path input */
            let addProcess = await inquirer.prompt({
                type: "input",
                name: "new_path",
                message: "Insert new landing folder path :",
                validate(value) {
                    const pass = sanitizePathEntry(value).match(/[a-zA-z]{1}:\\(?:[^\\/:*?"<>|\n]+\\*)*/i);
                    if(value.length && pass) return true;
                    return "Please enter a valid landing folder path";
                }
            });
            landingPath = addProcess["new_path"];
        }
        else {
            landingPath = landingProcess["path"];
        }
        /* Test if landing path exist now */
        await access(landingPath, constants.R_OK | constants.W_OK);
        /* Remove path if exist in config.json */
        removePath(landingPath);
        /* Push path to top array in config.json */
        config["history"]["path"].unshift(landingPath);
        /* Set landing build path */
        let landingBuildPath = landingPath + "\\build";
        /* Hide console cursor */
        process.stderr.write(ansiEscapes.cursorHide);
        /* Delete last build folder */
        try {
            await access(landingBuildPath, constants.R_OK | constants.W_OK);
            await rm(landingBuildPath, { recursive: true, force: true });
        }
        catch(error) {}

        /* Init execution timer */
        execution = Math.floor(Date.now() / 1000);
        /* Reset history script, replace with new executed script */
        config["history"]["script"] = [];
        /* Perform all booster script */
        for(let i = 0; i < landingProcess["script"].length; i++) {
            let timestamp = Math.floor(Date.now() / 1000);
            /* Remove information text */
            let script = landingProcess["script"][i].split(" ")[0].toLowerCase();
            let command = null;
            let processus = null;

            /* Create loader each script selected */
            loader = createLoader(`Run script : ${script}`);

            /* Perform script in local node_modules binary folder (Avoid global installation) */
            try {
                /* babel script is required because, for now, he is the one who copies the folders and files */
                if(script === "babel") {
                    command = `${__bin}\\babel "${landingPath}" --out-dir "${landingBuildPath}" --copy-files --config-file ./babel.config.json ${(config["ignore"].length)? `--ignore ${config["ignore"].join(",")}`: ""}`;
                }
                if(script.substr(script.length - 3) === "css") {
                    /* Check if css folder exist in build folder */
                    await access(landingBuildPath + "\\css", constants.R_OK | constants.W_OK);
                    if(script === "purgecss") {
                        command = `${__bin}\\purgecss --css "${landingBuildPath + "\\css\\*.css"}" "${landingBuildPath + "\\css\\*.min.css"}" --content "${landingBuildPath + "\\**\\*.html"}" "${landingBuildPath + "\\**\\*.php"}" "${landingBuildPath + "\\**\\*.js"}" --output "${landingBuildPath + "\\css"}" --config ./purgecss.config.cjs`;
                    }
                    if(script === "postcss") {
                        command = `${__bin}\\postcss "${landingBuildPath + "\\css\\*.css"}" --dir "${landingBuildPath + "\\css"}" --config ./postcss.config.cjs`;
                    }
                }
                if(script === "sharp") {
                    /* Convert all images contains ./images to Webp */
                    const transformFolder = async(path, folder) => {
                        const files = await readdir(path, { encoding: "utf8", withFileTypes: true });
                        for(let i = 0; i < files.length; i++) {
                            let file = files[i];
                            if(file.isFile()) {
                                let format = getExtension(file["name"]);
                                if(!["png", "jpg", "jpeg", "gif"].includes(format)) {
                                    sharpOutput.push(`Cannot convert image type [${format}], pass file : ${file.name}`);
                                    continue;
                                }
                                let webp = file["name"].replace(format, "webp");
                                let source = `${path}\\${file.name}`;
                                let output = `${path}\\${webp}`;
                                let cmd = `${__bin}\\sharp --input "${source}" --output "${output}"`;
                                await pipe(cmd);
                                let sourceFile = await stat(source);
                                let outputFile = await stat(output);
                                let sourceMeta = probe.sync(await readFile(source));
                                sharpSaved = sharpSaved + (sourceFile.size - outputFile.size);
                                sharpCommands.push(cmd);
                                sharpImages.push({
                                    "name": (folder)? `${folder}/${file.name}`: file.name,
                                    "webp": (folder)? `${folder}/${webp}`: webp,
                                    "mime": (sourceMeta)? sourceMeta.mime: null,
                                    "alt": file["name"].replace(`.${format}`, ""),
                                    "dimension": {
                                        "width": (sourceMeta)? sourceMeta.width: null,
                                        "height": (sourceMeta)? sourceMeta.height: null
                                    }
                                });
                                sharpOutput.push(`Found ${file.name} [${formatBytes(sourceFile.size)}] transform to .webp [${formatBytes(outputFile.size)}]`);
                            }
                            else {
                                await transformFolder(path + "\\" + file.name, (folder)? `${folder}/${file.name}`: file.name);
                            }
                        }
                    }
                    await transformFolder(landingBuildPath + "\\images");

                    /* Replace all images in source code to Webp */
                    const replaceFolder = async(path) => {
                        const files = await readdir(path, { encoding: "utf8", withFileTypes: true });
                        for(let i = 0; i < files.length; i++) {
                            let file = files[i];
                            if(file.isFile()) {
                                let format = getExtension(file.name);
                                if(format === "php" || format === "html") {
                                    let data = await readFile(path + "\\" + file.name, "utf8");
                                    /* Try to add polyfill script in head before CSS link */
                                    let polyfillEntry = "</title>";
                                    let polyfillScript = `<script>${polyfill}</script>`;
                                    if(data.includes(polyfillEntry)) {
                                        if(!data.includes(polyfillScript)) {
                                            data = data.replace(polyfillEntry, `${polyfillEntry}\n   ${polyfillScript}`);
                                            sharpOutput.push(`Insert Webp polyfill script in file [${file.name}] : ${polyfillEntry}`);
                                        }
                                    }
                                    /* Create <picture> from <img> to polyfill Webp format */
                                    let regex = /(<\s*img\s[^>]*?src\s*=\s*['\"][^'\"]*?['\"][^>]*?\s*>)/gm;
                                    let result = data.match(regex);
                                    if(result && result.length) {
                                        for(let w = 0; w < result.length; w++) {
                                            let element = result[w];
                                            if(element.includes("data-transform")) continue;
                                            for(let z = 0; z < sharpImages.length; z++) {
                                                let image = sharpImages[z];
                                                if(element.includes("images/" + image["name"])) {
                                                    /* Get specify attribute from HTML entity */
                                                    const getAttribute = (entity, attribute) => {
                                                        let regex = new RegExp(`${attribute}\s*=\s*['\"]([^'\"]*?)['\"]`, "gm");
                                                        return entity.match(regex);
                                                    };
                                                    /* Transform path to URL to avoid broken call in browser */
                                                    const sanitizePath = (path) => {
                                                        /* Remove script path to image path */
                                                        return url.pathToFileURL(path)["pathname"].replace(`\/${__dirname.replace(/\\/g, "\/")}\/`, "");
                                                    };
                                                    let attribute = ["data-transform"];
                                                    if(!getAttribute(element, "type")) {
                                                        attribute.push(`type="${image["mime"]}"`);
                                                    }
                                                    if(!getAttribute(element, "alt")) {
                                                        attribute.push(`alt="${image["alt"]}"`);
                                                    }
                                                    /* Broke CSS */
                                                    /* if(!getAttribute(element, "width")) {
                                                        attribute.push(`width="${image["dimension"]["width"]}"`);
                                                    }
                                                    if(!getAttribute(element, "height")) {
                                                        attribute.push(`height="${"auto"}"`); // image["dimension"]["height"]
                                                    } */
                                                    let newElement = element.replace(/<\s*img/gm, `<img ${attribute.join(" ")}`);
                                                    let replace =
                                                    `<picture>` +
                                                        `<source srcset="images/${sanitizePath(image["webp"])}" type="image/webp">` +
                                                        `<source srcset="images/${sanitizePath(image["name"])}" type="${image["mime"]}">` +
                                                        `${newElement}` +
                                                    `</picture>`;
                                                    sharpOutput.push(`Transform image [${image["name"]}] in code file [${file.name}] : ${element}`);
                                                    data = data.replace(element, replace);
                                                    result[w] = newElement;
                                                }
                                            }
                                        }
                                        await writeFile(path + "\\" + file.name, data, "utf8");
                                    }
                                }
                            }
                            else if(file.isDirectory() && file.name != "build") {
                                await replaceFolder(path + "\\" + file.name);
                            }
                        }
                    }

                    await replaceFolder(landingBuildPath);
                }

                if(command) {
                    processus = await pipe(command);
                }

                /* Update script if not exist in config.json */
                if(!config["history"]["script"].includes(script)) {
                    config["history"]["script"].push(script);
                }

                clearTimeout(loader);
                clean();
                log(`Run script : ${script} ✔`, "valid", " : ");
                
                if(processus && processus.stdout) {
                    let lines = processus.stdout.split("\n");
                    if(config["output"] === true) {
                        for(let w = 0; w < lines.length; w++) {
                            log(`  ${lines[w]}`, "output");
                        }
                    }
                    scriptOutput.push({ "script": script, "date": convertDate(timestamp), "command": command, "sdtout": (lines.length)? lines: "", "stderr": (processus.stderr)? processus.stderr: "" });
                }
                else if(script === "sharp") {
                    let str = `Total image size saved [${formatBytes(sharpSaved)}] !`;
                    if(config["output"] === true) {
                        for(let w = 0; w < sharpOutput.length; w++) {
                            log(`  ${sharpOutput[w]}`, "output");
                        }
                        log(`  ${str}`, "output");
                    }
                    sharpOutput.push(str);
                    scriptOutput.push({ "script": script, "date": convertDate(timestamp), "command": sharpCommands, "sdtout": sharpOutput, "stderr": "" });
                }
            }
            catch(error) {
                if(error.code === "ENOENT") {
                    log(`Cannot access \\css in build folder, pass ${script} script !`, "error");
                }
                clearTimeout(loader);
                clean();
                log(`Run script : ${script} ✖`, "error", " : ");
                if(error.stderr) {
                    let errors = error.stderr.split("\n");
                    for(let w = 0; w < errors.length; w++) {
                        if(w === 0) log(`  Error : ${errors[w]}`, "error");
                        else log(`  ${errors[w]}`, "error");
                    }
                    scriptOutput.push({ "script": script, "date": convertDate(timestamp), "command": command, "sdtout": (error.stdout)? error.stdout: "", "stderr": error.stderr });
                }
                else if(error.message) {
                    let errors = error.message.split("\n");
                    for(let w = 0; w < errors.length; w++) {
                        if(w === 0) log(`  Error : ${errors[w]}`, "error");
                        else log(`  ${errors[w]}`, "error");
                    }
                    scriptOutput.push({ "script": script, "date": convertDate(timestamp), "command": (command)? command: (script === "sharp")? sharpCommands: "", "sdtout": (error.stdout)? error.stdout: "", "stderr": error.message });
                }
                console.error(error);
            }
        }
    }
    catch(error) {
        if(error.code === "ENOENT") {
            log("Cannot access landing folder, please check your folder path.", "error");
            /* Remove broken path if exist in history */
            removePath(landingPath);
            landingPath = null;
        }
        /* console.error(error); */
    }
    finally {
        clearInterval(loader);
        /* Write perform landing history in config.json */
        await writeFile(__dirname + "\\config.json", JSON.stringify(config, null, 4), "utf-8");
        /* Write sdtout and sdterr output in log file */
        await writeFile(__dirname + "\\output.json", JSON.stringify(scriptOutput, null, 4), "utf-8");

        if(landingPath) {
            /* Show execution time */
            let elapsed = Math.floor(Date.now() / 1000) - execution;
            if(execution > 0) {
                log(`Execution time : ${elapsed} seconds`);
            }
            /* Show total size saved */
            let sourceSize = await folderSize(landingPath);
            let buildSize = await folderSize(landingPath + "\\build", (config["history"]["script"].includes("sharp")));
            log(`Total size saved : ${formatBytes(sourceSize - buildSize)}`);
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
            if(restartProcess["retry"].includes("yes") || restartProcess["retry"].toLowerCase() === "y") {
                /* Jump line */
                console.log("");
                return await main();
            }
        }
        else {
            /* Restart after throw cannot access landing path error */
            return await main();
        }
        
        /* Jump line */
        console.log("");
        /* Notify user need verify transformed images in landing */
        if(config["history"]["script"].includes("sharp")) {
            log(`Warning : You need verify that all transformed images are correctly displayed in landing. All transformed images have been wrapped in a <picture> tag to ensure cross browser compatibility. Example if the image size was based on the parent originally = broken CSS`, "output");
        }
        log(`Warning : There is always a possibility of javascript error after transformation, sometimes it is necessary to add new babel plugins to support some javascript functions.`, "output");
        log(`Warning : Please always check your landing before transfer to production.`, "output");
        /* Show console cursor */
        process.stderr.write(ansiEscapes.cursorShow);
    }
};

console.clear();
log("\n  Start landing booster 🚀");
main();