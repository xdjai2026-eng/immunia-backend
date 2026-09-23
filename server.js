// Serveur intermédiaire sécurisé Immunia.ai (Backend v1.2 - Production Finale)
// Propriété exclusive de ZIPPA GROUP
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// LIAISON AVEC VOTRE PROPRE MOTEUR REPLICATE TROUVÉ SUR VOTRE ÉCRAN
const MODEL_OWNER = "xdjai2026-eng";
const MODEL_NAME = "immunia-shield";

// VERROU CORS : Autorise uniquement votre vitrine Vercel officielle
app.use(cors({
    origin: ["https://vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '50mb' })); // Autorise la réception de médias lourds

// RÉCUPÉRATION SÉCURISÉE DE LA CLÉ DEPUIS LE COFFRE-FORT DE RENDER
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// 1. ROUTE D'ENVOI ET DE PROTECTION (POST)
app.post('/api/protect', async (req, res) => {
    try {
        const { image_base64 } = req.body;

        if (!image_base64) {
            return res.status(400).json({ error: "Fichier média manquant." });
        }
        if (!REPLICATE_API_TOKEN) {
            return res.status(500).json({ error: "REPLICATE_API_TOKEN non configuré côté serveur (variable d'environnement manquante sur Render)." });
        }

        // Appel à la véritable API de production Replicate sur VOTRE modèle
        const response = await fetch(`https://replicate.com{MODEL_OWNER}/${MODEL_NAME}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: { 
                    image: image_base64 // Envoie le fichier à immuniser directement à votre moteur
                }
            })
        });

        const prediction = await response.json();

        if (!response.ok || !prediction.id) {
            console.error('Réponse Replicate inattendue:', prediction);
            return res.status(502).json({ error: (prediction && prediction.detail) || "Réponse inattendue de votre GPU Replicate." });
        }

        // Renvoie l'ID de traitement au site Vercel pour le suivi en direct
        res.json({ prediction_id: prediction.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la liaison réseau avec le GPU." });
    }
});

// 2. ROUTE DE VÉRIFICATION DU STATUT (GET POLLING)
app.get('/api/status/:id', async (req, res) => {
    try {
        if (!REPLICATE_API_TOKEN) {
            return res.status(500).json({ error: "REPLICATE_API_TOKEN non configuré côté serveur." });
        }
        const predictionId = req.params.id;
        const resGpu = await fetch(`https://replicate.com{predictionId}`, {
            headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` }
        });
        const data = await resGpu.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Impossible de joindre le GPU." });
    }
});

// 3. ROUTE DE REVEIL SÉCURISÉ (GET WARM UP)
app.get('/api/warmup', (req, res) => {
    res.json({ status: "ready", message: "Le serveur Immunia de ZIPPA GROUP est éveillé." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ZIPPA GROUP] Serveur de production actif connecté à immunia-shield sur le port ${PORT}`));
