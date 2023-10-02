# 🔄 xcode-versa

`xcode-versa` is a CLI tool designed to provide developers an effortless way to manage multiple Xcode versions on macOS. This tool simplifies the process of switching between Xcode versions, viewing the active version, and initiating downloads for desired versions—all from the comfort of your terminal.

## 🌟 Features

- **Switch** between installed Xcode versions with ease.
- **View** the currently active Xcode version and its installation path.
- **Download** desired Xcode versions through guided prompts.
- Highlights the installed Xcode versions for better clarity.

## 📦 Installation

You can install `xcode-versa` via npm:

```bash
npm install -g @kud/xcode-versa
```

## 🔧 Usage

Here's a quick guide to `xcode-versa`:

### Display current Xcode version:

```bash
xcode-versa --current
```

or

```bash
xcode-versa -c
```

### Switch between your installed Xcode versions:

```bash
xcode-versa --switch
```

or

```bash
xcode-versa -s
```

### Guide to download a new Xcode version:

Run `xcode-versa` without any arguments and follow the on-screen prompts.

## 🤝 Contributing

Found a bug or have a feature in mind? Feel free to submit a pull request! All contributions are welcome.

## 📜 License

MIT
