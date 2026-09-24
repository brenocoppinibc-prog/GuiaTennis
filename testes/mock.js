// Finge o Supabase para os testes: tabelas em memória (window.__db), e a função
// de estatísticas. Chaves: __admin, __semDetalhe, __semCep. O que o site grava em cliques fica em __cliques.
(function(){
  const agora = new Date().toISOString();
  const db = window.__db = {
    academias: [
      { id:"a1", name:"Só Aula Tennis", address:"Rua A", numero:"1", bairro:"Pinheiros", cidade:"São Paulo", endereco:"Rua A, 1 - Pinheiros, São Paulo", lat:-23.56, lng:-46.68, phone:"11999990001", instagram:"", site:"", price_aula:"", price_locacao:"", amenities:["raquete","estacionamento_gratuito"], modalidades:["aulas_proprias"], quadras:{saibro_coberta:2}, pisos:["saibro"], cobertura:["coberta"], photos:[], status:"published", created_at:agora,
        politica:{ modo:"separado", aula:{reposicao:"24", foraDoPrazo:"Perde a aula."}, locacao:{reposicao:"12", foraDoPrazo:"Cobra metade."} },
        acesso:{ fachada:"Portão preto", entrada:"Avise na portaria", estacionar:"Rua de trás" },
        horario:{ modo:"igual", semana:{de:"06:00",ate:"22:00",fechado:false}, sabado:{de:"08:00",ate:"14:00",fechado:false}, domingo:{de:"",ate:"",fechado:true}, nota:"" } },
      { id:"a2", name:"Quadra Locação", address:"Rua B", numero:"2", bairro:"Moema", cidade:"São Paulo", endereco:"Rua B, 2 - Moema, São Paulo", lat:-23.60, lng:-46.66, phone:"11999990002", price_aula:"", price_locacao:"100-120", amenities:[], modalidades:["locacao"], quadras:{rapida_descoberta:1}, pisos:["rapida"], cobertura:["descoberta"], photos:[], status:"published", created_at:agora,
        politica:{ modo:"igual", reposicao:"48", foraDoPrazo:"" }, acesso:{}, horario:{} },
    ],
    avaliacoes: [], cliques: [],
  };
  window.__cliques = db.cliques;
  function builder(table) {
    let colunas = "*", rows = null, op = "select", payload = null, filtros = [], single = false;
    const q = {
      select(c){ if (c) colunas = c; return q; }, order(){ return q; }, limit(){ return q; },
      eq(k,v){ filtros.push([k,v]); return q; },
      single(){ single = true; return q; },
      insert(p){ op="insert"; payload=p; return q; },
      update(p){ op="update"; payload=p; return q; },
      delete(){ op="delete"; return q; },
      then(res, rej){ return Promise.resolve(run()).then(res, rej); },
    };
    function run(){
      const t = db[table];
      if (!t) return { data:null, error:{ message:"relation does not exist" } };
      const pass = r => filtros.every(([k,v]) => r[k] === v);
      if (op === "insert") {
        if (table === "cliques" && window.__semDetalhe && "detalhe" in payload) return { data:null, error:{ message:"column detalhe does not exist" } };
        if (table === "cliques" && window.__semCep && "cep" in payload) return { data:null, error:{ message:"column cep does not exist" } };
        const r = { id: "n" + (t.length+1) + Math.random().toString(36).slice(2,5), created_at: new Date().toISOString(), ...payload };
        t.push(r); return { data: single ? r : [r], error:null };
      }
      if (op === "update") { t.filter(pass).forEach(r => Object.assign(r, JSON.parse(JSON.stringify(payload)))); window.__ultimoUpdate = JSON.parse(JSON.stringify(payload)); return { data:null, error:null }; }
      if (op === "delete") { return { data:null, error:null }; }
      if (table === "cliques" && window.__semCep && colunas.includes("cep")) return { data:null, error:{ message:"column cliques.cep does not exist" } };
      const out = JSON.parse(JSON.stringify(t.filter(pass)));
      return { data: single ? out[0] : out, error:null };
    }
    return q;
  }
  window.supabase = { createClient(){ return {
    from: builder,
    rpc(){ return { single(){ return Promise.resolve({ data:{ acessos_total:1234, buscas_total:567, fichas_total:89, contatos_total:12 }, error:null }); } }; },
    auth: {
      getSession(){ return Promise.resolve({ data:{ session: window.__admin ? { user:{ email:"a@b" } } : null } }); },
      signInWithPassword(){ return Promise.resolve({ data:{}, error:null }); },
      signOut(){ return Promise.resolve({}); },
      onAuthStateChange(){ return { data:{ subscription:{ unsubscribe(){} } } }; },
    },
  }; } };
})();
