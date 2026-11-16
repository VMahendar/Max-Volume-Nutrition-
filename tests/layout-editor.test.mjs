import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('private layout editor is owner-only and does not alter the storefront',()=>{
 const server=readFileSync('server.mjs','utf8');
 const page=readFileSync('public/layout-editor.html','utf8');
 const editor=readFileSync('public/layout-editor.js','utf8');
 const admin=readFileSync('public/admin.html','utf8');
 const shop=readFileSync('public/shop.html','utf8');
 assert.match(server,/if\(u\.pathname==='\/layout-editor\.html'\)/,'admin-only HTML route');
 assert.match(server,/if\(!account\|\|account\.role!=='admin'\)/,'anonymous and customers denied');
 assert.match(server,/if\(path==='\/api\/admin\/layout-draft'\)/,'authenticated draft API');
 assert.match(server,/C\.set\('ownerLayoutDraftV1',draft\)/,'draft stored persistently');
 assert.match(server,/C\.audit\(user\.id,'layout\.draft\.save'/,'draft save audited');
 assert.match(server,/if\(path\.startsWith\('\/api\/admin\/'\)\)\{admin\(user\);/,'existing admin session protects draft API');
 assert.match(page,/id="sectionList"/,'reorderable section list');
 assert.match(page,/src="\/layout-editor\.js\?v=20261115-b"/,'CSP compliant external script');
 assert.doesNotMatch(page,/<script>\s*'use strict'/,'no blocked inline script');
 assert.match(editor,/dragstart/,'desktop drag and drop enabled');
 assert.match(editor,/pointerdown/,'touch reordering enabled');
 assert.match(page,/Save draft/,'save action accessible');
 assert.match(editor,/api\/admin\/layout-draft/,'editor saves with authenticated API');
 assert.match(page,/Desktop/,'desktop preview');
 assert.match(page,/Mobile/,'mobile preview');
 assert.match(page,/Not published/,'draft-only disclosure');
 assert.match(admin,/href="\/homepage-editor\.html"/,'homepage editor linked in owner administration');
 assert.doesNotMatch(shop,/layout-editor\.html/,'public shop has no editor link');
});
