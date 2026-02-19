export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem vazia" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "API KEY não encontrada" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Você é SYNTRA AI. Responda de forma útil e direta.\n\nUsuário: ${message}`
      })
    });

    const data = await response.json();
    console.log("OPENAI RESPONSE:", data);

    const reply =
      data?.output?.[0]?.content?.[0]?.text ||
      "Desculpe, não consegui responder.";

    res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
}
