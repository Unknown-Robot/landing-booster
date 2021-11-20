import { rm, access, readFile, writeFile, readdir, stat } from "fs/promises";
import ansiEscapes from "ansi-escapes";
import { exec } from "child_process";
import model from "./config.cjs";
import inquirer from "inquirer";
import { constants } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import util from "util";

/* Transform exec function to promise */
const pipe = util.promisify(exec);

/* OS Path folder script execution */
const __dirname = resolve();
const __bin = `${__dirname}\\node_modules\\.bin`;

/* Convert bytes to  */
function formatBytes(bytes, decimals = 2) {
    if(bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = (decimals < 0)? 0: decimals;
    const sizes = ["Bytes", "Ko", "Mo", "Go", "To", "Po", "Eo", "Zo", "Yo"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
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

/* Main entry app */
const main = async () => {
    let execution = 0;
    let config = null;
    let landingPath = null;
    let scriptOutput = [];

    /* Sharp output */
    let sharpCommands = [];
    let sharpOutput = [];
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
        /* If catch any error, config is default model from config.cjs */
        config = model;
    }

    const find = (data, key, value) => {
        for(let i = 0; i < data.length; i++) {
            if(data[i][key] == value) {
                return data[i];
            }
        }
        return null;
    }

    const folderSize = async(path) => {
        let size = 0;
        const files = await readdir(path, { encoding: "utf8", withFileTypes: true });
        for(let i = 0; i < files.length; i++) {
            let file = files[i];
            if(file.isFile()) {
                let source = path + `\\${file.name}`;
                let sourceSize = await stat(source);
                size = size + sourceSize.size;
            }
            else if(file.name != "build") {
                size = size + await folderSize(path + "\\" + file.name);
            }
        }
        return size;
    }

    /* Booster process */
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

    const sanitizePath = (path) => {
        return path.replace("/", "\\").replace("\/", "\\");
    }

    try {
        /* Perform landing booster process */
        let landingProcess = await inquirer.prompt(steps);
        /* Create new landing folder path */
        if(landingProcess["path"] === "Insert new path") {
            let addProcess = await inquirer.prompt({
                type: "input",
                name: "new_path",
                message: "Insert new landing folder path :",
                validate(value) {
                    const pass = sanitizePath(value).match(/[a-zA-z]{1}:\\(?:[^\\/:*?"<>|\n]+\\*)*/i);
                    if(value.length && pass) return true;
                    return "Please enter a valid landing folder path";
                }
            });
            landingPath = addProcess["new_path"];
        }
        /* Find text path, inquirer return index select in choices */
        else {
            landingPath = landingProcess["path"];
        }
        /* Test if landing path exist now */
        await access(landingPath, constants.R_OK | constants.W_OK);
        /* Update path if not exist in config.json */
        if(!config["history"]["path"].includes(landingPath)) {
            /* Push path to top array in config.json */
            config["history"]["path"].unshift(landingPath);
        }
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
                    command = `${__bin}\\babel "${landingPath}" --out-dir "${landingBuildPath}" --copy-files --config-file ./babel.config.json --ignore ${config["ignore"].join(",")}`;
                }
                if(script.substr(script.length - 3) === "css") {
                    /* Check if css folder exist in build folder */
                    await access(landingBuildPath + "\\css", constants.R_OK | constants.W_OK);
                    if(script === "purgecss") {
                        command = `${__bin}\\purgecss --css "${landingBuildPath + "\\**\\//*.css"}" --content "${landingBuildPath + "\\**\\*.html"}" "${landingBuildPath + "\\**\\*.php"}" "${landingBuildPath + "\\**\\*.js"}" --output "${landingBuildPath + "\\css"}" --config ./purgecss.config.cjs`;
                    }
                    if(script === "postcss") {
                        command = `${__bin}\\postcss "${landingBuildPath + "\\css"}" --dir "${landingBuildPath + "\\css"}" --config ./postcss.config.cjs`;
                    }
                }
                if(script === "sharp") {
                    /* Convert all images to Webp */
                    const transformFolder = async(path) => {
                        const files = await readdir(path, { encoding: "utf8", withFileTypes: true });
                        for(let i = 0; i < files.length; i++) {
                            let file = files[i];
                            if(file.isFile()) {
                                let source = path + `\\${file.name}`;
                                let output = path + `\\${file.name.split(".")[0]}.webp`;
                                let cmd = `${__bin}\\sharp --input "${source}" --output "${output}"`;
                                await pipe(cmd);
                                let sourceSize = await stat(source);
                                let outputSize = await stat(output);
                                sharpSaved = sharpSaved + (sourceSize.size - outputSize.size);
                                sharpCommands.push(cmd);
                                sharpOutput.push(`Found ${file.name} [${formatBytes(sourceSize.size)}] transform to .webp [${formatBytes(outputSize.size)}]`);
                                await rm(source);
                            }
                            else {
                                await transformFolder(path + "\\" + file.name);
                            }
                        }
                    }
                    await transformFolder(landingBuildPath + "\\images");
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
                    scriptOutput.push({ "script": script, "command": command, "sdtout": (lines.length)? lines: "", "stderr": (processus.stderr)? processus.stderr: "" });
                }
                else if(script === "sharp") {
                    let str = `Total size saved [${formatBytes(sharpSaved)}] !`;
                    if(config["output"] === true) {
                        for(let w = 0; w < sharpOutput.length; w++) {
                            log(`  ${sharpOutput[w]}`, "output");
                        }
                        log(`  ${str}`, "output");
                    }
                    sharpOutput.push(str);
                    scriptOutput.push({ "script": script, "command": sharpCommands, "sdtout": sharpOutput, "stderr": "" });
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
                    scriptOutput.push({ "script": script, "command": command, "sdtout": (error.stdout)? error.stdout: "", "stderr": error.stderr });
                }
                else if(error.message) {
                    let errors = error.message.split("\n");
                    for(let w = 0; w < errors.length; w++) {
                        if(w === 0) log(`  Error : ${errors[w]}`, "error");
                        else log(`  ${errors[w]}`, "error");
                    }
                    scriptOutput.push({ "script": script, "command": (command)? command: (script === "sharp")? sharpCommands: "", "sdtout": (error.stdout)? error.stdout: "", "stderr": error.message });
                }
                /* console.error(error); */
            }
        }
    }
    catch(error) {
        if(error.code === "ENOENT") {
            log("Cannot access landing folder, please check your folder path.", "error");
            /* Remove broken path in history if exist */
            for(let i = 0; i < config["history"]["path"].length; i++) {
                if(config["history"]["path"][i] == landingPath) {
                    config["history"]["path"].splice(i, 1);
                }
            }
        }
        /* console.error(error); */
    }
    finally {
        clearInterval(loader);
        /* Show console cursor */
        process.stderr.write(ansiEscapes.cursorShow);
        /* Write perform landing history in config.json */
        await writeFile(__dirname + "\\config.json", JSON.stringify(config, null, 4), "utf-8");
        /* Write sdtout and sdterr output in log file */
        await writeFile(__dirname + "\\output.json", JSON.stringify(scriptOutput, null, 4), "utf-8");
        /* Show execution time */
        let elapsed = Math.floor(Date.now() / 1000) - execution;
        if(execution > 0) {
            log(`Execution time : ${elapsed} seconds !`, (elapsed <= 25)? "valid": (elapsed <= 50)? "output": "error", " : ");
        }
        /* Show total size saved */
        let sourceSize = await folderSize(landingPath);
        let buildSize = await folderSize(landingPath + "\\build");
        log(`Total size saved : ${formatBytes(sourceSize - buildSize)}`);
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
        if(restartProcess["retry"].includes("yes") || restartProcess["retry"] === "y") {
            return await main();
        }
        /* Jump line */
        console.log("");
        /* Notify user need update images path in the landing source code */
        if(config["history"]["script"].includes("sharp")) {
            log(`Warning : If you want use optimized images, you need update filename path in the landing source code.`, "output");
        }
        log(`Warning : There is always a possibility of javascript error after transformation, sometimes it is necessary to add babel plugins to support some javascript functions.`, "output");
        log(`Warning : Please always check your landing before production.`, "output");
    }
};

console.clear();
log("\n  Start landing booster..");
main();