#!/usr/bin/env node

import inquirer from "inquirer"
import chalk from "chalk"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { $ } from "zx"
import { promises as fs } from "fs"
import trash from "trash"
import Table from "cli-table3"

$.verbose = false

const XCODE_DATA_URL = "https://xcodereleases.com/data.json"
const SYSTEM_VERSION = "System"

const getXcodeAppVersion = async () => {
  try {
    const result =
      await $`/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/Xcode.app/Contents/Info.plist`
    return result.stdout.trim()
  } catch (error) {
    return null
  }
}

const fetchXcodeData = async () => {
  const response = await fetch(XCODE_DATA_URL)
  if (!response.ok) {
    throw new Error("Failed to fetch Xcode data")
  }
  return response.json()
}

const listRemoteVersions = async (pageNum = 0) => {
  const data = await fetchXcodeData()
  const releasedVersions = data.filter(
    (version) => version.version.release.release,
  )
  const installedVersions = await getXcodeVersionsInApplications()
  const currentVersion = await getCurrentXcodeVersion()
  const systemVersion = await getXcodeAppVersion()

  // Define the table
  const table = new Table({
    head: ["Version", "Build", "Installed", "Current", "System"],
    colAligns: ["left", "center", "center", "center", "center"],
  })

  const pageSize = 10
  const start = pageSize * pageNum
  const end = start + pageSize
  const slicedVersions = releasedVersions.slice(start, end)

  slicedVersions.forEach((version) => {
    const isInstalled = installedVersions.includes(version.version.number)
    const isSystem = version.version.number === systemVersion
    const isCurrent = version.version.number === currentVersion

    table.push([
      `Xcode ${version.version.number}`,
      version.version.build,
      isInstalled ? "✅" : "",
      isCurrent ? "✅" : "",
      isSystem ? "✅" : "",
    ])
  })

  console.log(table.toString())

  if (end < releasedVersions.length) {
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "nextPage",
        message: "Would you like to view the next page?",
        default: false,
      },
    ])

    if (answers.nextPage) {
      await listRemoteVersions(pageNum + 1)
    }
  }
}

const getCurrentXcodeVersion = async () => {
  try {
    let result = await $`xcode-select -p`
    if (result.stdout.includes("Xcode") && !/\d/.test(result.stdout)) {
      return await getXcodeAppVersion()
    } else {
      return result.stdout.split("Xcode-")[1]?.split(".app")[0] || null
    }
  } catch (error) {
    return null
  }
}

const displayCurrentVersion = async () => {
  const currentVersion = await getCurrentXcodeVersion()
  let pathInfo = await $`xcode-select -p`
  console.log(
    `${chalk.bold(currentVersion)} (${
      pathInfo.stdout.includes("Xcode.app") ? chalk.italic("(System) ") : ""
    }${pathInfo.stdout.trim()})`,
  )
}

const extractXcodeVersions = async (files) => {
  const versions = []
  for (const file of files.filter(
    (file) =>
      (file === "Xcode.app" || file.startsWith("Xcode-")) &&
      !file.startsWith("Xcodes"),
  )) {
    const version =
      await $`/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/${file}/Contents/Info.plist`
    versions.push(version.stdout.trim())
  }
  return versions
}

const getXcodeVersionsInApplications = async () => {
  const files = await fs.readdir("/Applications/")
  return extractXcodeVersions(files)
}

const switchVersion = async () => {
  let availableVersions = await getXcodeVersionsInApplications()

  // Sort the versions in descending order
  availableVersions.sort((a, b) => {
    // Convert version strings to arrays of numbers [major, minor, patch]
    const aParts = a.split(".").map((num) => parseInt(num, 10))
    const bParts = b.split(".").map((num) => parseInt(num, 10))

    // Compare major, minor, and patch versions
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      if ((aParts[i] || 0) > (bParts[i] || 0)) return -1
      if ((aParts[i] || 0) < (bParts[i] || 0)) return 1
    }
    return 0
  })

  const currentVersion = await getCurrentXcodeVersion()
  const systemVersion = await getXcodeAppVersion()

  const formattedChoices = availableVersions.map((version) => {
    let label = version
    label += version === systemVersion ? ` ${chalk.italic("(System)")}` : ""
    label += version === currentVersion ? ` ${chalk.italic("(current)")}` : ""

    return {
      name: label,
      value: version,
    }
  })

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "xcodeVersion",
      message: "Which version of Xcode would you like to switch to?",
      choices: formattedChoices,
    },
  ])

  const chosenVersion =
    answers.xcodeVersion === systemVersion
      ? "Xcode.app"
      : `Xcode-${answers.xcodeVersion}.app`

  try {
    console.log(`Switching to ${answers.xcodeVersion}...`)
    await $`sudo xcode-select --switch /Applications/${chosenVersion}`

    console.log(`Accepting license...`)
    await $`sudo xcodebuild -license accept`

    console.log(`Running first launch...`)
    await $`sudo xcodebuild -runFirstLaunch`

    console.log(chalk.green(`Switched to ${answers.xcodeVersion}`))
  } catch (error) {
    console.log(chalk.red(`Error switching to ${answers.xcodeVersion}.`))
    console.log(error)
  }
}

