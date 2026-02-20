export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Método inválido" });
  }

  try {

    const { message } = req.body;
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ reply: "API não configurada" });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-large",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: message
        })
      }
    );

    const data = await response.json();

    const reply = data?.[0]?.generated_text || "IA não respondeu";

    res.status(200).json({ reply });

  } catch (err) {
    console.log(err);
    res.status(200).json({ reply: "Erro ao falar com IA" });
  }

}
