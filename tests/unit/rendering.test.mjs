import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStory, sanitizeStoryHTML, escapeHtml } from '../../scripts/stories.mjs';
import { isLocalImagePath } from '../../scripts/local-image-path.mjs';
const story={slug:'test-depisode',title:'Le voyage',subtitle:'Un joli conte',description:'Un conte de la forêt',theme:'Amitié',tags:['Amitié'],image:'assets/stories/test-depisode.svg',minutes:'4 min',emoji:'📖',bodyHtml:'<p>Bonjour les enfants.</p>',audioUrl:'',platforms:{}};
test('Le HTML des histoires rejette scripts et attributs actifs',()=>{
 assert.equal(escapeHtml('A < B & C'),'A &lt; B &amp; C');
 const html=sanitizeStoryHTML('<p onclick="steal()">Un récit<script>alert(1)</script> sage</p><iframe src="evil"></iframe>');
 assert.doesNotMatch(html,/<script|<iframe|onclick/);
 assert.match(html,/Un récit/);
});
test('Sans MP3 le récit reste lisible, lecteur désactivé',()=>{
 const html=renderStory(story,0,[story]);
 assert.match(html,/Bientôt dans vos oreilles/);
 assert.doesNotMatch(html,/<audio controls/);
 assert.match(html,/Bonjour les enfants/);
});
test('Le MP3 local déclenche le lecteur HTML5 sur la bonne URL',()=>{
 const html=renderStory({...story,audioUrl:'assets/audio/test-depisode.mp3'},0,[story]);
 assert.match(html,/<audio controls preload="none" src="\.\.\/\.\.\/assets\/audio\/test-depisode\.mp3"/);
 assert.match(html,/Lire cette histoire/);
});
test('L’URL R2 HTTPS et les liens épisode sont intégrés sans créer de faux liens',()=>{
 const html=renderStory({...story,audioUrl:'https://media.example.org/a.mp3',platforms:{spotify:'https://open.spotify.com/episode/123'}},0,[story]);
 assert.match(html,/src="https:\/\/media.example.org\/a.mp3"/);
 assert.match(html,/https:\/\/open.spotify.com\/episode\/123/);
 assert.match(html,/Apple Podcasts/);
 assert.doesNotMatch(html,/href="https:\/\/open.spotify.com\/show\/"/);
});
test('Les chemins d’images ne peuvent sortir de assets',()=>{
 assert.equal(isLocalImagePath('assets/images/optimized/test.webp'),true);
 assert.equal(isLocalImagePath('assets/images/../env.txt'),false);
});
