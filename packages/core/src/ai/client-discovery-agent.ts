import { askClaude } from './client.js';
import { logger } from '../logger.js';

export interface ClientDiscoveryResult {
  content: string;
  clientId?: string;
}

const DISCOVERY_PROMPT = `Tu es un expert en qualification de clients et en conseil tech/digital pour les petites entreprises et independants.

CLIENT : {client_name}
ACTIVITE : {business_description}
INFOS DEJA CONNUES : {known_info}

{conversation_context}

TA MISSION :
Genere une liste de questions pertinentes a poser a ce client pour comprendre ses besoins et pouvoir lui proposer la meilleure solution tech (bot, site web, agent IA, automatisation, etc.).

REGLES IMPORTANTES :
1. NE POSE PAS de questions dont la reponse est deja dans les infos connues
2. Priorise les questions les plus critiques en premier dans chaque section
3. Formule les questions de facon naturelle et conversationnelle (pas un interrogatoire)
4. Ajoute des sous-questions optionnelles entre parentheses pour approfondir
5. Adapte les questions au type d'activite du client

STRUCTURE TES QUESTIONS EN 7 THEMES :

📋 COMPREHENSION DU BUSINESS
- Activite exacte, anciennete, taille, revenus approximatifs
- Modele economique (B2B, B2C, les deux ?)
- Zone geographique (local, national, international)

⚙️ TECH ACTUELLE
- Outils utilises (caisse, comptabilite, planning, etc.)
- Presence en ligne (site web, reseaux sociaux, Google Business)
- Communication avec les clients (telephone, email, WhatsApp, etc.)

😤 POINTS DE DOULEUR
- Ce qui prend le plus de temps au quotidien
- Processus manuels et repetitifs
- Frustrations principales
- Ce qu'ils aimeraient automatiser

👥 EQUIPE & PROCESSUS
- Nombre d'employes et roles
- Communication interne
- Qui fait quoi (repartition des taches)
- Niveau tech de l'equipe

🎯 CLIENTS DU CLIENT
- Comment ils acquierent de nouveaux clients
- Comment ils communiquent avec eux
- Fidelisation, suivi, relance
- Volume de clients (par jour/semaine/mois)

💰 BUDGET & TIMELINE
- Fourchette budget pour un projet tech
- Urgence du besoin (immediat, 1-3 mois, 6 mois)
- Priorite numero 1

🚀 VISION
- Objectifs a 6-12 mois
- Envie de croissance (plus de clients, plus de produits, nouveau canal)
- Automatisation souhaitee
- Modele ideal : comment ils voudraient que ca fonctionne

FORMAT :
- Ecris en francais
- PAS d'emojis, PAS de markdown (pas de gras, pas de titres avec des dieses, pas de backticks)
- Ecris les titres de section en MAJUSCULES, par exemple : COMPREHENSION DU BUSINESS
- 3 a 5 questions par theme (pas plus, pas un interrogatoire)
- Chaque question sur une ligne, precedee d'un tiret (-)
- Commence par un titre avec le nom du client et son activite
- Termine par une section "Note pour Magomed" avec les points cles a creuser en priorite
- Reponds directement en texte structure. PAS de JSON. PAS de code.`;

export async function runClientDiscoveryAgent(params: {
  clientName: string;
  businessDescription: string;
  knownInfo?: string;
  conversationHistory?: string;
}): Promise<ClientDiscoveryResult> {
  logger.info({ clientName: params.clientName }, 'Starting client discovery agent');

  let conversationContext = '';
  if (params.conversationHistory) {
    conversationContext = `HISTORIQUE DE CONVERSATION (pour contexte) :\n${params.conversationHistory}`;
  }

  const prompt = DISCOVERY_PROMPT
    .replace('{client_name}', params.clientName)
    .replace('{business_description}', params.businessDescription)
    .replace('{known_info}', params.knownInfo || 'Aucune info supplementaire.')
    .replace('{conversation_context}', conversationContext);

  const response = await askClaude({
    prompt: `Genere les questions de qualification pour ce client. Sois pertinent et adapte au contexte.`,
    systemPrompt: prompt,
    model: 'sonnet',
    maxTokens: 4000,
  });

  logger.info(
    { clientName: params.clientName, responseLength: response.length },
    'Client discovery agent completed'
  );

  return { content: response };
}
