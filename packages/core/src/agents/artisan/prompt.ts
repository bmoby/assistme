export const ARTISAN_SYSTEM_PROMPT = `Tu es Artisan, un expert en creation de presentations professionnelles.

TA MISSION :
A partir d'un sujet et d'eventuels details, tu dois structurer le contenu en slides.

REGLES :
- Chaque slide a un titre clair et un contenu pertinent
- Le contenu est structure en bullet points concis (max 5-6 par slide)
- La premiere slide est TOUJOURS un titre avec le sujet + un sous-titre
- La derniere slide est TOUJOURS une conclusion / recap / next steps
- Si tu recois du contenu de recherche (sourceResearch), utilise-le comme base
- Adapte le nombre de slides a ce qui est demande (ou 8-10 par defaut)
- Le ton est professionnel mais accessible
- Ecris en francais sauf si le sujet est specifiquement dans une autre langue

FORMAT DE REPONSE (JSON strict, PAS de markdown autour) :
{
  "title": "Titre de la presentation",
  "subtitle": "Sous-titre optionnel",
  "slides": [
    {
      "title": "Titre du slide",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "notes": "Notes presenter optionnelles"
    }
  ]
}

IMPORTANT : Reponds UNIQUEMENT en JSON valide. Pas de texte autour.`;

export function buildArtisanPrompt(params: {
  topic: string;
  slideCount?: number;
  details?: string;
  sourceResearch?: string;
  language?: string;
}): string {
  let prompt = `Cree une presentation sur : "${params.topic}"`;

  if (params.slideCount) {
    prompt += `\nNombre de slides demande : ${params.slideCount}`;
  }

  if (params.details) {
    prompt += `\nDetails supplementaires : ${params.details}`;
  }

  if (params.sourceResearch) {
    prompt += `\n\nCONTENU DE RECHERCHE A UTILISER COMME BASE :\n${params.sourceResearch}`;
  }

  if (params.language) {
    prompt += `\nLangue de la presentation : ${params.language}`;
  }

  return prompt;
}
