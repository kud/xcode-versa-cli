#!/usr/bin/env node

import inquirer from "inquirer"
import chalk from "chalk"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { $ } from "zx"
import { promises as fs } from "fs"

$.verbose = false

const XCODE_DATA_URL = "https://xcodereleases.com/data.json"
const SYSTEM_VERSION = "System"

const fetchXcodeData = async () => {
  const response = await fetch(XCODE_DATA_URL)
  if (!response.ok) {
    throw new Error("Failed to fetch Xcode data")
  }
  return response.json()
}

const getCurrentXcodeVersion = async () => {
  try {
    let result = await $`xcode-select -p`
    return result.stdout.includes("Xcode") && !/\d/.test(result.stdout)
      ? SYSTEM_VERSION
      : result.stdout.split("Xcode ")[1]?.split(".app")[0] || null
  } catch (error) {
    return null
  }
}

const displayCurrentVersion = async () => {
  const currentVersion = await getCurrentXcodeVersion()
  let pathInfo = await $`xcode-select -p`
  console.log(`${chalk.bold(currentVersion)} (${pathInfo.stdout.trim()})`)
}

const extractXcodeVersions = (files) => {
  return files
    .filter(
      (file) =>
        (file === "Xcode.app" || file.startsWith("Xcode ")) &&
        !file.startsWith("Xcodes"),
    )
    .map((file) => {
      const match = file.match(/Xcode (\d+\.\d+)?/)
      return match ? match[1] : SYSTEM_VERSION
    })
}

const getXcodeVersionsInApplications = async () => {
  const files = await fs.readdir("/Applications/")
  return extractXcodeVersions(files)
}

const switchVersion = async () => {
  const availableVersions = await getXcodeVersionsInApplications()
  const currentVersion = await getCurrentXcodeVersion()
  const formattedChoices = availableVersions.map((version) =>
    version === currentVersion ? chalk.bold(version) : version,
  )
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "xcodeVersion",
      message: "Which version of Xcode would you like to switch to?",
      choices: formattedChoices,
    },
  ])
  const chosenVersion =
    answers.xcodeVersion === SYSTEM_VERSION
      ? "Xcode.app"
      : `Xcode ${answers.xcodeVersion}.app`
  try {
    await $`sudo xcode-select --switch /Applications/${chosenVersion}`
    console.log(chalk.green(`Switched to ${answers.xcodeVersion}`))
  } catch (error) {
    console.log(chalk.red(`Error switching to ${answers.xcodeVersion}.`))
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
      `After downloading, please ensure to move the Xcode app into the /Applications directory. Rename the downloaded version with the format 'Xcode <version>.app' (e.g., 'Xcode ${versionData.version.number}.app').`,
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
    (version) => version.version.release.release,
  )
  const choices = releasedVersions.map((version) => {
    const versionStr = `Xcode ${version.version.number} (${version.version.build})`
    return installedVersions.includes(version.version.number)
      ? chalk.green(versionStr)
      : versionStr
  })
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "xcodeVersion",
      message: "Which version of Xcode would you like to install?",
      choices,
    },
  ])
  const matchedVersion = answers.xcodeVersion.match(/Xcode (\d+\.\d+)/)
  return matchedVersion
    ? releasedVersions.find((v) => v.version.number === matchedVersion[1])
    : null
}

const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .options({
      current: {
        alias: "c",
        description: "Display the current Xcode version",
        type: "boolean",
      },
      switch: {
        alias: "s",
        description: "Switch to a different Xcode version",
        type: "boolean",
      },
    })
    .help()
    .alias("help", "h").argv

  if (argv.current) {
    return await displayCurrentVersion()
  } else if (argv.switch) {
    return await switchVersion()
  }

  const data = await fetchXcodeData()
  const versionToInstall = await promptXcodeVersions(data)
  if (versionToInstall) {
    await promptForDownloadCompletion(versionToInstall)
  } else {
    console.log(chalk.red("Invalid version chosen or version not available."))
  }
}

main()
