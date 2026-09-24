import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
export const createServer = () => {
  const Tools = [
    {
      name: "mock-genernate",
      description: "mock generate tool",
      inputSchema: {
        type: "object",
        properties: {
          apiUrl: {
            type: "string",
            description: "需要生成mock数据的接口名称",
          },
        },
        required: ["apiUrl"],
      },
    },
  ];
  const server = new Server(
    {
      name: "mock-genernate-server",
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
  server.setRequestHandler(CallToolRequestSchema, (requet) => {
    const { name, arguments: args } = requet.params;
    if (name === "mock-genernate") {
      const { apiUrl } = args;
      //读取idl
      //读取知识
      //拼接prompt 告诉ai要执行的任务一
      return {
        content: [
          {
            type: "text",
            text: `生成mock数据的接口名称为${apiUrl}`,
          },
        ],
      };
    }
  });
  const transport = new StdioServerTransport();
  server.connect(transport);
  return server;
};
