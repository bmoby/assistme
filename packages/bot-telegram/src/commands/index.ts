import type { Bot } from 'grammy';
import { registerPlanCommand } from './plan.js';
import { registerTaskCommands } from './tasks.js';
import { registerClientCommands } from './clients.js';
import { registerKbCommand } from './kb.js';
import { registerNotifsCommand } from './notifs.js';
import { registerVoiceCommand } from './voice.js';
import { isAdmin } from '../utils/auth.js';

export function registerCommands(bot: Bot): void {
  // /start
  bot.command('start', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('Ce bot est prive.');
      return;
    }
    await ctx.reply(
      `Salut ! Je suis ton Copilote.\n\nCommandes :\n` +
        `/plan — Plan du jour\n` +
        `/next — Prochaine tache\n` +
        `/done — Marquer comme fait\n` +
        `/add [texte] — Ajouter une tache\n` +
        `/tasks — Toutes les taches\n` +
        `/skip — Passer la tache\n` +
        `/clients — Pipeline clients\n` +
        `/client [nom] — Details client\n` +
        `/newclient [nom] — [besoin] — [budget]\n` +
        `/kb — Gerer la base de connaissances du bot public\n` +
        `/notifs — Voir/regler les notifications (ex: /notifs 20)\n` +
        `/replan — Replanifier les notifications\n` +
        `/voice — Activer/desactiver les reponses vocales\n\n` +
        `Ou envoie un message libre, je comprendrai.`
    );
  });

  registerPlanCommand(bot);
  registerTaskCommands(bot);
  registerClientCommands(bot);
  registerKbCommand(bot);
  registerNotifsCommand(bot);
  registerVoiceCommand(bot);
}
