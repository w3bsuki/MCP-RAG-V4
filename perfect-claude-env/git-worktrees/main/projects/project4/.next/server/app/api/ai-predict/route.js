(()=>{var e={};e.id=268,e.ids=[268],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},33409:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>g,routeModule:()=>l,serverHooks:()=>f,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>h});var a={};t.r(a),t.d(a,{GET:()=>d,POST:()=>u});var i=t(42706),n=t(28203),s=t(45994),o=t(27225),c=t(40668),p=t(39187);async function u(e){try{let{symbol:r,timeframe:t,currentPrice:a,marketData:i}=await e.json();if(!process.env.ANTHROPIC_API_KEY)return p.NextResponse.json({error:"AI predictions unavailable",fallback:!0,prediction:{direction:i?.priceChange24h>0?"up":"down",confidence:65,analysis:"Using fallback prediction model. Configure ANTHROPIC_API_KEY for AI predictions."}},{status:200});let n=`You are a cryptocurrency analyst. Analyze ${r} with current price $${a}.

Market data:
- 24h change: ${i?.priceChange24h||0}%
- Volume: ${i?.volume24h||"N/A"}
- Market cap: ${i?.marketCap||"N/A"}

Provide a ${t} price prediction in this exact JSON format:
{
  "direction": "up" or "down",
  "targetPrice": number,
  "confidence": number (0-100),
  "changePercent": number,
  "analysis": "brief analysis in 1-2 sentences",
  "factors": ["factor1", "factor2", "factor3"],
  "risk": "low", "medium", or "high"
}`,{text:s}=await (0,c.Df)({model:(0,o.P)("claude-3-haiku-20240307"),prompt:n,temperature:.3,maxTokens:500}),u=JSON.parse(s);return p.NextResponse.json({success:!0,symbol:r,currentPrice:a,timeframe:t,prediction:u,generatedAt:new Date().toISOString()})}catch(e){return console.error("AI Prediction Error:",e),p.NextResponse.json({error:"Failed to generate prediction",fallback:!0,prediction:{direction:"neutral",confidence:50,analysis:"Unable to generate AI prediction at this time."}})}}async function d(){return p.NextResponse.json({status:"AI Prediction API",requiresApiKey:!process.env.ANTHROPIC_API_KEY,endpoints:{POST:"/api/ai-predict",body:{symbol:"BTC",timeframe:"24h | 7d | 30d",currentPrice:45e3,marketData:{priceChange24h:2.5,volume24h:28e9,marketCap:88e10}}}})}let l=new i.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/ai-predict/route",pathname:"/api/ai-predict",filename:"route",bundlePath:"app/api/ai-predict/route"},resolvedPagePath:"/home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/projects/project4/src/app/api/ai-predict/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:m,workUnitAsyncStorage:h,serverHooks:f}=l;function g(){return(0,s.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:h})}},96487:()=>{},78335:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),a=r.X(0,[638,452,980],()=>t(33409));module.exports=a})();