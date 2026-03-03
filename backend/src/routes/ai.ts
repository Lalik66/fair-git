import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

const SYSTEM_PROMPT = `Siz Şəhər Yarmarkasının rəsmi virtual köməkçisisiniz.
Ziyarətçilərə və iştirakçılara tədbir haqqında dəqiq, qısa və nəzakətli məlumat təqdim edin.
Cavablarınızı Azərbaycan dilində lakonik, aydın və hörmətcil formada verin.
Əgər məlumat mövcud deyilsə, bunu açıq şəkildə bildirin və istifadəçini əlaqə bölməsinə yönləndirin.

Əsas mövzular:
– Tədbirin tarixi və vaxtı
– Məkan
– İştirak qaydaları
– Stend icarəsi və qeydiyyat
– Proqram və əyləncələr
– Əlaqə məlumatları

Hər zaman rəsmi və etibarlı üslubu qoruyun. İstifadəçi hansı dildə müraciət edərsə, cavabı eyni dildə təqdim edin (Azərbaycan, İngilis və ya Rus dili).
`;

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'AI chat is not configured',
        message: 'GEMINI_API_KEY is missing. Please add it to your .env file.',
      });
      return;
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(trimmedMessage);
    const response = result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('AI chat error:', error);
    const err = error as Error & { message?: string } | undefined;
    res.status(500).json({
      error: 'Failed to get AI response',
      message: process.env.NODE_ENV === 'development' ? err?.message : 'Something went wrong. Please try again.',
    });
  }
});

export default router;
