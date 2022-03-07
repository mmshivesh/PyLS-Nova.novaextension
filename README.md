# Python for Nova
<p align="center">
    <img src="https://raw.githubusercontent.com/mmshivesh/PyLS-Nova.novaextension/master/extension.png" height="128" width="128">
</p>

![](https://img.shields.io/badge/dynamic/json?color=brightgreen&label=Latest%20Version&query=%24.version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmmshivesh%2FPython-Nova.novaextension%2Fmaster%2Fextension.json)

Full featured Python Language Server plugin (implements [PyLS](https://github.com/python-lsp/python-lsp-server)) for Nova, supports Jedi Autocomplete, PyFlakes, PyLint, YAPF, Rope, McCabe, PyDoc and CodeStyles.

Also supports the Python Language Server plugin `mypy`.

## Working Features

- [x] Auto-completion (including snippet fills-- Turn on `Include Function and Class Parameters`, Fixed in Nova 2.0)
- [x] Follow imports (Fixed in Nova 2.0)
- [x] Full Function hover tooltips with syntax highlighting
- [x] Module and function docstrings
- [x] PyDocStyle and PyCodeStyle flags
- [x] McCabe Cyclomatic Complexity
- [x] Automatic Preferences Reload on changes (Some preferences still need a full extension reload).

## Installation

1. Install the LSP server and its dependencies using:

```bash
pip3 install 'python-lsp-server[all]'
```

2. Enable required modules from settings.

3. (Optional) Install Python Language Server plugins and enable them from settings:

- `mypy` plugin: `pip3 install pyls-mypy`

## Features

- Real time Linting (Pyflakes):

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/realtimeLinting.png)

- Hover actions on Functions and Modules:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/hover.png)

- PyCodeStyle and PyDocStyle hints:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/doccode.gif)

- Autocomplete using Jedi:

![](https://raw.githubusercontent.com/mmshivesh/Python-Nova.novaextension/master/.github/images/autoComplete.gif)

## Contributing

I would be extremely grateful if you could lend a hand in the development of this extension. PRs with new features and fixes would be greatly appreciated. Also, feel free to open bug reports.
