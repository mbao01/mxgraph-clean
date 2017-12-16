var path = require("path"),
    fs = require("fs"),
    parentFolderName = path.basename(path.resolve('..')),
    mxClientContent,
    deps;
// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.io/#x15.4.4.19
(function () {
    if (!Array.prototype.map) {

        Array.prototype.map = function (callback/*, thisArg*/) {

            var T, A, k;

            if (this == null) {
                throw new TypeError('this is null or not defined');
            }

            // 1. Let O be the result of calling ToObject passing the |this|
            //    value as the argument.
            var O = Object(this);

            // 2. Let lenValue be the result of calling the Get internal
            //    method of O with the argument "length".
            // 3. Let len be ToUint32(lenValue).
            var len = O.length >>> 0;

            // 4. If IsCallable(callback) is false, throw a TypeError exception.
            // See: http://es5.github.com/#x9.11
            if (typeof callback !== 'function') {
                throw new TypeError(callback + ' is not a function');
            }

            // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
            if (arguments.length > 1) {
                T = arguments[1];
            }

            // 6. Let A be a new array created as if by the expression new Array(len)
            //    where Array is the standard built-in constructor with that name and
            //    len is the value of len.
            A = new Array(len);

            // 7. Let k be 0
            k = 0;

            // 8. Repeat, while k < len
            while (k < len) {

                var kValue, mappedValue;

                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the HasProperty internal
                //    method of O with argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                if (k in O) {

                    // i. Let kValue be the result of calling the Get internal
                    //    method of O with argument Pk.
                    kValue = O[k];

                    // ii. Let mappedValue be the result of calling the Call internal
                    //     method of callback with T as the this value and argument
                    //     list containing kValue, k, and O.
                    mappedValue = callback.call(T, kValue, k, O);

                    // iii. Call the DefineOwnProperty internal method of A with arguments
                    // Pk, Property Descriptor
                    // { Value: mappedValue,
                    //   Writable: true,
                    //   Enumerable: true,
                    //   Configurable: true },
                    // and false.

                    // In browsers that support Object.defineProperty, use the following:
                    // Object.defineProperty(A, k, {
                    //   value: mappedValue,
                    //   writable: true,
                    //   enumerable: true,
                    //   configurable: true
                    // });

                    // For best browser support, use the following:
                    A[k] = mappedValue;
                }
                // d. Increase k by 1.
                k++;
            }

            // 9. return A
            return A;
        };
    }
})();

module.exports = function (grunt) {
    // To get the dependencies for the project, read the filenames by matching
    // mxClient.include([...]) in mxClient.js. This is not perfect, but the list is
    // required in mxClient.js for compatibility.
    mxClientContent = fs.readFileSync(
        path.join(process.cwd(), "./javascript/src/js/mxClient.js"),
        "utf8"
    );
    deps = mxClientContent.match(/mxClient\.include\([^"']+["'](.*?)["']/gi).map(function (str) {
        return "." + str.match(/mxClient\.include\([^"']+["'](.*?)["']/)[1];
    });
    deps = ["./js/mxClient.js"].concat(deps.slice(0));

    grunt.initConfig({
        copy: {
            main: {
                files: [{
                    expand: true,
                    cwd: "./javascript/src",
                    src: deps,
                    dest: "./javascript/dist"
                }],
                options: {
                    // After each module, add the object to the '__mxOutput' namespace
                    // E.g. __mxOutput.mxLog, etc.
                    process: function (content, srcpath) {
                        var afterContent = "",
                            moduleName = path.basename(srcpath, ".js");

                        afterContent += "\n__mxOutput." + path.basename(srcpath, ".js") +
                            " = typeof " + moduleName + " !== 'undefined' ? " + moduleName + " : undefined;\n";

                        return content + afterContent;
                    }
                }
            }
        },
        concat: {
            dist: {
                src: deps.map(function (dep) {
                    return path.join("./javascript/dist", dep);
                }),
                dest: './javascript/dist/build.js'
            },
            options: {
                banner: "(function (root, factory) {\n" +
                "if (typeof define === 'function' && define.amd) {\n" +
                "define([], factory);\n" +
                "} else if (typeof module === 'object' && module.exports) {\n" +
                "module.exports = factory();\n" +
                "} else {\n" +
                "root.mxgraph = factory();\n" +
                "}\n" +
                "}(this, function () {\n" +
                "return function (opts) {\n" +
                // Opts will be passed into this function, expand them out as if
                // they were globals so they can get picked up by the logic in
                // mxClient.js.
                "for (var name in opts) { this[name] = opts[name]; }\n" +
                "var __mxOutput = {};\n",
                footer: "return __mxOutput;\n" +
                "};\n" +
                "}));"
            }
        },
        webpack: {
            examples: {
                entry: "./javascript/examples/webpack/src/anchors.js",
                output: {
                    path: path.resolve(process.cwd(), "./javascript/examples/webpack/dist"),
                    filename: "anchors.js"
                }
            }
        },
        watch: {
            javascripts: {
                files: "javascript/src/**/*.js",
                tasks: ["umdify"],
                options: {
                    interrupt: true
                }
            }
        },
    });

    require(parentFolderName === "node_modules" ? "load-grunt-parent-tasks" : "load-grunt-tasks")(grunt);
    grunt.registerTask("default", [
        "copy",
        "concat",
        "webpack"
    ]);
    grunt.registerTask("build", [
        "default"
    ]);
};
