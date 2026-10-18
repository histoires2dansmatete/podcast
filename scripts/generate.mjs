import { data, writePublicStories } from './stories.mjs';
const stories = await data();
await writePublicStories(stories);
const withoutText = stories.filter(s=>!s.bodyHtml?.trim()).length;
if (withoutText) console.warn(`ℹ ${withoutText}/${stories.length} histoires sans texte importé : la fiche propose la lecture intégrale sur le blog. Lancez npm run sync:blog ou import:wordpress pour les intégrer.`);
