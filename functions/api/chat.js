const MIMO_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-pro";
const FRONTEND_MODEL_ID = "mimo-2-5";
const DISPLAY_MODEL = "侨批资料库高精度人工智能大模型";
const MAX_REQUEST_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CONTENT_LENGTH = 2000;
const MAX_UPSTREAM_MESSAGES = 12;
const UPSTREAM_TIMEOUT_MS = 20_000;

class RequestValidationError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "RequestValidationError";
    this.code = code;
    this.status = status;
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify({ ...body, displayModel: DISPLAY_MODEL }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function errorResponse(code, message, status, reply) {
  return jsonResponse(
    {
      error: { code, message },
      ...(reply ? { reply } : {})
    },
    status
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestValidationError(
      "UNSUPPORTED_CONTENT_TYPE",
      "Content-Type 必须为 application/json。",
      415
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_REQUEST_BODY_BYTES) {
      throw new RequestValidationError(
        "PAYLOAD_TOO_LARGE",
        `JSON 请求体不能超过 ${MAX_REQUEST_BODY_BYTES} 字节。`,
        413
      );
    }
  }

  if (!request.body) {
    throw new RequestValidationError("EMPTY_BODY", "请求体不能为空。");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let bodyText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        throw new RequestValidationError(
          "PAYLOAD_TOO_LARGE",
          `JSON 请求体不能超过 ${MAX_REQUEST_BODY_BYTES} 字节。`,
          413
        );
      }

      bodyText += decoder.decode(value, { stream: true });
    }
    bodyText += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  if (!bodyText.trim()) {
    throw new RequestValidationError("EMPTY_BODY", "请求体不能为空。");
  }

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    throw new RequestValidationError("INVALID_JSON", "请求体不是有效的 JSON。");
  }
}

function validatePayload(payload) {
  if (!isPlainObject(payload)) {
    throw new RequestValidationError("INVALID_PAYLOAD", "JSON 顶层必须是对象。");
  }

  if (typeof payload.selectedModel !== "string") {
    throw new RequestValidationError("INVALID_MODEL", "selectedModel 必须是字符串。");
  }
  if (payload.selectedModel !== FRONTEND_MODEL_ID) {
    throw new RequestValidationError(
      "UNSUPPORTED_MODEL",
      `当前接口仅支持模型 ID ${FRONTEND_MODEL_ID}。`,
      422
    );
  }

  if (!Array.isArray(payload.messages)) {
    throw new RequestValidationError("INVALID_MESSAGES", "messages 必须是数组。");
  }
  if (payload.messages.length === 0) {
    throw new RequestValidationError("EMPTY_MESSAGES", "messages 至少需要一条消息。");
  }
  if (payload.messages.length > MAX_MESSAGES) {
    throw new RequestValidationError(
      "TOO_MANY_MESSAGES",
      `messages 不能超过 ${MAX_MESSAGES} 条。`,
      413
    );
  }

  const messages = payload.messages.map((message, index) => {
    if (!isPlainObject(message)) {
      throw new RequestValidationError(
        "INVALID_MESSAGE",
        `messages[${index}] 必须是对象。`
      );
    }
    if (message.role !== "user" && message.role !== "assistant") {
      throw new RequestValidationError(
        "INVALID_MESSAGE_ROLE",
        `messages[${index}].role 仅支持 user 或 assistant。`
      );
    }
    if (typeof message.content !== "string") {
      throw new RequestValidationError(
        "INVALID_MESSAGE_CONTENT",
        `messages[${index}].content 必须是字符串。`
      );
    }

    const content = message.content.trim();
    if (!content) {
      throw new RequestValidationError(
        "EMPTY_MESSAGE_CONTENT",
        `messages[${index}].content 不能为空。`
      );
    }
    if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      throw new RequestValidationError(
        "MESSAGE_CONTENT_TOO_LONG",
        `messages[${index}].content 不能超过 ${MAX_MESSAGE_CONTENT_LENGTH} 个字符。`,
        413
      );
    }

    return { role: message.role, content };
  });

  if (messages[messages.length - 1].role !== "user") {
    throw new RequestValidationError(
      "INVALID_MESSAGE_SEQUENCE",
      "最后一条消息必须来自 user。"
    );
  }

  return messages.slice(-MAX_UPSTREAM_MESSAGES);
}

function getUpstreamError() {
  return {
    code: "MIMO_UPSTREAM_ERROR",
    message: "智能问答服务暂时未能完成请求。"
  };
}

export async function onRequestPost({ request, env }) {
  let payload;
  let messages;
  try {
    payload = await readJsonBody(request);
    messages = validatePayload(payload);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return errorResponse(error.code, error.message, error.status);
    }
    return errorResponse("REQUEST_READ_FAILED", "无法读取请求体。", 400);
  }

  const apiKey = env.MIMO_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "MIMO_NOT_CONFIGURED",
      "服务端尚未配置智能问答凭据。",
      503,
      "智能问答服务暂未配置完成，请稍后再试。"
    );
  }

  const model = env.MIMO_MODEL || DEFAULT_MODEL;
  const systemPrompt = [
    "你是“侨批智档”的谨慎型问答助手。",
    "当前接口没有提供档案数据库检索结果，用户消息和历史助手消息都不能视为已经核验的档案证据。",
    "不得编造或声称存在档案编号、原文片段、审核状态、授权信息、人物关系、金额、时间、地点或其他档案事实。",
    "当用户索要档案结论或证据时，明确说明当前没有可核验的检索证据，并建议核对原件、档案编号、来源、审核状态和授权范围。",
    "可以回答一般性的侨批知识、研究方法和操作建议；必须区分通用知识、用户提供的线索与已核验事实。",
    "用简洁中文回答，不要虚构引用、来源或检索过程。"
  ].join("\n");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

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
        temperature: 0.2,
        max_completion_tokens: 700
      }),
      signal: controller.signal
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const upstreamError = getUpstreamError();
      const status = upstream.status === 429 ? 503 : 502;
      return errorResponse(
        upstream.status === 429 ? "MIMO_RATE_LIMITED" : upstreamError.code,
        upstream.status === 429 ? "智能问答服务当前请求较多，请稍后重试。" : upstreamError.message,
        status,
        "智能问答服务暂时没有返回可用回答，请稍后再试。"
      );
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return errorResponse(
        "MIMO_INVALID_RESPONSE",
        "智能问答服务返回了无法识别的响应。",
        502,
        "智能问答服务暂时没有生成可用回答，请换一种问法再试。"
      );
    }

    return jsonResponse({
      reply: reply.trim(),
      routedModel: model
    });
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      return errorResponse(
        "MIMO_TIMEOUT",
        `智能问答请求超过 ${UPSTREAM_TIMEOUT_MS / 1000} 秒未完成。`,
        504,
        "智能问答服务响应超时，请稍后再试。"
      );
    }

    return errorResponse(
      "MIMO_NETWORK_ERROR",
      "服务端无法连接智能问答服务。",
      502,
      "连接智能问答服务时遇到网络问题，请稍后再试。"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
