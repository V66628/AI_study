import inquirer from "inquirer";
import chalk from "chalk";
import generateResponse from "./oneApi.ts";

export async function startUI() {
  let historyMessage = [];
  while (true) {
    const { question } = await inquirer.prompt([
      {
        name: "question",
        message: chalk.yellow("you:"),
      },
    ]);
    historyMessage.push({
      role: "user",
      content: [{ type: "input_text", text: question }],
    });
    const response = await generateResponse(historyMessage);
    console.log(historyMessage);
    // process.stdout.write(response.choices[0].message.content)
    if (question.toLowerCase() === "exit") {
      console.log(chalk.blue("goodbye"));
      break;
    }
  }
}
startUI();
