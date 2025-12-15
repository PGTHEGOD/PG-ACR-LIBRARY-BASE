interface RouteParams {
  sessionId?: string
}

export async function resolveSessionId(params: RouteParams | Promise<RouteParams>) {
  try {
    const resolved = await Promise.resolve(params)
    const sessionId = resolved?.sessionId
    return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null
  } catch {
    return null
  }
}
