(()=>{var e={};e.id=250,e.ids=[250],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},82053:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>g,routeModule:()=>u,serverHooks:()=>p,workAsyncStorage:()=>h,workUnitAsyncStorage:()=>m});var a={};r.r(a),r.d(a,{DELETE:()=>d,GET:()=>l});var i=r(42706),n=r(28203),s=r(45994),c=r(39187);let o=new(r(67120)).o;async function l(){let e=o.getCacheStats();return c.NextResponse.json({cache:e,service:{apiKeyConfigured:!!process.env.ANTHROPIC_API_KEY,model:"claude-3-haiku-20240307",cacheTimeout:"1 hour",retryLogic:"enabled (max 2 retries)"},endpoints:{predictions:"/api/predictions/[symbol]",stats:"/api/claude-stats"},lastChecked:new Date().toISOString()})}async function d(){return o.clearCache(),c.NextResponse.json({message:"Cache cleared successfully",timestamp:new Date().toISOString()})}let u=new i.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/claude-stats/route",pathname:"/api/claude-stats",filename:"route",bundlePath:"app/api/claude-stats/route"},resolvedPagePath:"/home/w3bsuki/MCP-RAG-V4/mcp-rag-dev-system/projects/project4/src/app/api/claude-stats/route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:h,workUnitAsyncStorage:m,serverHooks:p}=u;function g(){return(0,s.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:m})}},96487:()=>{},78335:()=>{},67120:(e,t,r)=>{"use strict";r.d(t,{o:()=>c});var a=r(27225),i=r(40668);let n=e=>{let{symbol:t,currentPrice:r,timeframe:a,marketData:i}=e,n=Math.abs(i.priceChange24h),s=i.volume24h>1e10?"high":i.volume24h>1e9?"medium":"low";return`You are an expert cryptocurrency analyst with deep knowledge of market dynamics, technical analysis, and blockchain fundamentals.

ANALYSIS TARGET: ${t.toUpperCase()}
CURRENT PRICE: $${r.toLocaleString()}
PREDICTION TIMEFRAME: ${a}

MARKET CONDITIONS:
- 24h Price Change: ${i.priceChange24h>=0?"+":""}${i.priceChange24h}%
- 24h Trading Volume: $${(i.volume24h/1e6).toFixed(2)}M (${s} volume)
- Market Capitalization: $${(i.marketCap/1e9).toFixed(2)}B
${i.high24h?`- 24h High: $${i.high24h.toLocaleString()}`:""}
${i.low24h?`- 24h Low: $${i.low24h.toLocaleString()}`:""}
- Volatility Assessment: ${n>10?"High":n>5?"Medium":"Low"} (${n}%)

ANALYSIS REQUIREMENTS:
Focus on ${({"24h":"short-term technical indicators and intraday momentum","7d":"weekly trends, moving averages, and intermediate support/resistance levels","30d":"monthly trends, longer-term market cycles, and fundamental factors"})[a]} for this ${a} prediction.

Consider these factors:
1. Technical Analysis: Price action, support/resistance, momentum indicators
2. Market Structure: Volume patterns, liquidity, order book dynamics  
3. Macro Environment: Overall crypto market sentiment and external factors
4. Risk Assessment: Volatility, potential downside scenarios

Provide a realistic, well-reasoned prediction in this exact JSON format:
{
  "direction": "up" or "down",
  "targetPrice": number (be conservative and realistic),
  "confidence": number (0-100, factor in uncertainty - crypto markets are unpredictable),
  "changePercent": number (expected percentage change),
  "analysis": "2-3 sentence analysis explaining your reasoning",
  "factors": ["factor1", "factor2", "factor3"] (3 most important factors influencing prediction),
  "risk": "low", "medium", or "high" (consider volatility and market uncertainty)
}

IMPORTANT GUIDELINES:
- Be conservative with confidence levels (crypto markets are highly unpredictable)
- Consider both bullish and bearish scenarios
- Factor in current market volatility (${n}% 24h change)
- Base predictions on actual market data provided
- Acknowledge uncertainty - avoid overconfident predictions`},s={direction:"up",targetPrice:0,confidence:50,changePercent:0,analysis:"Unable to generate prediction due to technical issues. Please try again.",factors:["Technical analysis unavailable","Market data processing error","Temporary service interruption"],risk:"medium"};class c{constructor(){this.cache=new Map,this.cacheTimeout=36e5,this.maxRetries=2,this.apiKey=process.env.ANTHROPIC_API_KEY}getCacheKey(e){return`${e.symbol}-${e.timeframe}-${100*Math.floor(e.currentPrice/100)}`}getFromCache(e){let t=this.cache.get(e);return t?Date.now()-t.timestamp>this.cacheTimeout?(this.cache.delete(e),null):{...t.data,cached:!0}:null}saveToCache(e,t){this.cache.set(e,{data:t,timestamp:Date.now()})}async getPricePrediction(e){let t=this.getCacheKey(e),r=this.getFromCache(t);if(r)return r;if(!this.apiKey)return this.getMockPrediction(e);try{let r=await this.generatePredictionWithRetry(e),a={symbol:e.symbol,timeframe:e.timeframe,currentPrice:e.currentPrice,prediction:r,generatedAt:new Date().toISOString()};return this.saveToCache(t,a),a}catch(t){return console.error("Claude prediction error:",t),this.getMockPrediction(e)}}async generatePredictionWithRetry(e){let t={symbol:e.symbol,currentPrice:e.currentPrice,timeframe:e.timeframe,marketData:e.marketData};for(let r=0;r<=this.maxRetries;r++)try{let e=n(t),{text:s}=await (0,i.Df)({model:(0,a.P)("claude-3-haiku-20240307"),prompt:e,temperature:.2+.1*r,maxTokens:800});if(!function(e){try{let t=JSON.parse(e);return["direction","targetPrice","confidence","changePercent","analysis","factors","risk"].every(e=>e in t)}catch{return!1}}(s))throw Error("Invalid prediction response format");let c=JSON.parse(s);if(!c.targetPrice||c.confidence<0||c.confidence>100)throw Error("Invalid prediction values");return c}catch(t){if(console.warn(`Prediction attempt ${r+1} failed:`,t),r===this.maxRetries)return{...s,targetPrice:e.currentPrice*(1+(Math.random()-.5)*.1)};await new Promise(e=>setTimeout(e,1e3*(r+1)))}return{...s,targetPrice:e.currentPrice}}getMockPrediction(e){let{symbol:t,currentPrice:r,timeframe:a,marketData:i}=e,n=i.priceChange24h>0,s=Math.abs(i.priceChange24h),c=(n?1:-1)*(2+.5*s)*("24h"===a?1:"7d"===a?3:7),o={direction:n?"up":"down",targetPrice:r*(1+c/100),confidence:Math.min(80,60+2*s),changePercent:c,analysis:`${t.toUpperCase()} shows ${n?"bullish":"bearish"} momentum based on recent price action and volume patterns.`,factors:[n?"Positive price momentum":"Negative price pressure",s>5?"High volatility environment":"Stable market conditions","Technical indicator alignment"],risk:s>10?"high":s>5?"medium":"low"};return{symbol:t,timeframe:a,currentPrice:r,prediction:o,generatedAt:new Date().toISOString()}}clearCache(){this.cache.clear()}getCacheStats(){return{size:this.cache.size,keys:Array.from(this.cache.keys())}}}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[638,452,980],()=>r(82053));module.exports=a})();