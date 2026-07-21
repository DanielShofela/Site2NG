/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Lazy-initialized Gemini AI client for server-side safety
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("La clé d'API 'GEMINI_API_KEY' est manquante. Veuillez la configurer dans l'onglet 'Settings > Secrets' (Paramètres > Secrets) de la plateforme AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing
  app.use(express.json());

  // 1. Proxy /__/auth/* to ngsite-d9cdc.firebaseapp.com/__/auth/*
  // This solves third-party cookie restrictions under custom domains like 2ngentreprises.com
  app.use('/__/auth', createProxyMiddleware({
    target: 'https://ngsite-d9cdc.firebaseapp.com',
    changeOrigin: true,
    pathRewrite: (path) => {
      return '/__/auth' + path;
    },
  }));

  // Simple API or health routes can go here
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', domain: '2ngentreprises.com' });
  });

  // Fallback offline parser when Gemini API key is missing
  const fallbackParseOffers = (rawText: string): any[] => {
    const lines = rawText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      if (/^\d+[\s.)-]/.test(line) || line.toLowerCase().includes('poste') || line.toLowerCase().includes('recrutement :')) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    if (blocks.length === 0 && lines.length > 0) {
      blocks.push(lines);
    }

    return blocks.map((block) => {
      const text = block.join('\n');
      const firstLine = block[0] || 'Poste sans titre';

      let title = firstLine.replace(/^\d+[\s.)-]+\s*/, '');
      if (title.length > 80) {
        title = title.substring(0, 80) + '...';
      }

      let companyName = 'Non spécifié';
      const companyMatch = text.match(/(?:chez|société|entreprise|societe|groupe)\s+([A-Z\d][a-zA-Z0-9\s_.-]{1,25})/i);
      if (companyMatch && companyMatch[1]) {
        companyName = companyMatch[1].trim();
      }

      let contactInfo = '';
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const phoneMatch = text.match(/(?:\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/);
      if (emailMatch) {
        contactInfo = emailMatch[0];
      } else if (phoneMatch) {
        contactInfo = phoneMatch[0];
      }

      let salary = '';
      const salaryMatch = text.match(/\d+[\s.]?(?:k|FCA|CFA|FCFA|F\s?CFA|euros|€|francs)/i);
      if (salaryMatch) {
        salary = salaryMatch[0];
      }

      let location = "Abidjan, Côte d'Ivoire";
      const locMatch = text.match(/(?:à|a|dans la ville de)\s+([A-Z][a-zA-Z\s_.-]{2,15})/i);
      if (locMatch && locMatch[1]) {
        location = locMatch[1].trim() + ", Côte d'Ivoire";
      }

      return {
        title,
        companyName,
        description: text,
        requirements: block.length > 1 ? block.slice(1).join(', ') : 'Se référer à la description.',
        location,
        salary,
        contactInfo
      };
    });
  };

  // AI-Powered Smart Inbox parser
  app.post('/api/parse-offers', async (req, res) => {
    try {
      const { rawText, parseMode } = req.body;
      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        res.status(400).json({ error: 'Texte brut manquant ou invalide.' });
        return;
      }

      // If user explicitly chose 'local' mode, bypass Gemini completely
      if (parseMode === 'local') {
        const offers = fallbackParseOffers(rawText);
        res.json({ offers });
        return;
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.warn("GEMINI_API_KEY is missing. Falling back to regex-based local parser.");
        const offers = fallbackParseOffers(rawText);
        res.json({
          offers,
          warning: "La clé d'API 'GEMINI_API_KEY' n'est pas configurée dans AI Studio. Le traitement a été effectué par le parseur local de secours. Pour des résultats optimaux, configurez votre clé Gemini dans les paramètres de l'application."
        });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Tu es un assistant de recrutement expert. Analyse le texte brut ci-dessous qui contient une ou plusieurs offres d'emploi (souvent copiées-collées d'un seul bloc ou séparées).
Identifie chaque offre d'emploi de manière distincte et extrait ses détails clés.
Convertis le résultat sous forme d'un tableau JSON d'offres respectant le schéma demandé.

Règles d'extraction :
- Si plusieurs offres sont présentes, sépare-les bien dans le tableau de sortie.
- Si le nom de l'entreprise n'est pas spécifié, utilise "Non spécifié".
- Extrais le titre du poste (title), l'entreprise (companyName), la description (description), les exigences/prérequis (requirements), le lieu de travail (location), le salaire (salary), et les informations de contact (contactInfo).
- Reste fidèle aux informations fournies dans le texte sans inventer de détails fictifs.

Texte à analyser :
${rawText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Titre du poste" },
                companyName: { type: Type.STRING, description: "Nom de l'entreprise ou 'Non spécifié'" },
                description: { type: Type.STRING, description: "Description complète du poste" },
                requirements: { type: Type.STRING, description: "Exigences, prérequis ou compétences demandées" },
                location: { type: Type.STRING, description: "Lieu de travail ou ville" },
                salary: { type: Type.STRING, description: "Salaire ou rémunération si mentionné, sinon vide" },
                contactInfo: { type: Type.STRING, description: "Numéro de téléphone, email ou lien de contact" }
              },
              required: ["title", "companyName", "description"]
            }
          }
        }
      });

      const parsedText = response.text;
      if (!parsedText) {
        res.status(500).json({ error: "Le modèle n'a pas renvoyé de texte." });
        return;
      }

      const offers = JSON.parse(parsedText);
      res.json({ offers });
    } catch (error: any) {
      console.error('Error parsing offers with Gemini:', error);
      
      // Fallback to local offline parser upon any Gemini error (e.g. 403 Permission Denied, limits, or invalid key)
      try {
        const { rawText } = req.body;
        const offers = fallbackParseOffers(rawText || '');
        
        let errorMessage = error.message || String(error);
        if (errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("project has been denied access")) {
          errorMessage = "Votre clé d'API Gemini (ou votre projet Google Cloud/AI Studio) n'a pas les autorisations nécessaires (Erreur 403 PERMISSION_DENIED). Veuillez vérifier vos restrictions d'API ou de facturation dans la console Google Cloud.";
        }
        
        res.json({ 
          offers, 
          warning: `Une erreur est survenue avec l'API Gemini (${errorMessage}). Le système a automatiquement activé le parseur local de secours pour traiter vos offres.`
        });
      } catch (fallbackError) {
        res.status(500).json({ error: error.message || 'Une erreur est survenue lors de l\'analyse.' });
      }
    }
  });

  // Gemini API CVLM Advice Endpoint
  app.post('/api/cvlm/generate-advice', async (req, res) => {
    try {
      const { type, jobTitle, content } = req.body;
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        // Return structured backup advice if Gemini is not configured
        if (type === 'cv') {
          res.json({
            advice: `### 💡 Conseils pour le poste de **${jobTitle || 'Candidat'}** (Mode hors-ligne)\n\n1. **Valorisez vos réalisations concrètes** : Utilisez des chiffres précis (ex: augmentation du chiffre d'affaires de 15% ou gestion de 5 projets simultanés).\n2. **Mots-clés pertinents** : Intégrez les termes recherchés par les recruteurs du secteur dans votre CV pour passer les filtres d'algorithmes (ATS).\n3. **Clarté & concision** : Optez pour un CV d'une seule page, aéré, structuré et facile à lire.`
          });
        } else {
          res.json({
            advice: `### ✍️ Suggestions de style professionnel (Mode hors-ligne)\n\n- **Impact d'accroche** : Expliquez clairement ce que vous pouvez apporter à l'entreprise dès l'introduction.\n- **Lien de valeur** : Faites concorder l'actualité de l'entreprise ou ses défis avec vos compétences uniques.\n- **Appel à l'action** : Terminez par une formule dynamique mais polie pour solliciter un entretien direct.`
          });
        }
        return;
      }

      const ai = getGeminiClient();
      let prompt = '';
      if (type === 'cv') {
        prompt = `Donne-moi 3 conseils percutants pour améliorer un CV de "${jobTitle || 'Candidat'}" pour le marché professionnel francophone. Sois très direct, inspirant et concret. Formate ta réponse en markdown structuré.`;
      } else {
        prompt = `Améliore ou critique de manière constructive cette lettre de motivation avec un style professionnel, élégant et mémorable en français :\n\n${content || ''}\n\nDonne-moi des points clés d'amélioration et des conseils de tournures de phrase en markdown structuré.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const parsedText = response.text;
      res.json({ advice: parsedText || 'Aucun conseil généré.' });
    } catch (error: any) {
      console.error('Error in CVLM advice generation:', error);
      res.status(500).json({ error: error.message || 'Une erreur est survenue lors de la génération de conseils.' });
    }
  });

  // 2. Serve Client application based on environment
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting development server wrapper with Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production static build assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
