import {defineConfig} from 'vite';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {validateRouteRequest} from './src/route-options.ts';
const run=promisify(execFile);
export default defineConfig({
  plugins:[{name:'degreepath-local-it-handoff',configureServer(server){
    server.middlewares.use('/__degreepath/it',async(req,res)=>{
      res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
      if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:4173'||req.headers.host!=='127.0.0.1:4173'||!req.headers['content-type']?.startsWith('application/json')){
        res.statusCode=403;res.end(JSON.stringify({error:'Use the local DegreePath page to send a plan.'}));return;
      }
      let file:string|undefined;
      try{
        let body='';for await(const chunk of req){body+=chunk;if(body.length>32000)throw new Error('Request too large.');}
        const request=validateRouteRequest(JSON.parse(body));
        const folder=join(server.config.root,'.it-work');await mkdir(folder,{recursive:true});file=join(folder,`handoff-${randomUUID()}.json`);
        await writeFile(file,JSON.stringify({handoff:request}));
        // Fixed executable and fixed page; no request text becomes a command or path.
        await run(join(homedir(),'.it','bin',process.platform==='win32'?'it.exe':'it'),['patch','degreepath-agent','--file',file],{timeout:15000,windowsHide:true});
        res.end(JSON.stringify({url:'http://localhost:4700/p/degreepath-agent'}));
      }catch{res.statusCode=400;res.end(JSON.stringify({error:'Could not hand off this plan. Keep It running and use npm run dev for the local app.'}));}
      finally{if(file)await unlink(file).catch(()=>{});}
    });
  }}],build:{rollupOptions:{input:{main:'index.html',agent:'agent.html'}}}
});
