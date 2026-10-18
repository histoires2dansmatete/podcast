/** Réutilisation des icônes et des liens sociaux dans toutes les pages publiques. */
export const instagram='https://www.instagram.com/les_histoires_2_dans_ma_tete/';
export const facebook='https://www.facebook.com/profile.php?id=61587115217827';
const links=(prefix,compact=false)=>[
  ['Instagram',instagram,'instagram.svg'],
  ['Facebook',facebook,'facebook.svg']
].map(([name,url,icon])=>`<a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Les histoires de Dans ma tête sur ${name}" title="Suivez-nous sur ${name}"><img src="${prefix}assets/icons/${icon}" alt="" aria-hidden="true" width="21" height="21">${compact?'':`<span>${name}</span>`}</a>`).join('');
export function applySocialLayout(html,prefix){
 if(!html.includes('class="header-socials"')){
  const controls=`<nav class="header-socials" aria-label="Suivez-nous sur les réseaux sociaux">${links(prefix,true)}</nav>`;
  if(/<nav\b[^>]*\bid="primary-nav"/.test(html)) html=html.replace(/(<nav\b[^>]*\bid="primary-nav"[^>]*>[\s\S]*?<\/nav>)/,`$1${controls}`);
  else html=html.replace(/(<\/div><\/header>)/,`${controls}$1`);
 }
 html=html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/,footer=>{
   // Un seul bloc social, même si npm run build est exécuté plusieurs fois.
   // En V7, le contrôle cherchait class="footer-social-area" (absent car la classe
   // vaut "container footer-social-area") et ajoutait un doublon à chaque build.
   footer=footer.replace(/<div class="container footer-social-area">[\s\S]*?<\/nav><\/div>/g,'');
   footer=footer.replace(/<nav class="social-links"[\s\S]*?<\/nav>/,'');
   const section=`<div class="container footer-social-area"><div class="footer-social-message"><span class="footer-social-eyebrow">✳ RESTONS EN CONTACT</span><strong>Retrouvons-nous pour la suite des histoires !</strong><p>Actualités du podcast, dessins et petits moments de notre univers.</p></div><nav class="footer-social-buttons" aria-label="Nos réseaux sociaux">${links(prefix)}</nav></div>`;
   if(!footer.includes('class="container footer-bottom"'))throw Error('Footer sans .footer-bottom : insertion des liens impossible');
   return footer.replace(/(?=<div class="container footer-bottom"(?:\s[^>]*)?>)/,section);
 });
 return html;
}
