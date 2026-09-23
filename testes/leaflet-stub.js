(function(){ const o = new Proxy(function(){}, { get:(t,k)=> k==='then'?undefined:o, apply:()=>o, construct:()=>o }); window.L = o; })();
