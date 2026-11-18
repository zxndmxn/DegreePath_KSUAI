import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('.it-page',{recursive:true});
await cp('dist','.it-page',{recursive:true});
await writeFile('.it-page/index.html',await readFile('dist/agent.html'));
console.log('Prepared .it-page for It. It runtime and credentials are not included.');
