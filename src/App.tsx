import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: 'sk-ws-H.PIRXHRX.R5BD.MEQCIFlFpJIq0PGFLP3crxATHiFi_qmIGVlCckSFz3APThZsAiBLFiGgUgj7Cng9M42KoivLnCoD0STODsRgcqiuLDuSug',
    baseURL: "https://maas.qianwenaiapi.com/compatible-mode/v1"
});

async function main() {
    const response = await openai.responses.create({
        model: "qwen3.8-max",
        input: "9.9和9.11哪个大？",
    enable_thinking: true  // 启用思考模式
    });

    // 遍历输出项
    for (const item of response.output) {
        if (item.type === "reasoning") {
            console.log("【推理过程】");
            for (const summary of item.summary) {
                console.log(summary.text.substring(0, 500));
            }
            console.log();
        } else if (item.type === "message") {
            console.log("【最终答案】");
            console.log(item.content[0].text);
        }
    }
}

export default main();