
var langserver = null;

exports.activate = function() {
    // Do work when the extension is activated
    langserver = new PythonLanguageServer();
}

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
    if (langserver) {
        langserver.deactivate();
        langserver = null;
    }
}

// Show a notification with the given title and body when in dev mode.
function showNotification(title, body) {
    if (nova.inDevMode()) {
        let request = new NotificationRequest("python-nova-message");
        
        request.title = nova.localize(title);
        request.body = nova.localize(body);
        nova.notifications.add(request);
    }
}


// Append the argument to the array if the condition is true
function conditionalAppendArgumentsToArray(conditional, array, arg) {
    // If the passed conditional is true
    if (conditional) {
        // If the array is empty return an array with just the passed argument.
        if (array == '') {
            return [arg];
        } else {
            // Otherwise append to the existing array and return.
            array.push(arg);
            return array;
        }
    } else {
        // If conditional is false, transparently return the passed array.
        return array;
    }
}

// Parse JSON from a string and return an JSON object.
function parseJSON(string) {
    if (string == undefined) {
        return null
    }
    return JSON.parse(String(string).trim().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'));
}

// Parse space or comma separated strings into a list
function parseSpaceSeparated(string) {
    if (string == "" || string == null)  {
        return []
    } else {
        return String(string).replace(/(^\s*,)|(,\s*$)/g, '').trim().split(/[\s,]+/);
    }
}

// Convenience function to parse preferences with workspace override and optionally return a default value.
function getPreference(string, def, workspace=false) {
    var pref;
    if (workspace) {
        pref = nova.workspace.config.get(string)
    } else {
        pref = nova.config.get(string)
    }
    if (pref == null) {
        console.log(`${string}: ${pref} is null. Returning ${def}`)
        return def
    } else {
        console.log(`${string}: ${pref}`)
        return pref
    }
}

// Convenience function to get the 'pyls.executable' preference, or default to an appropriate bin in the user's $PATH.
function getPyLSExecutablePreference() {
    return getPreference('pyls.executable', searchUsablePyLSExecutable())
}

// Try to find an appropriate bin for the PyLSP server in the user's $PATH.
function searchUsablePyLSExecutable() {
    const envPath = nova.environment['PATH']
    if (envPath === undefined) {
        return undefined
    }

    const possibleBins = ['pylsp', 'pyls']
    const possiblePaths = envPath.split(':')
    for (const bin of possibleBins) {
        for (const path of possiblePaths) {
            const binPath = path + '/' + bin
            if (nova.fs.access(binPath, nova.fs.F_OK | nova.fs.X_OK)) {
                return binPath
            }
        }
    }

    return undefined
}

// Return the appropriate settings namespace for the configured Python LSP implementation.
function getSettingsPyLSNamespace() {
    if (getPyLSExecutablePreference() === "pyls") {
        return "pyls"
    } else {
        // If the selected binary is not explicitly pyls, default to the fork
        // pylsp as it is more up to date and maintained.
        return "pylsp"
    }
}

// Display a notification to the user if the plugin is configured to use 'python-language-server' as a server.
function alertDeprecatedServerIfNeeded(serverBinPath) {
    const ignoreConfigName = nova.extension.identifier + '.alerted-deprecated-server'
    const isIgnoringAlert = nova.config.get(ignoreConfigName) === serverBinPath

    if (isIgnoringAlert || nova.path.basename(serverBinPath) !== 'pyls') {
        return
    }

    let notification = new NotificationRequest("python-nova-deprecated-server");

    notification.title = nova.localize("python-language-server is deprecated");
    notification.body = nova.localize('You should install python-lsp-server instead, and update your "language server executable" path accordingly in the preferences.');

    notification.actions = [nova.localize("OK"), nova.localize("More info"), nova.localize("Ignore")];

    let promise = nova.notifications.add(notification);
    promise.then(reply => {
        if (reply.actionIdx == 1) {
            nova.openURL("https://github.com/mmshivesh/Python-Nova.novaextension/pull/18")
        } else if (reply.actionIdx == 2) {
            nova.config.set(ignoreConfigName, serverBinPath)
        }
    }, error => {
        console.error(error);
    });
}

function resetDeprecatedServerAlert() {
    const ignoreConfigName = nova.extension.identifier + '.alerted-deprecated-server'
    nova.config.remove(ignoreConfigName)
}

// Get and return the preferences dictionary
function getSettings() {
    return {
    const pylsNamespace = getSettingsPyLSNamespace()
        settings: {
            pylsNamespace: {
                "env": {},
                "configurationSources": [
                    getPreference('pyls.configurationSources')
                ],
                "rope": {
                    "extensionModules": getPreference('pyls.rope.extensionModules'),
                    "ropeFolder": parseSpaceSeparated(getPreference('pyls.rope.ropeFolder'))
                },
                "plugins": {
                    "jedi": {
                        "enabled": getPreference('pyls.plugins.jedi.enabled'),
                        "extra_paths": parseSpaceSeparated(getPreference('pyls.plugins.jedi.extra_paths')),
                        "env_vars": parseJSON(getPreference('pyls.plugins.jedi.env_vars')),
                        "environment": (function(){
                            if (getPreference('pyls.plugins.jedi.workspace.environment', undefined, true) == undefined) {
                                console.log("Workspace Jedi environment undefined. Using global value");
                                return getPreference('pyls.plugins.jedi.environment');
                            } else {
                                console.log("Jedi environment overriden at Workspace. Using workspace value instead.");
                                return getPreference('pyls.plugins.jedi.workspace.environment', undefined, true);
                            }
                        }()) // Override the current jedi environment if a workspace specific environment is defined.
                    },
                    "jedi_completion": {
                        "enabled": getPreference('pyls.plugins.jedi_completion.enabled'),
                        "fuzzy": getPreference('pyls.plugins.jedi_completion.fuzzy'),
                        "include_params": getPreference('pyls.plugins.jedi_completion.include_params'),
                        "include_class_objects": getPreference('pyls.plugins.jedi_completion.include_class_objects')
                    },
                    "jedi_definition": {
                        "enabled": getPreference('pyls.plugins.jedi_definition.enabled'),
                        "follow_imports": getPreference('pyls.plugins.jedi_definition.follow_imports'),
                        "follow_builtin_imports": getPreference('pyls.plugins.jedi_definition.follow_builtin_imports')
                    },
                    "jedi_hover": {
                        "enabled": getPreference('pyls.plugins.jedi_hover.enabled')
                    },
                    "jedi_references": {
                        "enabled": getPreference('pyls.plugins.jedi_references.enabled')
                    },
                    "jedi_signature_help": {
                        "enabled": getPreference('pyls.plugins.jedi_signature_help.enabled')
                    },
                    "jedi_symbols": {
                        "enabled": getPreference('pyls.plugins.jedi_symbols.enabled'),
                        "all_scopes": getPreference('pyls.plugins.jedi_symbols.all_scopes')
                    },
                    "mccabe": {
                        "enabled": getPreference('pyls.plugins.mccabe.enabled'),
                        "threshold": getPreference('pyls.plugins.mccabe.threshold')
                    },
                    "preload": {
                        "enabled": getPreference('pyls.plugins.preload.enabled'),
                        "modules": parseSpaceSeparated(getPreference('pyls.plugins.preload.modules'))
                    },
                    "pycodestyle": {
                        "enabled": getPreference('pyls.plugins.pycodestyle.enabled'),
                        "exclude": parseSpaceSeparated(getPreference('pyls.plugins.pycodestyle.exclude')),
                        "filename": parseSpaceSeparated(getPreference('pyls.plugins.pycodestyle.filename')),
                        "select": parseSpaceSeparated(getPreference('pyls.plugins.pycodestyle.select')),
                        "ignore": conditionalAppendArgumentsToArray(
                            getPreference('pyls.plugins.pycodestyle.disableLineLength'), 
                            parseSpaceSeparated(getPreference('pyls.plugins.pycodestyle.ignore')), 
                            "E501"),
                        "hangClosing": getPreference('pyls.plugins.pycodestyle.hangClosing'),
                        "maxLineLength": getPreference('pyls.plugins.pycodestyle.maxLineLength')
                    },
                    "pydocstyle": {
                        "enabled": getPreference('pyls.plugins.pydocstyle.enabled'),
                        "convention": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.convention')),
                        "addIgnore": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.addIgnore')),
                        "addSelect": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.addSelect')),
                        "ignore": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.ignore')),
                        "select": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.select')),
                        "match": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.match')),
                        "matchDir": parseSpaceSeparated(getPreference('pyls.plugins.pydocstyle.matchDir'))
                    },
                    "pylint": {
                        "enabled": getPreference('pyls.plugins.pylint.enabled'),
                        "args": parseSpaceSeparated(getPreference('pyls.plugins.pylint.args')),
                        "executable": getPreference('pyls.plugins.pylint.executable')
                        
                    },
                    "rope_completion": {
                        "enabled": getPreference('pyls.plugins.rope_completion.enabled')
                    },
                    "pyflakes": {
                        "enabled": getPreference('pyls.plugins.pyflakes.enabled')
                    },
                    "pylint": {
                        "enabled": getPreference('pyls.plugins.pylint.enabled')
                    },
                    "yapf": {
                        "enabled": getPreference('pyls.plugins.yapf.enabled')
                    },
                    
                    // Additional Plugin Preferences
                    "pyls_mypy": {
                        "enabled": getPreference('pyls.plugins.pyls_mypy.enabled'),
                        "live_mode": getPreference('pyls.plugins.pyls_mypy.live_mode')
                    },
                    "pyls_black": {
                        "enabled": getPreference('pyls.plugins.pyls_black.enabled')
                    },
                    "pyls_isort": {
                        "enabled": getPreference('pyls.plugins.pyls_isort.enabled')
                    }
                }
                
            }
          }
    }
}

class PythonLanguageServer {
    constructor() {
        this.addPreferenceObservers();
        // First start.
        showNotification("Starting extension.");
        this.start(getPyLSExecutablePreference());
    }

    addPreferenceObservers() {
        let keys = [
            'pyls.configurationSources',
            'pyls.plugins.jedi.enabled',
            'pyls.plugins.jedi_completion.enabled',
            'pyls.plugins.jedi_definition.enabled',
            'pyls.plugins.jedi_hover.enabled',
            'pyls.plugins.jedi_references.enabled',
            'pyls.plugins.jedi_signature_help.enabled',
            'pyls.plugins.jedi_symbols.enabled',
            'pyls.plugins.preload.enabled',
            'pyls.plugins.rope_completion.enabled',
            'pyls.plugins.yapf.enabled',
            'pyls.plugins.mccabe.enabled',
            'pyls.plugins.pydocstyle.enabled',
            'pyls.plugins.pycodestyle.enabled',
            'pyls.plugins.pyflakes.enabled',
            'pyls.plugins.pylint.enabled',
            'pyls.plugins.jedi.extra_paths',
            'pyls.plugins.jedi.env_vars',
            'pyls.plugins.jedi.environment',
            'pyls.plugins.jedi_completion.include_params',
            'pyls.plugins.jedi_completion.include_class_objects',
            'pyls.plugins.jedi_completion.fuzzy',
            'pyls.plugins.jedi_definition.follow_imports',
            'pyls.plugins.jedi_definition.follow_builtin_imports',
            'pyls.plugins.jedi_symbols.all_scopes',
            'pyls.plugins.mccabe.threshold',
            'pyls.plugins.preload.modules',
            'pyls.plugins.pycodestyle.exclude',
            'pyls.plugins.pycodestyle.filename',
            'pyls.plugins.pycodestyle.select',
            'pyls.plugins.pycodestyle.ignore',
            'pyls.plugins.pycodestyle.hangClosing',
            'pyls.plugins.pycodestyle.disableLineLength',
            'pyls.plugins.pycodestyle.maxLineLength',
            'pyls.plugins.pydocstyle.convention',
            'pyls.plugins.pydocstyle.addIgnore',
            'pyls.plugins.pydocstyle.addSelect',
            'pyls.plugins.pydocstyle.ignore',
            'pyls.plugins.pydocstyle.select',
            'pyls.plugins.pydocstyle.match',
            'pyls.plugins.pydocstyle.matchDir',
            'pyls.plugins.pylint.args',
            'pyls.plugins.pylint.executable',
            'pyls.rope.ropeFolder',
            'pyls.rope.extensionModules', 
            'pyls.plugins.pyls_mypy.enabled',
            'pyls.plugins.pyls_mypy.live_mode',
            'pyls.plugins.pyls_isort.enabled',
            'pyls.plugins.pyls_black.enabled'
        ];
        for (var i of keys) {
            nova.config.onDidChange(i, async function(newValue, oldValue) {
                console.log("Syncing preferences.");
                if(this.languageClient) {
                    this.languageClient.sendNotification("workspace/didChangeConfiguration", getSettings())
                }
            }, this);
        }
        
        let reloadKeys = [
            'pyls.executable',
            'pyls.enableLogging',
            'pyls.logPath'
        ];
        for (var i of reloadKeys) {
            nova.config.onDidChange(i, async function(newValue, oldValue) {
                if(this.languageClient) {
                    showNotification("Stopping extension.");
                    await this.stop();
                    nova.subscriptions.remove(this.languageClient);
                    await this.start(getPyLSExecutablePreference());
                } else {
                    await this.start(getPyLSExecutablePreference());
                }
            }, this);
        }

        nova.config.onDidChange('pyls.executable', async function(newValue, oldValue) {
            resetDeprecatedServerAlert()
        }, this);

        let workspaceKeys = [
            'pyls.plugins.jedi.workspace.environment'
        ];
        for (var i of workspaceKeys) {
            nova.workspace.config.onDidChange(i, async function(newValue, oldValue) {
                showNotification("Syncing Workspace Preferences.");
                if(this.languageClient) {
                    this.languageClient.sendNotification("workspace/didChangeConfiguration", getSettings())
                }
            }, this);
        }
        // showNotification(`Monitoring ${keys.length + reloadKeys.length + workspaceKeys.length} Preferences.`);
    }
    
    deactivate() {
        this.stop();
    }
    
    async start(path) {
        this.stop();
        
        // Create the client
        var serverOptions = {
            path: path
        };
        
        // Enable logging.
        if (getPreference("pyls.enableLogging", false)) {
            serverOptions["args"] = ['-vv', '--log-file', getPreference('pyls.logPath', '/tmp/pyls.log')]
        }
        
        var clientOptions = {
            // The set of document syntaxes for which the server is valid
            syntaxes: ['python'],
        };
        
        var client = new LanguageClient('PyLS', 'Python Language Server', serverOptions, clientOptions);
        
        try {
            // Start the client
            client.start();
            client.sendNotification("workspace/didChangeConfiguration", getSettings());
            // Add the client to the subscriptions to be cleaned up
            console.log("Added Language Client to subscriptions.");
            nova.subscriptions.add(client);
            this.languageClient = client;
        }
        catch (err) {
            if (nova.inDevMode()) {
                console.error(err);
            }
        }
    }
    
    stop() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
            this.languageClient = null;
        }
    }
}
