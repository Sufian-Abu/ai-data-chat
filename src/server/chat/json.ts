export function parseJsonRobust(raw: string) {
    const t = (raw || "").trim();
    if (!t) throw new Error("Empty model response");
  
    try {
      return JSON.parse(t);
    } catch {
      const start = t.indexOf("{");
      const end = t.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) throw new Error("Invalid JSON from LLM");
      return JSON.parse(t.slice(start, end + 1));
    }
  }  