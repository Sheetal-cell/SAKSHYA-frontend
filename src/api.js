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

export async function analyzeJudgment(file) {
  const base64 = await fileToBase64(file);

  const response = await fetch(`${BASE_URL}/api/judgment/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, filename: file.name }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Server error");
  }

  return json.data;
}

/**
 * Send a chat message to the backend.
 * @param {object} context   - The full judgment data object from analyzeJudgment()
 * @param {Array}  history   - Prior [{role, content}] messages
 * @param {string} message   - The new user message
 * @returns {Promise<string>} - The assistant's reply text
 */
export async function sendChatMessage(context, history, message) {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, history, message }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || "Chat server error");
  }

  return json.reply;
}
