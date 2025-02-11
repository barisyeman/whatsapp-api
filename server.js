const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = 3000;

let client;
let isReady = false;

app.use(bodyParser.json());

// Yeni WhatsApp istemcisini başlat
function startClient() {
    client = new Client({
        authStrategy: new LocalAuth(), // Oturumu kaydederek QR kodu sürekli istememesini sağlar
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('QR Kodu oluşturuldu, taratın:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('WhatsApp bağlantısı kuruldu!');
        isReady = true;
    });

    client.on('disconnected', () => {
        console.log('Bağlantı kesildi! QR kodu yeniden oluşturulacak...');
        isReady = false;
        startClient(); // Bağlantı koptuğunda yeniden başlat
    });

    client.initialize();
}

// API üzerinden mesaj gönderme
app.post('/send', async (req, res) => {
    if (!isReady) {
        return res.status(500).json({ success: false, message: "WhatsApp bağlantısı yok, lütfen QR kodunu taratın." });
    }

    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ success: false, message: "Numara ve mesaj zorunludur." });
    }

    const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true, message: "Mesaj gönderildi." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Mesaj gönderilirken hata oluştu.", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`API http://localhost:${PORT} üzerinde çalışıyor`);
    startClient(); // Sunucu açıldığında WhatsApp istemcisini başlat
});

