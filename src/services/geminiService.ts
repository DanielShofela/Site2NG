export const generateCVAdvice = async (jobTitle: string): Promise<string> => {
  try {
    const response = await fetch('/api/cvlm/generate-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'cv',
        jobTitle
      })
    });
    
    if (!response.ok) {
      throw new Error('Erreur réseau lors de la récupération des conseils.');
    }
    
    const data = await response.json();
    return data.advice || 'Aucun conseil généré.';
  } catch (error) {
    console.error('Error fetching CV advice', error);
    return `### 💡 Conseils pour le poste de **${jobTitle || 'Candidat'}** (Mode hors-ligne)\n\n1. **Valorisez vos réalisations concrètes** : Utilisez des chiffres précis (ex: augmentation de 15% de productivité).\n2. **Mots-clés du secteur** : Intégrez les compétences clés et le vocabulaire technique recherchés par les recruteurs.\n3. **Mise en page épurée** : Limitez le contenu à 1 page, claire, organisée et percutante.`;
  }
};

export const generateLMAdvice = async (content: string): Promise<string> => {
  try {
    const response = await fetch('/api/cvlm/generate-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'lm',
        content
      })
    });
    
    if (!response.ok) {
      throw new Error('Erreur réseau lors de l\'amélioration de la lettre.');
    }
    
    const data = await response.json();
    return data.advice || 'Aucune suggestion générée.';
  } catch (error) {
    console.error('Error fetching LM advice', error);
    return `### ✍️ Suggestions de style professionnel (Mode hors-ligne)\n\n- **Impact d'accroche** : Formulez précisément votre proposition de valeur dès l'introduction.\n- **Lien avec la cible** : Mettez en avant vos compétences qui résonnent avec les besoins réels du recruteur.\n- **Appel à l'action** : Proposez poliment une rencontre directe ou un entretien téléphonique.`;
  }
};
