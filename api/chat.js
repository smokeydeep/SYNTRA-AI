export default async function handler(req, res) {
  res.status(200).json({
    keyExiste: !!process.env.HUGGINGFACE_API_KEY
  });
}
