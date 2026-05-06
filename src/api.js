const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://sakshya-backend.onrender.com";

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function analyzeJudgment(file) {
  const base64 = await fileToBase64(file);

  const response = await fetch(`${BASE_URL}/api/judgment/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ base64, filename: file.name }),
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Server error");
  return json.data;
}

export async function sendChatMessage(context, history, message, summaryId) {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ context, history, message, summaryId }),
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Chat server error");
  return json.reply;
}

// ── Dashboard history ─────────────────────────────────────────────────────────
export async function getDashboardHistory() {
  const response = await fetch(`${BASE_URL}/api/judgment/history`, {
    method: "GET",
    headers: authHeaders(),
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Failed to fetch history");
  return json;
}