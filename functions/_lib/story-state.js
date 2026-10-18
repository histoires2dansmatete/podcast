/** Etat éditorial : une absence de ligne vaut "publiée".
 * En production D1 est obligatoire ; aucun accès public à un récit si D1 échoue.
 */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const statesHeaders = { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
export async function disabledStories(env) {
  if (!env?.ANALYTICS_DB) throw new Error('Base D1 ANALYTICS_DB manquante');
  const result = await env.ANALYTICS_DB.prepare('SELECT slug FROM story_states WHERE enabled = 0').all();
  return new Set((result.results || []).map(r => r.slug));
}
export const publicStories = (stories,disabled) => stories.filter(s=>!disabled.has(s.slug)).map(({bodyHtml,source,...story})=>story);
export function removeXmlItems(xml,disabled,tag){
 return xml.replace(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'g'),(node)=>{
   for(const slug of disabled) if(node.includes(`/histoires/${slug}/`)) return '';
   return node;
 });
}
export const isStoryPath = path => {
 const m=path.match(/^\/histoires\/([a-z0-9-]+)(?:\/(?:index\.html)?)?$/);
 return m ? m[1] : null;
};
