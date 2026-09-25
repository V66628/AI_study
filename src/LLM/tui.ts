import inquirer from "inquirer";
import chalk from "chalk";
import type OpenAI from "openai";
import { runAgent } from "./agent.ts";

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function startUI() {
  console.log(
    chalk.blue(
      "测试 Agent 已启动：描述你的测试需求，我会生成测试文件 → 读回校验 → 代码 review。\n输入 exit 退出。\n",
    ),
  );

  // 跨轮保留对话历史，agent 内部在首轮自动注入 system prompt
  let history: MessageParam[] = [];

  while (true) {
    const { question } = await inquirer.prompt([
      {
        name: "question",
        message: chalk.yellow("you:"),
      },
    ]);

    if (question.trim().toLowerCase() === "exit") {
      console.log(chalk.blue("goodbye"));
      break;
    }
    if (!question.trim()) {
      continue;
    }

    try {
      const { messages } = await runAgent(
        question,
        {
          onAssistantText: (text) => {
            process.stdout.write(chalk.white(`\n${text}\n`));
          },
          onToolCall: (name, args) => {
            const target = String(args.path ?? "");
            if (name === "write_file") {
              const length = String(args.content ?? "").length;
              console.log(
                chalk.cyan(`\n[工具调用] write_file → ${target}`),
                chalk.gray(`（${length} 字符）`),
              );
            } else {
              console.log(chalk.cyan(`\n[工具调用] ${name} → ${target}`));
            }
          },
          onToolResult: (name, result) => {
            try {
              const parsed = JSON.parse(result) as {
                ok: boolean;
                path?: string;
                bytes?: number;
                content?: string;
                error?: string;
              };
              if (parsed.ok) {
                const detail =
                  name === "write_file"
                    ? `已写入 ${parsed.path}（${parsed.bytes} 字节）`
                    : `已读回 ${parsed.path}（${
                        String(parsed.content ?? "").length
                      } 字符）`;
                console.log(chalk.green(`[工具结果] ${detail}`));
              } else {
                console.log(chalk.red(`[工具失败] ${parsed.error}`));
              }
            } catch {
              console.log(chalk.gray(`[工具结果] ${result.slice(0, 120)}`));
            }
          },
        },
        history,
      );
      history = messages;
    } catch (error) {
      console.error(chalk.red("Agent 执行失败："), error);
    }
  }
}

startUI();
