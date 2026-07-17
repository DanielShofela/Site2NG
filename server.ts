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
    if (!rawText || !rawText.trim()) return [];

    // 1. Try splitting into multiple blocks if we have equals/dash separators
    let rawBlocks: string[] = [];
    if (/(?:\r?\n|^)\s*={5,}\s*(?:\r?\n|$)/.test(rawText)) {
      rawBlocks = rawText.split(/(?:\r?\n|^)\s*={5,}\s*(?:\r?\n|$)/);
    } else if (/(?:\r?\n|^)\s*-{5,}\s*(?:\r?\n|$)/.test(rawText)) {
      rawBlocks = rawText.split(/(?:\r?\n|^)\s*-{5,}\s*(?:\r?\n|$)/);
    } else {
      // Just keep as single block
      rawBlocks = [rawText];
    }

    rawBlocks = rawBlocks.map(b => b.trim()).filter(b => b.length > 0);

    const FIELD_DEFINITIONS = [
      { key: 'title', labels: ['intitule du poste', 'intitulé du poste', 'titre du poste', 'intitule', 'intitulé', 'titre', 'job title', 'poste', 'title'] },
      { key: 'companyName', labels: ["nom de l'entreprise", "nom de l'entreprise", "nom de l'entreprise", "entreprise", "societe", "société", "company name", "company"] },
      { key: 'location', labels: ['localisation', 'lieu', 'ville', 'adresse', 'location'] },
      { key: 'type', labels: ['type de contrat', 'type de contrat', 'contrat', 'contract type', 'contract'] },
      { key: 'experienceYears', labels: ['experience requise', 'expérience requise', 'experience level', 'experience', 'expérience', 'experience years'] },
      { key: 'salary', labels: ['salaire estimatif', 'salaire', 'remuneration', 'rémunération', 'salary'] },
      { key: 'studyLevels', labels: ["niveau d'etudes", "niveau d'études", "niveau d'etude", "niveau d'étude", "etudes", "études", "diplome", "diplôme", "education level", "education"] },
      { key: 'description', labels: ['description complete du poste', 'description complète du poste', 'description du poste', 'description', 'job description'] },
      { key: 'requirements', labels: ['missions & exigences du profil', 'missions & exigences', 'missions', 'exigences du profil', 'exigences', 'profil recherche', 'profil recherché', 'requirements'] },
      { key: 'requiredDocs', labels: ['documents demandes', 'documents demandés', 'pieces demandees', 'pièces demandées', 'documents requis', 'documents', 'required docs'] },
      { key: 'offer_type', labels: ['canal de candidature', 'canal', 'apply method'] },
      { key: 'external_apply_email', labels: ['email relais externe', 'email relais', 'email de contact', 'email', 'contact email'] },
      { key: 'phone', labels: ['telephone', 'téléphone', 'tel', 'phone'] },
      { key: 'whatsapp', labels: ['whatsapp', 'contact whatsapp'] },
      { key: 'external_apply_link', labels: ['lien de candidature', 'lien', 'apply link', 'link'] }
    ];

    const cleanValue = (val: string): string => {
      if (!val) return '';
      return val
        .trim()
        .replace(/^(\*\*|\*|["'•\-\s:])*/g, '') // strip starting markdown markers, list symbols, or stray colons
        .replace(/(\*\*|\*|["'\s])*$/g, '')   // strip ending bold/italic markers
        .trim();
    };

    return rawBlocks.map((block) => {
      const occurrences: { key: string; index: number; length: number }[] = [];

      // Scan for fields in current block
      for (const field of FIELD_DEFINITIONS) {
        let earliestMatch: { index: number; length: number } | null = null;
        for (const label of field.labels) {
          const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`(?:^|\\n)\\s*[-*•]*\\s*\\**\\s*(${escapedLabel})\\s*\\**\\s*[:=-]\\s*`, 'i');
          const match = regex.exec(block);
          if (match) {
            if (earliestMatch === null || match.index < earliestMatch.index) {
              earliestMatch = { index: match.index, length: match[0].length };
            }
          }
        }
        if (earliestMatch !== null) {
          occurrences.push({
            key: field.key,
            index: earliestMatch.index,
            length: earliestMatch.length
          });
        }
      }

      // If we didn't find enough structured field labels (less than 2), use the heuristic parser
      if (occurrences.length < 2) {
        const lines = block.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
        const firstLine = lines[0] || 'Poste sans titre';
        let title = firstLine.replace(/^\d+[\s.)-]+\s*/, '');
        if (title.length > 80) {
          title = title.substring(0, 80) + '...';
        }

        let companyName = 'Non spécifié';
        const companyMatch = block.match(/(?:chez|société|entreprise|societe|groupe)\s+([A-Z\d][a-zA-Z0-9\s_.-]{1,25})/i);
        if (companyMatch && companyMatch[1]) {
          companyName = companyMatch[1].trim();
        }

        let external_apply_email = '';
        const emailMatch = block.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          external_apply_email = emailMatch[0];
        }

        let phone = '';
        let whatsapp = '';
        const phoneMatches = block.match(/(?:\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}/g);
        if (phoneMatches) {
          if (phoneMatches[0]) phone = phoneMatches[0].trim();
          if (phoneMatches[1]) whatsapp = phoneMatches[1].trim();
        }

        let external_apply_link = '';
        const linkMatch = block.match(/https?:\/\/[^\s]+[^\s.,;:!]/);
        if (linkMatch) {
          external_apply_link = linkMatch[0];
        }

        let contactInfo = '';
        if (external_apply_email) contactInfo += `Email: ${external_apply_email} `;
        if (phone) contactInfo += `Tél: ${phone} `;
        if (whatsapp) contactInfo += `WhatsApp: ${whatsapp} `;
        if (external_apply_link) contactInfo += `Lien: ${external_apply_link}`;
        contactInfo = contactInfo.trim() || 'Non spécifié';

        let salary = '';
        const salaryMatch = block.match(/\d+[\s.]?(?:k|FCA|CFA|FCFA|F\s?CFA|euros|€|francs)/i);
        if (salaryMatch) {
          salary = salaryMatch[0];
        }

        let location = "Abidjan, Côte d'Ivoire";
        const locMatch = block.match(/(?:à|a|dans la ville de|localisation)\s+([A-Z][a-zA-Z\s_.-]{2,15})/i);
        if (locMatch && locMatch[1]) {
          location = locMatch[1].trim() + ", Côte d'Ivoire";
        }

        let type = 'CDI';
        if (/cdd/i.test(block)) type = 'CDD';
        else if (/stage/i.test(block)) type = 'Stage';
        else if (/interim/i.test(block)) type = 'Intérim';

        let experienceYears = '';
        const expMatch = block.match(/(\d+)\s*ans?\s+d['’]exp/i);
        if (expMatch && expMatch[1]) {
          experienceYears = `${expMatch[1]} ans`;
        }

        const studyLevels: string[] = [];
        if (/bac\s*\+\s*2/i.test(block)) studyLevels.push('Bac+2');
        if (/bac\s*\+\s*3/i.test(block)) studyLevels.push('Bac+3');
        if (/bac\s*\+\s*5/i.test(block)) studyLevels.push('Bac+5');
        if (/bac/i.test(block) && studyLevels.length === 0) studyLevels.push('Bac');

        const requiredDocs: string[] = [];
        if (/cv/i.test(block)) requiredDocs.push('CV');
        if (/lettre/i.test(block) || /lm/i.test(block)) requiredDocs.push('Lettre de motivation');

        return {
          title,
          companyName,
          description: block,
          requirements: lines.length > 1 ? lines.slice(1).join(', ') : 'Se référer à la description.',
          location,
          salary,
          contactInfo,
          type,
          experienceYears,
          studyLevels,
          requiredDocs,
          phone,
          whatsapp: whatsapp || (block.toLowerCase().includes('whatsapp') ? phone : ''),
          external_apply_link,
          external_apply_email
        };
      }

      // Sort occurrences by index to parse values
      occurrences.sort((a, b) => a.index - b.index);
      const parsedData: Record<string, string> = {};

      for (let i = 0; i < occurrences.length; i++) {
        const current = occurrences[i];
        const startOfValue = current.index + current.length;
        const endOfValue = (i + 1 < occurrences.length) ? occurrences[i + 1].index : block.length;
        const rawValue = block.substring(startOfValue, endOfValue);
        parsedData[current.key] = cleanValue(rawValue);
      }

      // Format clean list structures
      const rawStudy = parsedData.studyLevels || '';
      const parsedStudy = rawStudy ? rawStudy.split(/[,;\n]+/).map(s => cleanValue(s)).filter(Boolean) : [];

      const rawDocs = parsedData.requiredDocs || '';
      const parsedDocs = rawDocs ? rawDocs.split(/[,;\n]+/).map(s => cleanValue(s)).filter(Boolean) : [];

      let contactInfo = '';
      if (parsedData.external_apply_email) contactInfo += `Email: ${parsedData.external_apply_email} `;
      if (parsedData.phone) contactInfo += `Tél: ${parsedData.phone} `;
      if (parsedData.whatsapp) contactInfo += `WhatsApp: ${parsedData.whatsapp} `;
      if (parsedData.external_apply_link) contactInfo += `Lien: ${parsedData.external_apply_link}`;
      contactInfo = contactInfo.trim() || 'Non spécifié';

      return {
        title: parsedData.title || 'Intitulé non spécifié',
        companyName: parsedData.companyName || 'Non spécifié',
        description: parsedData.description || block,
        requirements: parsedData.requirements || '',
        location: parsedData.location || "Abidjan, Côte d'Ivoire",
        salary: parsedData.salary || '',
        contactInfo,
        type: parsedData.type || 'CDI',
        experienceYears: parsedData.experienceYears || '',
        studyLevels: parsedStudy,
        requiredDocs: parsedDocs,
        phone: parsedData.phone || '',
        whatsapp: parsedData.whatsapp || '',
        external_apply_link: parsedData.external_apply_link || '',
        external_apply_email: parsedData.external_apply_email || ''
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
- Extrais fidèlement le titre du poste (title), l'entreprise (companyName), la description (description), les exigences/prérequis (requirements), le lieu de travail (location), le salaire (salary), et les informations de contact (contactInfo).
- Extrais aussi le type de contrat (CDI, CDD, Stage, Intérim, Freelance, etc. sous 'type'), l'expérience requise (ex: '2 ans' sous 'experienceYears'), le niveau d'études (ex: ['Bac+2'] sous 'studyLevels'), les documents requis (ex: ['CV', 'Lettre de motivation'] sous 'requiredDocs'), le téléphone (phone), le numéro WhatsApp (whatsapp), le lien direct (external_apply_link), et l'adresse email de contact (external_apply_email).
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
                contactInfo: { type: Type.STRING, description: "Numéro de téléphone, email ou lien de contact général" },
                type: { type: Type.STRING, description: "Type de contrat (CDI, CDD, Stage, Intérim, etc.)" },
                experienceYears: { type: Type.STRING, description: "Années d'expérience exigées (ex: '2 ans')" },
                studyLevels: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Niveau d'études requis (ex: ['Bac+2', 'Bac+5'])" 
                },
                requiredDocs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Documents demandés pour postuler (ex: ['CV', 'Lettre de motivation'])"
                },
                phone: { type: Type.STRING, description: "Numéro de téléphone direct" },
                whatsapp: { type: Type.STRING, description: "Numéro WhatsApp de contact" },
                external_apply_link: { type: Type.STRING, description: "Lien URL direct pour postuler" },
                external_apply_email: { type: Type.STRING, description: "Adresse e-mail externe de contact" }
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
