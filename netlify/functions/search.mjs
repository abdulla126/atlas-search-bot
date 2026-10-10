
export default async function handler(request) {
  try {
    let data = {};

    const raw = await request.text();

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

    const query =
  data.query ||
  data.variables?.query ||
  data.contact?.query ||
  (request.url
    ? new URL(request.url).searchParams.get("query")
    : "") ||
  findQuery(data);

    if (!query) {
      return new Response(
        "Не получилось получить твой вопрос. Проверь переменную query в CleverApp.",
        { status: 200 }
      );
    }

    const searchResponse = await fetch(
      "https://api.truegle.info/api/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Truegle-Client": "atlas-search-bot"
        },
        body: JSON.stringify({
          query: query.slice(0, 300),
          mode: "blue-pill",
          filters: { language: "ru" }
        })
      }
    );

    if (!searchResponse.ok) {
      return new Response(
        "Поиск временно не сработал. Попробуй ещё раз немного позже.",
        { status: 200 }
      );
    }

    const result = await searchResponse.json();
    const results = Array.isArray(result.results)
      ? result.results.slice(0, 3)
      : [];

    if (results.length === 0) {
      return new Response(
        "По запросу «" + query + "» ничего не найдено. Попробуй задать вопрос иначе.",
        { status: 200 }
      );
    }

    let answer = "🔎 Результаты поиска\n";
    answer += "Запрос: " + query + "\n\n";

    results.forEach((item, index) => {
      answer += (index + 1) + ". " +
        (item.title || "Страница без названия") + "\n";

      if (item.snippet) {
        answer += item.snippet + "\n";
      }

      if (item.url) {
        answer += item.url + "\n";
      }

      answer += "\n";
    });

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
