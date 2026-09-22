// Serveur intermédiaire sécurisé Immunia.ai (Backend v1.0)
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CONFIGURATION DES AUTORISATIONS CORS SUR MESURE POUR VOTRE VITRINE VERCEL
app.use(cors({
    origin: ["https://immunia-vitrine.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '50mb' })); // Permet de recevoir de lourdes vidéos/photos

// VOTRE CLÉ API REPLICATE CACHÉE SUR LE SERVEUR
const REPLICATE_API_TOKEN = "r8_IpmFh5cNQFoNyAMVX3xkxH4qrMNjaD902C8T3";

// Route d'envoi de fichier (POST)
app.post('/api/protect', async (req, res) => {
    try {
        const { image_base64 } = req.body;

        if (!image_base64) {
            return res.status(400).json({ error: "Fichier média manquant." });
        }

        // 1. Appel sécurisé au serveur GPU Replicate
        const response = await fetch("https://replicate.com", {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: "latest", 
                input: { image: image_base64 }
            })
        });

        const prediction = await response.json();
        
        // 2. Renvoie l'ID de traitement au site Vercel pour le suivi en direct
        res.json({ prediction_id: prediction.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la liaison avec le GPU." });
    }
});

// Route de vérification du statut du GPU (Polling)
app.get('/api/status/:id', async (req, res) => {
    try {
        const predictionId = req.params.id;
        const resGpu = await fetch(`https://replicate.com/${predictionId}`, {
            headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` }
        });
        const data = await resGpu.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Impossible de joindre le GPU." });
    }
});

// Route optionnelle de ping pour le réveil (Warm Up) demandé par le code de Claude
app.get('/api/warmup', (req, res) => {
    res.json({ status: "ready", message: "Le serveur Immunia de ZIPPA GROUP est éveillé." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur sécurisé Immunia actif sur le port ${PORT}`));
