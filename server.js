const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Промпт не может быть пустым' });
    }

    // Ключ берётся из переменной окружения TOGETHER_API_KEY,
    // которую ты задаёшь в настройках Render (Environment → Add Environment Variable).
    // В код его вставлять НЕЛЬЗЯ — иначе он утечёт на GitHub.
    if (!process.env.TOGETHER_API_KEY) {
        return res.status(500).json({ error: 'Сервер не настроен: отсутствует TOGETHER_API_KEY' });
    }

    try {
        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
            },
            body: JSON.stringify({
                model: 'black-forest-labs/FLUX.1-schnell-Free',
                prompt: prompt.trim(),
                width: 1024,
                height: 1024,
                steps: 4,
                n: 1,
                response_format: 'b64_json'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Together Error:', response.status, errText);
            if (response.status === 429) {
                return res.status(429).json({ error: 'Слишком частые запросы. Подожди 10 секунд и попробуй снова.' });
            }
            if (response.status === 401) {
                return res.status(401).json({ error: 'Неверный или просроченный API-ключ Together AI.' });
            }
            return res.status(response.status).json({ error: `Ошибка Together (${response.status}). Попробуй ещё раз.` });
        }

        const data = await response.json();

        if (!data.data || !data.data[0] || !data.data[0].b64_json) {
            return res.status(500).json({ error: 'Together не вернул изображение. Попробуй ещё раз.' });
        }

        const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);

    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: 'Внутренняя ошибка сервера. Проверь интернет.' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});