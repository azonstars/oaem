import { safeStorage } from "./utils/storage";

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = safeStorage.getItem("govt_app_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && url !== "/api/auth/login") {
    safeStorage.removeItem("govt_app_token");
    safeStorage.removeItem("govt_app_user");
    window.dispatchEvent(new CustomEvent("auth-unauthorized"));
  }

  const originalJson = res.json.bind(res);
  res.json = async () => {
    try {
      const clone = res.clone();
      const text = await clone.text();
      if (!text || text.trim().startsWith("<")) {
        return {
          error: `Invalid server response (${res.status})`,
          success: false,
        };
      }
      return JSON.parse(text);
    } catch {
      try {
        return await originalJson();
      } catch {
        return { error: "Failed to parse server response", success: false };
      }
    }
  };

  return res;
}
