# 🔄 xcode-versa

`xcode-versa` is a CLI tool designed to provide developers an effortless way to manage multiple Xcode versions on macOS. This tool simplifies the process of switching, installing, and uninstalling Xcode versions, viewing the active version, and initializing downloads for desired versions — all from the comfort of your terminal.

[![asciicast](https://asciinema.org/a/611723.svg)](https://asciinema.org/a/611723)

## 🌟 Features

- **Switch** between installed Xcode versions and change the currently active version.
- **View** your currently active Xcode version and its installation path.
- **Download** desired Xcode versions through guided prompts.
- **List** locally installed Xcode versions, and view all available remote Xcode versions.
- **Uninstall** unused Xcode versions.
- Highlights the installed Xcode versions for better clarity.

## 📦 Installation

You can install `xcode-versa` via npm:

```bash
npm install -g @kud/xcode-versa-cli
```

## 🔧 Usage

Here's a quick guide to `xcode-versa`:

### Display current Xcode version:

Use the command:

```bash
xcode-versa current
```

### Switch or use a different installed Xcode version:

Use the command:

```bash
xcode-versa use
```

### Install a new Xcode version:

Use the command:

```bash
xcode-versa install
```

### List all locally installed Xcode versions:

To list all locally installed versions, use the command:

```bash
xcode-versa list
```

### List all remote Xcode versions:

Use the command:

```bash
xcode-versa list-remote
```

### Uninstall an Xcode version:

To uninstall a version of Xcode, use this command:

```bash
xcode-versa uninstall
```

> Info: Do note that the uninstall command uses the 'trash' npm package, so you may be asked to grant necessary access permissions for it to move files to the bin.

## 🤝 Contributing

Found a bug or have a feature in mind? Feel free to submit a pull request! All contributions are welcome.

## 📜 License

This project is licensed under the MIT License.
