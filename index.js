import { rm, access, readFile, writeFile, readdir, stat } from "fs/promises";
import { exec } from "child_process";
import inquirer from "inquirer";
import ansiEscapes from 'ansi-escapes';
import { constants } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import util from "util";
import { exit } from "process";

/* Transform exec function to promise */
const pipe = util.promisify(exec);

/* OS Path folder script execution */
const __dirname = resolve();
const __bin = `${__dirname}\\node_modules\\.bin`;

/* Convert bytes to  */
function formatBytes(bytes, decimals = 2) {
    if(bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
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
    let execution = Math.floor(Date.now() / 1000);
    let config = null;
    let landingPath = null;
    let scriptOutput = [];

    /* Sharp output */
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
        let data = await readFile(__dirname + "\\config.json", "utf-8");
        config = JSON.parse(data);
    }
    catch(error) {
        log("Missing config.json file, please download or rebase from Github repository.", "error");
        exit();
    }

    const find = (data, key, value) => {
        for(let i = 0; i < data.length; i++) {
            if(data[i][key] == value) {
                return data[i];
            }
        }
        return null;
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

            if(addProcess.hasOwnProperty("new_path")) {
                landingPath = addProcess["new_path"];
            }
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

            /* Perform script in local node_modules binary folder (Avoid install global) */
            try {
                /* babel script is required because, for now, he is the one who copies the folders and files */
                if(script === "babel") {
                    command = `${__bin}\\babel ${landingPath} --out-dir ${landingBuildPath} --copy-files --config-file ./babel.config.json --ignore ${config["ignore"].join(",")}`;
                }
                if(script.substr(script.length - 3) === "css") {
                    await access(landingBuildPath + "\\css", constants.R_OK | constants.W_OK);
                    if(script === "purgecss") {
                        command = `${__bin}\\purgecss --css "${landingBuildPath + "\\**\\//*.css"}" --content "${landingBuildPath + "\\**\\*.html"}" "${landingBuildPath + "\\**\\*.php"}" "${landingBuildPath + "\\**\\*.js"}" --output ${landingBuildPath + "\\css"} --config ./purgecss.config.cjs`;
                    }
                    if(script === "postcss") {
                        
                        command = `${__bin}\\postcss ${landingBuildPath + "\\css"} --dir ${landingBuildPath + "\\css"} --config ./postcss.config.cjs`;
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
                                await pipe(`${__bin}\\sharp --input ${source} --output ${output}`);
                                let sourceSize = await stat(source);
                                let outputSize = await stat(output);
                                sharpSaved = sharpSaved + (sourceSize.size - outputSize.size);
                                if(config["output"] === true) {
                                    sharpOutput.push(`Found ${file.name} [${formatBytes(sourceSize.size)}] transform to .webp [${formatBytes(outputSize.size)}]`);
                                }
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
                    scriptOutput.push(processus);
                }

                /* Update script if not exist in config.json */
                if(!config["history"]["script"].includes(script)) {
                    config["history"]["script"].push(script);
                }

                clearTimeout(loader);
                clean();
                log(`Run script : ${script} ✔`, "valid", " : ");
                if(config["output"] === true) {
                    if(processus && processus.stdout) {
                        let lines = processus.stdout.split("\n");
                        for(let w = 0; w < lines.length; w++) {
                            log(`  ${lines[w]}`, "output");
                        }
                    }
                    else if(script === "sharp") {
                        for(let w = 0; w < sharpOutput.length; w++) {
                            log(`  ${sharpOutput[w]}`, "output");
                        }
                        log(`  Total size saved [${formatBytes(sharpSaved)}] !`, "output");
                    }
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
                    log(`  ${error.stderr.split("\n")[0]}`, "error");
                    scriptOutput.push({ sdtout: error.stdout, stderr: error.stderr });
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
            return main();
        }
        console.error(error);
    }
    finally {
        clearInterval(loader);
        /* Show console cursor */
        process.stderr.write(ansiEscapes.cursorShow);
        /* Write perform landing history in config.json */
        await writeFile(__dirname + "\\config.json", JSON.stringify(config, null, 4), "utf-8");
        /* console.log(scriptOutput); */
        let elapsed = Math.floor(Date.now() / 1000) - execution;
        log(`Execution time : ${elapsed} seconds !`, (elapsed <= 20)? "valid": (elapsed <= 30)? "output": "error", " : ");
        /* Notify user need update images path in the landing source code */
        if(config["history"]["script"].includes("sharp")) {
            log(`\n[Warning] If you want use optimized images, you need update filename path in the landing source code.`, "output");
        }
    }
};

console.clear();
log("\n  Start landing booster..");
main();