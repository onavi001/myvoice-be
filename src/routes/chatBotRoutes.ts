import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt inválido' });
    }
    return res.status(200).json({
      content: `Respuesta de MyVoice AI (modo fallback): ${prompt}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al procesar chatbot' });
  }
});

export default router;
