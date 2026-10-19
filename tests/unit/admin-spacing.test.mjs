import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Les panneaux des statistiques gardent un espacement identique aux autres grilles',async()=>{
  const css=await readFile('site/assets/admin.css','utf8');
  assert.match(css,/\.dashboard-grid\{[^}]*gap:20px;margin-top:20px/);
  assert.match(css,/\.admin-area \.dashboard-grid\{margin-top:20px\}/);
  assert.doesNotMatch(css,/\.admin-area \.dashboard-grid\{margin-top:0\}/);
});
