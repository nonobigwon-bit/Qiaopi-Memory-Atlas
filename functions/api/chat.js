const MIMO_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-pro";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-12)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").slice(0, 2000)
    }))
    .filter((message) => message.content.trim());
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.MIMO_API_KEY;

  if (!apiKey) {
    return jsonResponse(
      {
        error: "MIMO_API_KEY is not configured",
        reply: "后端还没有配置 MiMo API key。请在 Cloudflare Pages 的环境变量里设置 MIMO_API_KEY 后再试。"
      },
      503
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const messages = normalizeMessages(payload.messages);
  if (!messages.length) {
    return jsonResponse({ error: "No valid messages" }, 400);
  }

  const model = env.MIMO_MODEL || DEFAULT_MODEL;
  const systemPrompt = [
    "你是“侨批智档”的可信 RAG 演示问答助手。",
    "回答必须保持谨慎：区分事实、线索和推测，不要编造不存在的档案内容。",
    "涉及侨批、寻根、教学或研究时，优先提醒用户关注档案编号、原文片段、审核状态和授权边界。",
    "用简洁中文回答，必要时给出下一步核验建议。"
  ].join("\n");

  try {
    const upstream = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.35,
        max_completion_tokens: 700
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return jsonResponse(
        {
          error: data.error?.message || "MiMo request failed",
          reply: "MiMo 接口暂时没有返回可用回答，请稍后再试。"
        },
        upstream.status
      );
    }

    return jsonResponse({
      reply: data.choices?.[0]?.message?.content || "MiMo 暂时没有生成回答，请换一种问法再试。",
      routedModel: model,
      displayModel: "MiMo 2.5"
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Network error",
        reply: "连接 MiMo 接口时遇到网络问题，请稍后再试。"
      },
      502
    );
  }
}
