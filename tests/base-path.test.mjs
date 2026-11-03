import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {normalizeBasePath} from '../src/lib/base-path.mjs';
test('部署路径只接受明确目录，拒绝查询和路径穿越',()=>{
 assert.equal(normalizeBasePath('/mcp-atlas'),'/mcp-atlas');assert.equal(normalizeBasePath('/'),'');
 for(const path of ['/../x','//host','/x/','/x?q=1','/x#hash'])assert.throws(()=>normalizeBasePath(path));
});
test('项目链接加子路径，外站与锚点不改写',()=>{
 const result=execFileSync(process.execPath,['--input-type=module','-e',`import {withBasePath} from './src/lib/base-path.mjs';console.log(JSON.stringify(['/','/servers/?q=x','https://example.com/','#main','//example.com'].map(withBasePath)))`],{cwd:new URL('../',import.meta.url),env:{...process.env,NEXT_PUBLIC_BASE_PATH:'/mcp-atlas'},encoding:'utf8'});
 assert.deepEqual(JSON.parse(result),['/mcp-atlas/','/mcp-atlas/servers/?q=x','https://example.com/','#main','//example.com']);
});
