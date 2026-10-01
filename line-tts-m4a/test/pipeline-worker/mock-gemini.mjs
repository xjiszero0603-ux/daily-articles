import http from 'http'; import fs from 'fs';
const pcm = fs.readFileSync(process.argv[2]).toString('base64');
http.createServer((req,res)=>{ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
  console.error('mock gemini got', req.url.split('?')[0], JSON.parse(b).contents[0].parts[0].text.slice(0,20));
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/L16;codec=pcm;rate=24000',data:pcm}}]}}]}));
});}).listen(8788);
