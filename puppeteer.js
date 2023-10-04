import puppeteer from "puppeteer"
import inquirer from "inquirer"

const downloadFile = async () => {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "email",
      message: "What is your email address?",
    },
    {
      type: "password",
      name: "password",
      message: "What is your password?",
      mask: "*",
    },
  ])

  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  const downloadURL =
    "https://developer.apple.com/services-account/download?path=/Developer_Tools/Xcode_15.1_beta/Xcode_15.1_beta.xip"

  console.log("Navigate to the URL")
  await page.goto(downloadURL)
  console.log("ok")

  const frameElement = await page.$(`#aid-auth-widget-iFrame`)
  const frame = await frameElement.contentFrame()

  // Wait for the email field to load
  await frame.waitForSelector("#account_name_text_field")

  // Enter the email
  await frame.type("#account_name_text_field", answers.email)

  // Press 'Enter' to submit the form
  await frame.keyboard.press("Enter")

  console.log("Submitted the form")
}

downloadFile().catch((error) => console.error(error))
