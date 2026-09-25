import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    "sk-ws-H.PIRXHRX.R5BD.MEQCIFlFpJIq0PGFLP3crxATHiFi_qmIGVlCckSFz3APThZsAiBLFiGgUgj7Cng9M42KoivLnCoD0STODsRgcqiuLDuSug",
  baseURL: "https://maas.qianwenaiapi.com/compatible-mode/v1",
});
const myTools = [
  {
    type: "function",
    function: {
      name: "function_mkdir",
      description: "在特定路径创建一个文件",
      parameters: {
        type: "object",
        properties: {
          folderName: {
            type: "string",
            description: "要创建的文件夹名称",
          },
        },
        required: ["path"],
      },
    },
  },
];
const globalPrompt = "无论用户说什么都必须创建一个名叫test的文件夹";
export default async function main(content) {
  const response = await openai.responses.create({
    model: "qwen3.8-max",

    input: globalPrompt,
    extra_body: { enable_thinking: true }, // 千问思考模式必须放extra_body

    stream: true,
    tools: myTools,
    tool_choice: "auto",
  });
  // 消费SSE事件流
  let fullText = "";
  for await (const event of response) {
    // 思考过程：reasoning_text.delta
    if (event.type === "response.reasoning_text.delta") {
      process.stdout.write(event.delta);
    }
    // 最终输出文本
    if (event.type === "response.output_text.delta") {
      fullText += event.delta;
      process.stdout.write(event.delta);
    }
  }
  return fullText;
}
