import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDL_DIR = join(__dirname, "idl");
const KNOWLEDGE_FILE = join(__dirname, "knowledge.json");

interface IdlField {
  name: string;
  type: string;
  description?: string;
  format?: string;
  properties?: IdlField[];
  items?: IdlField;
}

interface IdlDefinition {
  name: string;
  url: string;
  method?: string;
  description?: string;
  response?: {
    type?: string;
    properties?: IdlField[];
  };
}

/** 读取 idl 目录，按 url / 接口名 / 文件名匹配对应的 IDL 定义 */
async function findIdl(
  apiUrl: string,
): Promise<{ fileName: string; idl: IdlDefinition } | null> {
  let files: string[];
  try {
    files = (await readdir(IDL_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return null;
  }
  for (const fileName of files) {
    const idl = JSON.parse(
      await readFile(join(IDL_DIR, fileName), "utf-8"),
    ) as IdlDefinition;
    if (
      apiUrl === idl.url ||
      apiUrl === idl.name ||
      apiUrl === basename(fileName, ".json")
    ) {
      return { fileName, idl };
    }
  }
  return null;
}

async function listIdlNames(): Promise<string[]> {
  try {
    return (await readdir(IDL_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

async function readKnowledge(): Promise<string[]> {
  try {
    const data = JSON.parse(await readFile(KNOWLEDGE_FILE, "utf-8")) as {
      rules?: string[];
    };
    return data.rules ?? [];
  } catch {
    return [];
  }
}

/** 拼装 prompt：把 IDL 与 mock 规则透传给调用方 AI，由 AI 生成 mock 数据 */
function buildPrompt(idl: IdlDefinition, rules: string[]): string {
  const lines = [
    "请根据下面的接口定义（IDL）生成一份符合字段类型与语义的 mock 数据。",
    "",
    "## Mock 生成规则",
    ...rules.map((rule, i) => `${i + 1}. ${rule}`),
    "",
    "## 接口定义（IDL）",
    "```json",
    JSON.stringify(idl, null, 2),
    "```",
  ];
  return lines.join("\n");
}

export const createServer = () => {
  const Tools = [
    {
      name: "mock-generate",
      description:
        "根据接口名称或 URL 读取对应 IDL，返回接口定义与 mock 生成规则，用于生成 mock 数据",
      inputSchema: {
        type: "object",
        properties: {
          apiUrl: {
            type: "string",
            description:
              "需要生成 mock 数据的接口名称或 URL，例如 /api/user 或 getUser",
          },
        },
        required: ["apiUrl"],
      },
    },
  ];
  const server = new Server(
    {
      name: "mock-generate-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Tools,
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name !== "mock-generate") {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `未知工具：${name}`,
          },
        ],
      };
    }

    const apiUrl = String(
      (args as Record<string, unknown> | undefined)?.apiUrl ?? "",
    ).trim();
    console.error(`[mock-generate] tools/call apiUrl=${apiUrl}`);

    if (!apiUrl) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "缺少参数 apiUrl，请提供接口名称或 URL，例如 /api/user",
          },
        ],
      };
    }

    const matched = await findIdl(apiUrl);
    if (!matched) {
      const available = (await listIdlNames()).join(", ") || "（idl 目录为空）";
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `未找到接口 "${apiUrl}" 对应的 IDL 定义。当前可用的 IDL 文件：${available}。可在 src/mcp/idl/ 目录下添加新的接口定义。`,
          },
        ],
      };
    }

    const rules = await readKnowledge();
    return {
      content: [
        {
          type: "text",
          text: buildPrompt(matched.idl, rules),
        },
      ],
    };
  });
  const transport = new StdioServerTransport();
  server.connect(transport);
  return server;
};
