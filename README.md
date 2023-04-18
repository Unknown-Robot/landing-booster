# landing-booster 🚀

Node-js program designed to optimize dev landing pages and make Google robot happy.

## Table of contents
1.  [Setup](#setup)
    1.  [Environment](#environment)
    2.  [Download](#download)
    3.  [Installation](#installation)
    4.  [First use](#start)
    5.  [Configuration](#configuration)
2.  [Features](#features)
    1.  [babel](#babel)
    2.  [postcss](#postcss)
    3.  [webp](#webp)
    4.  [purgecss](#purgecss)
    5.  [CSSO](#CSSO)
    6.  [sharp](#sharp)
3.  [Licence](#licence)

## [Setup](#setup)
<a name="setup"></a>

### [Environment](#environment)
<a name="environment"></a>

First you need install Node.js, download [here](<https://nodejs.org/en/download/>) (choose latest LTS or Current version) and follow installation steps :<br>
- Welcome to the Node.js Setup Wizard :
    - Select <kbd>Next</kbd>.
- End-User License Agreement (EULA) :
    - Check I accept the terms in the License Agreement.
    - Select <kbd>Next</kbd>.
- Destination Folder :
    - Select <kbd>Next</kbd>.
- Custom Setup :
    - Select <kbd>Next</kbd>.
- Ready to install Node.js :
    - Note : This step requires Administrator privlidges.
    - Select <kbd>Install</kbd>.
- Installing Node.js :
    - Let the installer run to completion.
- Completed the Node.js Setup Wizard :
    - Click <kbd>Finish</kbd>.

After installation you need check Node.js and NPM installation, use command :
```sh
node -v && npm -v
```

You should see output like this :
```sh
v15.5.1
7.18.1
```

### [Download](#download)
<a name="download"></a>

To download booster tool, use command : 
```sh
git clone https://github.com/Unknown-Robot/landing-booster.git
```
Navigate to project installation folder :
```sh
cd landing-booster
```
You should see output like this :
```sh
C:\\Users\\USERNAME\\Document\\Github\\landing-booster>
```

If you don't use Github you can download the project directly with "Download ZIP" from the repository.<br>
Unzip downloaded folder and navigate to project installation folder :
```sh
cd C:\\Users\\USERNAME\\Download\\landing-booster
```
You should see output like this :
```sh
C:\\Users\\USERNAME\\Download\\landing-booster>
```

### [Installation](#installation)
<a name="installation"></a>

To install booster tool and dependencies, simply use command :
```sh
npm install
```

### [First use](#start)
<a name="start"></a>

After installation, to start booster tool use command :
```sh
npm start
```

You should see output like this :
```sh
Start landing booster 🚀
? Select landing path : (Use arrow keys)
> Insert new path
```

Insert new path is your only choice, you will need to specify a new landing path.<br>
Push <kbd>enter</kbd> to select choice.<br>

Now select all booster script with <kbd>a</kbd> and push <kbd>enter</kbd> to proceed :
```sh
Start landing booster 🚀
? Select landing path : Insert new path
? Select booster script : (Press <space> to select, <a> to toggle all, ...
❯◉ Babel (Transform code for old browser, remove unused code, minify code)
 ◉ Postcss (Transform background CSS rules)
 ◉ Purgecss (Remove unused CSS rules)
 ◉ Webp (HTML <img> to <picture>)
 ◉ CSSO (Minify CSS rules)
 ◉ Sharp (Images conversion WebP)
```

Each new path and script executed is stored in "config.json" for next use.<br>
Paste new landing path and push <kbd>enter</kbd> to proceed :
```sh
Start landing booster 🚀
? Select landing path : Insert new path
? Select booster script : Babel ...
? Insert new landing path : C:\\Wamp\\www\\fen\\lan\\57
```

Perfect you have optimised your first landing !
```sh
...
Run booster script ✔
Document size saved : 206.6 Kb
Webp size saved : 3.67 Mb
Duration : 5 seconds

? Need start again [Y/n] ?
```
Now you can just push <kbd>enter</kbd> to restart program (Yes by default) or close tool with <kbd>CTR-C</kbd> or <kbd>CTR-Z</kbd>.

### [Configuration](#configuration)
<a name="configuration"></a>

Need [ignore](https://babeljs.io/docs/en/options#ignore) folder or file, add your path selector in array of the "ignore" key in "config.json".<br>
Need script sdtout in console, change value of the "output" key in "config.json" (current configuration) or directly in [config.js](config.js) (configuration model).<br>
In any case, the last one script sdtout execution is available in "output.json" file.<br>

This is not recommended but if you want to change the behaviour or have problems you can change the configuration of the scripts used, see :
  - [babel](https://babeljs.io/docs/en/options) : [babel.config.js](babel.config.js)
  - [purgecss](https://purgecss.com/configuration.html) : [purgecss.config.js](purgecss.config.js)
  - [postcss](https://github.com/postcss/postcss) : [postcss.config.js](postcss.config.js)

## [Features](#features)
<a name="features"></a>
Once landing optimisation is done, you can see a build folder at the root of landing.<br>
This folder contains all the work done by the tool.<br>

### [babel](#babel)
<a name="babel"></a>
In tool Babel [script](scripts/babel.js) is used to convert code for old browser, remove unused, minify code from inline script or Javascript files.<br>
Babel script work with all Javascript files and inline script in all documents of types (HTML, PHP).<br>
Browser targets is specified with "targets" object in [babel.config.js](babel.config.js).<br>
By default the browser targets are IE version >= 11 and 2 latest version for other browser.<br>
Need change browser targets see [documentation](https://babeljs.io/docs/en/babel-preset-env#targets).<br>

### [postcss](#postcss)
<a name="postcss"></a>
In tool Postcss [script](scripts/postcss.js) is used to transform all rules from inline style and CSS files.<br>
Postcss script work with all CSS files in /css folder and inline style in all documents of types (HTML, PHP) contains at the root of landing.<br>
The script inject [polyfill](webp-in-css/polyfill.js) in header, used to check if the browser is compatible with the .webp format.<br>
All background and background-image CSS rules, will be converted by postcss with [plugin](webp-in-css/plugin.js).<br>

Before conversion :
```css
header {
    background-image: url(./images/background.jpeg);
    background-position-x: -150px;
    background-size: cover;
}
```
After conversion :
```css
header {
    background-position-x: -150px;
    background-size: cover;
}

html.no-js header, html.no-webp header {
    background-image: url(images/background.jpeg);
}

html.webp header {
    background-image: url(images/background.webp);
}
```

### [webp](#webp)
<a name="webp"></a>
In tool Webp [script](scripts/webp.js) is used to transform all HTML <kbd>img</kbd> element to <kbd>picture</kbd>.<br>
Webp script work with all documents (HTML, PHP) contains at the root of landing.<br>
All HTML <kbd>img</kbd> element, will be converted to <kbd>picture</kbd> to ensure cross-browser compatibility.

Before conversion :
```html
<img src="images/logo.png" alt="img"/>
```
After conversion :
```html
<picture>
    <source srcset="images/logo.webp" type="image/webp">
    <source srcset="images/logo.png" type="image/png">
    <img data-transform type="image/png" src="images/logo.png" alt="img"/>
</picture>
```

### [purgecss](#purgecss)
<a name="purgecss"></a>
In tool Purgecss [script](scripts/purgecss.js) is used to remove unused rules from inline style and CSS files.<br>
Purgecss script work with all CSS files and inline style in all documents of types (HTML, PHP).<br>

### [CSSO](#CSSO)
<a name="CSSO"></a>
In tool CSSO [script](scripts/csso.js) is used to minify all rules from inline style or CSS files.<br>
CSSO script work with all CSS files and inline script in all documents of types (HTML, PHP).<br>

### [sharp](#sharp)
<a name="sharp"></a>
In tool Sharp [script](scripts/sharp.js) is used to transform all images of types (PNG, JPG, JPEG) to format .webp.<br>
Sharp script work with all images in /images folder contains at the root of landing.<br>

## [Licence](#licence)
<a name="licence"></a>
Copyright (c) 2021 Unknown-Robot Licensed under the MIT license.