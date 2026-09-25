import OpenAI from "openai";

export const MODEL = process.env.LLM_MODEL ?? "qwen3.8-max";

export const client = new OpenAI({
  apiKey:
    process.env.LLM_API_KEY ??
    "sk-ws-H.PIRXHRX.R5BD.MEQCIFlFpJIq0PGFLP3crxATHiFi_qmIGVlCckSFz3APThZsAiBLFiGgUgj7Cng9M42KoivLnCoD0STODsRgcqiuLDuSug",
  baseURL:
    process.env.LLM_BASE_URL ??
    "https://maas.qianwenaiapi.com/compatible-mode/v1",
});
