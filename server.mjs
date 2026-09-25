import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataFile = join(root, "data", "brain.json");
const port = Number(process.env.PORT || 4173);
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml"};

function send(res,status,body,type="text/plain; charset=utf-8"){
  res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store"});
  res.end(body);
}
function safePath(url){
  const raw = decodeURIComponent((url.split("?")[0] || "/"));
  const target = raw === "/" ? "/index.html" : raw;
  const normalized = normalize(target).replace(/^(\.\.[/\\])+/, "");
  return join(root, normalized);
}
async function readBody(req){
  const chunks=[]; let size=0;
  for await (const chunk of req){
    size+=chunk.length;
    if(size>2_000_000) throw new Error("Payload too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

createServer(async (req,res)=>{
  try{
    if(req.url === "/api/brain" && req.method === "GET"){
      return send(res,200,await readFile(dataFile,"utf8"),"application/json; charset=utf-8");
    }
    if(req.url === "/api/brain" && req.method === "PUT"){
      const raw=await readBody(req);
      const parsed=JSON.parse(raw);
      if(!parsed || !Array.isArray(parsed.items)) return send(res,400,"Invalid brain payload");
      parsed.meta={...(parsed.meta||{}),updated:new Date().toISOString().slice(0,10)};
      await writeFile(dataFile,JSON.stringify(parsed,null,2)+"\n","utf8");
      return send(res,200,JSON.stringify({ok:true,updated:parsed.meta.updated}),"application/json; charset=utf-8");
    }
    if(req.method!=="GET" && req.method!=="HEAD") return send(res,405,"Method not allowed");
    const path=safePath(req.url||"/");
    const info=await stat(path);
    if(!info.isFile()) return send(res,404,"Not found");
    const body=await readFile(path);
    res.writeHead(200,{"Content-Type":types[extname(path)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(req.method==="HEAD"?"":body);
  }catch(err){
    if(err?.code==="ENOENT") return send(res,404,"Not found");
    console.error(err);
    return send(res,500,"Internal server error");
  }
}).listen(port,()=>{
  console.log(`Second Brain → http://localhost:${port}`);
  console.log("Les modifications sont enregistrées dans data/brain.json");
});