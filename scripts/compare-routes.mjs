import {readFile,writeFile} from 'node:fs/promises';
import {compareRoutes} from '../src/route-options.ts';

const args=process.argv.slice(2);
const option=name=>args[args.indexOf(name)+1];
if(!args.includes('--input')) throw new Error('Usage: node scripts/compare-routes.mjs --input request.json [--out reply.json]');
const input=await readFile(option('--input'),'utf8');
if(input.length>32000) throw new Error('Planning request is too large.');
const raw=JSON.parse(input);
const reply=compareRoutes(raw.data?.request ?? raw.request ?? raw);
const result={reply,status:'Calculated routes ready for agent explanation'};
if(args.includes('--out')) await writeFile(option('--out'),JSON.stringify(result,null,2));
else process.stdout.write(JSON.stringify(result,null,2)+'\n');
