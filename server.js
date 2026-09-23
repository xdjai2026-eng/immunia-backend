// Serveur intermédiaire sécurisé Immunia.ai (Backend v1.0 — corrigé)
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

// ⚠️ SÉCURITÉ : le jeton n'est plus écrit en dur dans le code. L'ancien
// jeton était visible en clair dans ce dépôt GitHub public — révoquez-le
// sur replicate.com/account/api-tokens, puis créez-en un nouveau et
// déposez-le UNIQUEMENT ici : Render → immunia-backend → Environment →
// Add Environment Variable → clé "REPLICATE_API_TOKEN", valeur = le
// nouveau jeton. Render redéploie automatiquement après l'ajout.
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// ⚠️ À COMPLÉTER : quel modèle Replicate voulez-vous appeler ?
// L'ancien code envoyait version:"latest" vers https://replicate.com (le
// site vitrine, pas une API) — ça ne pouvait jamais fonctionner. Ici, on
// appelle la vraie API sur la route /v1/models/{owner}/{model}/predictions,
// qui exécute toujours la dernière version d'un modèle SANS avoir besoin
// d'un hash de version. Remplacez les deux constantes ci-dessous par le
// modèle que vous utilisez : son nom apparaît dans l'URL de sa page
// Replicate, ex. replicate.com/black-forest-labs/flux-schnell donne
// MODEL_OWNER="black-forest-labs" et MODEL_NAME="flux-schnell". Chaque
// page de modèle a aussi un onglet "API" qui montre l'appel exact attendu
// pour CE modèle (le nom du champ d'entrée n'est pas toujours "image") —
// vérifiez-y le nom du champ dans "input" si "image" ne convient pas.
const MODEL_OWNER = "REMPLACER_PAR_LE_PROPRIETAIRE_DU_MODELE";
const MODEL_NAME = "REMPLACER_PAR_LE_NOM_DU_MODELE";

// Route d'envoi de fichier (POST)
app.post('/api/protect', async (req, res) => {
    try {
        const { image_base64 } = req.body;

        if (!image_base64) {
            return res.status(400).json({ error: "Fichier média manquant." });
        }
        if (!REPLICATE_API_TOKEN) {
            return res.status(500).json({ error: "REPLICATE_API_TOKEN non configuré côté serveur (variable d'environnement manquante sur Render)." });
        }

        // 1. Appel sécurisé à la VRAIE API Replicate (api.replicate.com, pas replicate.com)
        const response = await fetch(`https://api.replicate.com/v1/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: { image: image_base64 }
            })
        });

        const prediction = await response.json();

        if (!response.ok || !prediction.id) {
            console.error('Réponse Replicate inattendue:', prediction);
            return res.status(502).json({ error: (prediction && prediction.detail) || "Réponse inattendue du GPU Replicate." });
        }

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
        if (!REPLICATE_API_TOKEN) {
            return res.status(500).json({ error: "REPLICATE_API_TOKEN non configuré côté serveur." });
        }
        const predictionId = req.params.id;
        const resGpu = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` }
        });
        const data = await resGpu.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Impossible de joindre le GPU." });
    }
});

// Route optionnelle de ping pour le réveil (Warm Up)
app.get('/api/warmup', (req, res) => {
    res.json({ status: "ready", message: "Le serveur Immunia de ZIPPA GROUP est éveillé." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur sécurisé Immunia actif sur le port ${PORT}`));
