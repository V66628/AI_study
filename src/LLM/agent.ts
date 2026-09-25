import type OpenAI from "openai";
import { client, MODEL } from "./oneApi.ts";
import { executeTool, toolSchemas } from "./tools.ts";

type MessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const SYSTEM_PROMPT = `你是一个测试代码生成与代码审查 Agent。当用户提出测试需求时，严格按以下步骤工作：

1. 调用 write_file 工具，在 generated 目录下生成测试文件，根据被测内容选择合适的文件名和测试框架（TypeScript 项目优先使用 node:test 或 vitest）；
2. 调用 read_file 工具读回刚写入的文件，确认实际落盘内容；
3. 基于读回的内容进行 code review，至少覆盖：正确性、边界用例、可维护性、命名与结构；
4. 用中文输出 review 结论：问题清单（若无问题需明确说明"未发现问题"）和具体修改建议；
5. review 输出后停止调用工具，给出一句最终总结。

约束：
- 文件只能写在 generated 目录内；
- 不要重复读取同一个文件超过 2 次；
- 工具调用是为了完成任务，不要无意义地循环；
- 最终回复使用中文。`;

const MAX_STEPS = 6;

export interface AgentHooks {
  onAssistantText?: (text: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: string) => void;
}

export interface RunResult {
  finalText: string;
  messages: MessageParam[];
}

/**
 * Agent loop：LLM 决策 → 若返回 tool_calls 则执行工具并把结果回灌 → 再次请求 LLM，
 * 直到 LLM 不再调用工具（输出最终答案）或达到最大步数。
 */
export async function runAgent(
  userInput: string,
  hooks: AgentHooks = {},
  history: MessageParam[] = [],
): Promise<RunResult> {
  const messages: MessageParam[] = history.length
    ? [...history]
    : [{ role: "system", content: SYSTEM_PROMPT }];
  messages.push({ role: "user", content: userInput });

  let finalText = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: toolSchemas,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const msg = choice?.message;
    if (!msg) {
      finalText = "（模型未返回内容）";
      break;
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    if (msg.content) {
      finalText = msg.content;
      hooks.onAssistantText?.(msg.content);
    }

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      break; // 没有工具调用 → 最终答案，结束 loop
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // 参数解析失败时保持空对象，由 executeTool 返回错误信息
      }
      hooks.onToolCall?.(name, args);

      const result = await executeTool(name, call.function.arguments);
      hooks.onToolResult?.(name, result);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  return { finalText, messages };
}
