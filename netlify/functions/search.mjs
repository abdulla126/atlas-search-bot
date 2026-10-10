
export default async function handler(request) {
  try {
    let data = {};
    return new Response("ТЕСТ: NETLIFY РАБОТАЕТ", {
  status: 200,
  headers: { "Content-Type": "text/plain; charset=utf-8" }
});
    const raw = await request.text();
    console.log("HTTP BODY:", raw);

    try {
      data = JSON.parse(raw);
    } catch {
      try {
        data = Object.fromEntries(new URLSearchParams(raw));
      } catch {
        data = {};
      }
    }

    function findQuery(obj) {
      if (!obj || typeof obj !== "object") return "";

      const wanted = [
        "query", "search", "search_query",
        "question", "text", "message", "userinput"
      ];

      for (const key of wanted) {
        const value = obj[key];

        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }

      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findQuery(item);
          if (found) return found;
        }
      } else {
        for (const value of Object.values(obj)) {
          if (value && typeof value === "object") {
            const found = findQuery(value);
            if (found) return found;
          }
        }
      }

      return "";
    }

   
const url = new URL(request.url);

const query = (
  url.searchParams.get("query") ||
  data.query ||
  data.variables?.query ||
  data.contact?.query ||
  findQuery(data)
).trim();

if (
  !query ||
  query.toLowerCase() === "/start" ||
  query.toLowerCase() === "start"
) {
  return new Response(
    "Привет! Я АТЛАС БОТ 🔎\nНапиши, что ты хочешь найти.",
    {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    }
  );
}
    answer += "Источник поиска: Truegle";

    return new Response(answer, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  } catch (error) {
    return new Response(
      "Не удалось выполнить поиск. Попробуй ещё раз позже.",
      { status: 200 }
    );
  }
}
