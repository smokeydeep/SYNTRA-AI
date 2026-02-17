export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  try {

    const pergunta = req.body.message;

    const resposta = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": Bearer ${process.env.OPENAI_API_KEY},
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: pergunta
      })
    });

    const dados = await resposta.json();

    res.status(200).json({
      resposta: dados.output[0].content[0].text
    });

  } catch (erro) {
    res.status(500).json({ erro: "Erro no servidor" });
  }

}
