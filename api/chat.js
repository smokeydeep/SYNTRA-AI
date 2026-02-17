export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Nenhuma mensagem recebida' });
    }

    // Verifica se a chave da OpenAI está definida
    if (!process.env.OPENAI_API_KEY) {
      console.error("API Key da OpenAI não encontrada!");
      return res.status(500).json({ error: 'API Key da OpenAI não configurada' });
    }

    // Faz a requisição para a OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "Você é SYNTRA AI. Responda direto e correto." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();

    console.log("Resposta da OpenAI:", data); // debug

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(500).json({ error: 'Resposta inválida da OpenAI' });
    }

    const reply = data.choices[0].message.content;
    res.status(200).json({ reply });

  } catch (error) {
    console.error("Erro no backend:", error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
}
