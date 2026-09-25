import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 所有工具只能操作这个目录，防止 LLM 写到项目其他位置 */
export const GENERATED_DIR = resolve(__dirname, "generated");

function safePath(rel: string): string {
  const cleaned = String(rel).replace(/^[/\\]+/, "");
  const target = resolve(GENERATED_DIR, cleaned);
  if (target !== GENERATED_DIR && !target.startsWith(GENERATED_DIR + sep)) {
    throw new Error("路径越界：只能操作 generated 目录内的文件");
  }
  return target;
}

export const toolSchemas: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "在 generated 目录下生成（写入）一个测试文件。如果文件已存在则覆盖。",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "相对 generated 目录的文件路径，例如 sum.test.ts，可包含子目录",
          },
          content: {
            type: "string",
            description: "测试文件的完整内容",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "读取 generated 目录下已生成文件的完整内容，用于检查落盘结果",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "相对 generated 目录的文件路径，例如 sum.test.ts",
          },
        },
        required: ["path"],
      },
    },
  },
];

/** 执行工具，统一返回 JSON 字符串（作为 tool role 消息回灌给 LLM） */
export async function executeTool(
  name: string,
  rawArgs: string,
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return JSON.stringify({ ok: false, error: "工具参数不是合法 JSON" });
  }

  try {
    switch (name) {
      case "write_file": {
        const target = safePath(String(args.path ?? ""));
        const content = String(args.content ?? "");
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content, "utf-8");
        return JSON.stringify({
          ok: true,
          path: relative(GENERATED_DIR, target).replace(/\\/g, "/"),
          bytes: Buffer.byteLength(content, "utf-8"),
        });
      }
      case "read_file": {
        const target = safePath(String(args.path ?? ""));
        const content = await readFile(target, "utf-8");
        return JSON.stringify({
          ok: true,
          path: relative(GENERATED_DIR, target).replace(/\\/g, "/"),
          content,
        });
      }
      default:
        return JSON.stringify({ ok: false, error: `未知工具：${name}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
