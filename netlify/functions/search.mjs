
export default async function handler(request) {
  const headers = {
    "Content-Type": "text/plain; charset=utf-8"
  };

  // Любой ответ 422 просит CleverApp принять следующий
  // вопрос в переменную query и повторить HTTP-запрос.
  function continueChat(message) {
    return new Response(message, {
      status: 422,
      headers
    });
  }

  function findQuery(obj) {
    if (!obj || typeof obj !== "object") return "";

    if (
      typeof obj.name === "string" &&
      obj.name.toLowerCase() === "query" &&
      typeof obj.value === "string"
    ) {
      return obj.value.trim();
    }

    if (
      obj.variable?.name?.toLowerCase() === "query" &&
      typeof obj.value === "string"
    ) {
      return obj.value.trim();
    }

    const keys = [
      "query", "search_query", "search",
      "question", "text", "message", "userinput"
    ];

    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        const found = findQuery(value);
        if (found) return found;
      }
    }

    return "";
  }

  try {
    const url = new URL(request.url);
    const raw = await request.text();
    let data = {};

    try {
      data = JSON.parse(raw);
    } catch {
      try {
        data = Object.fromEntries(new URLSearchParams(raw));
      } catch {
        data = {};
      }
    }

    // Сначала берём актуальную пользовательскую переменную,
    // а не старое значение из URL.
    const candidates = [
  url.searchParams.get("query"),
  data.query,
  data.variables?.query,
  data.contact?.query,
  findQuery(data)
];

const queryValue = candidates.find(
  value => typeof value === "string" && value.trim()
);

const query = (queryValue || "").trim();

    // /start не является поисковым запросом.
    if (
  !query ||
  /^\/start(?:@\w+)?$/i.test(query.trim()) ||
  query.trim().toLowerCase() === "start"
) {
  return new Response(
    "Привет! Я АТЛАС БОТ 🔎\n\nНапиши свой вопрос, и я найду информацию.",
    {
      status: 422,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    }
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
      return continueChat(
        "Поиск временно не сработал. Попробуй задать вопрос ещё раз."
      );
    }

    const result = await searchResponse.json();
    const results = Array.isArray(result.results)
      ? result.results.slice(0, 3)
      : [];

    if (results.length === 0) {
      return continueChat(
        "По запросу «" + query +
        "» ничего не найдено.\n\nПопробуй спросить иначе."
      );
    }

    let answer = "🔎 Результаты поиска\n";
    answer += "Запрос: " + query + "\n\n";

    for (let i = 0; i < results.length; i++) {
      const item = results[i];

      answer += (i + 1) + ". " +
        (item.title || "Страница без названия") + "\n";

      if (item.snippet) {
        answer += item.snippet + "\n";
      }

      if (item.url) {
        answer += item.url + "\n";
      }

      answer += "\n";
    }

    answer +=
      "Напиши следующий вопрос — я продолжу поиск.";

    // Статус 422 намеренный: он позволяет CleverApp
    // принять новый вопрос и повторить этот же HTTP-запрос.
    return continueChat(answer);

  } catch (error) {
    return continueChat(
      "Не удалось выполнить поиск. Напиши следующий вопрос ещё раз."
    );
  }
}