const promptForDownloadCompletion = async (versionData) => {
  console.log(
    chalk.cyan(
      `Initiating the download for Xcode version ${versionData.version.number}.`,
    ),
  )
  console.log(
    chalk.yellow(
      `After downloading, please ensure to move the Xcode app into the /Applications directory. Rename the downloaded version with the format 'Xcode-<version>.app' (e.g., 'Xcode-${versionData.version.number}.app').`,
    ),
  )
  await inquirer.prompt([
    {
      type: "input",
      name: "confirmation",
      message: `Press "Enter" to open the download link in your browser...`,
    },
  ])
  await $`open ${versionData.links.download.url}`
}

const promptXcodeVersions = async (versions) => {
  const installedVersions = await getXcodeVersionsInApplications()
  const releasedVersions = versions.filter(
    (version) =>
      version.version.release.release &&
      !installedVersions.includes(version.version.number),
  )

  // If no versions are available for installation, inform the user and return null
  if (releasedVersions.length === 0) {
    console.log(
      chalk.yellow("All available versions of Xcode are already installed."),
    )
    return null
  }

  const choices = releasedVersions.map((version) => {
    const versionStr = `Xcode ${version.version.number} (${version.version.build})`
    return versionStr
  })

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "xcodeVersion",
      message: "Which version of Xcode would you like to install?",
      choices,
    },
  ])

  // Extract the version number from the selected choice
  const matchedVersion = answers.xcodeVersion.match(
    /Xcode (\d+\.\d+(?:\.\d+)?)/,
  )
  return matchedVersion
    ? releasedVersions.find((v) => v.version.number === matchedVersion[1])
    : null
}

const listLocalVersions = async () => {
  const availableVersions = await getXcodeVersionsInApplications()

  if (availableVersions.length === 0) {
    console.log("No locally installed Xcode versions found.")
    return
  }

  const currentVersion = await getCurrentXcodeVersion()
  const systemVersion = await getXcodeAppVersion()

  // Define the table
  const table = new Table({
    head: ["Version", "Current", "System"],
    colAligns: ["left", "center", "center"],
  })

  // Sorting available versions from highest to lowest
  const sortedVersions = availableVersions.sort(
    (a, b) => parseFloat(b) - parseFloat(a),
  )

  sortedVersions.forEach((version) => {
    const isCurrent = version === currentVersion
    const isSystem = version === systemVersion

    table.push([
      `Xcode ${version}`,
      isCurrent ? "✅" : "",
      isSystem ? "✅" : "",
    ])
  })

  console.log(table.toString())
}

const uninstallVersion = async () => {
  const availableVersions = (await getXcodeVersionsInApplications()).filter(
    (version) => version !== SYSTEM_VERSION,
  )

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "xcodeVersion",
      message: "Which version of Xcode would you like to uninstall?",
      choices: availableVersions,
    },
  ])
  const chosenVersion = `Xcode-${answers.xcodeVersion}.app`
  try {
    await trash(`/Applications/${chosenVersion}`)
    console.log(chalk.green(`Uninstalled Xcode ${answers.xcodeVersion}`))
  } catch (error) {
    console.log(chalk.red(`Error uninstalling Xcode ${answers.xcodeVersion}.`))
  }
}

const main = async () => {
  yargs(hideBin(process.argv))
    .command("list-remote", "List all remote Xcode versions", {}, async () => {
      await listRemoteVersions()
    })
    .command(
      "list",
      "List all locally installed Xcode versions",
      {},
      async () => {
        await listLocalVersions()
      },
    )
    .command("current", "Display the current Xcode version", {}, async () => {
      await displayCurrentVersion()
    })
    .command("use", "Change Xcode version", {}, async () => {
      await switchVersion()
    })
    .command("install", "Install a new Xcode version", {}, async () => {
      const data = await fetchXcodeData()
      const versionToInstall = await promptXcodeVersions(data)
      if (versionToInstall) {
        await promptForDownloadCompletion(versionToInstall)
      } else {
        console.log(
          chalk.red("Invalid version chosen or version not available."),
        )
      }
    })
    .command("uninstall", "Uninstall a Xcode version", {}, async () => {
      await uninstallVersion()
    })
    .demandCommand(1, "Please specify a command.")
    .help()
    .alias("help", "h").argv
}

main()
