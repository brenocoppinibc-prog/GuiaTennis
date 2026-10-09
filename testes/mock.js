// Finge o Supabase para os testes: tabelas em memória (window.__db), e as
// funções do banco. Chaves: __admin, __semDetalhe, __semCep, __semTempo, __colunasFechadas,
// __semPlano, __semConfirmada, __semDataDaFicha, __a1AtualizadaEm, __a1CriadaEm,
// __academia (id da academia logada),
// __semAcesso (banco sem o SQL do acesso das academias). O que o site grava
// em cliques fica em __cliques, o banco que o site abriu fica em __banco, as
// funções chamadas em __rpcs e a última senha trocada em __senhaNova.
(function(){
  const agora = new Date().toISOString();
  const db = window.__db = {
    academias: [
      { id:"a1", name:"Só Aula Tennis", address:"Rua A", numero:"1", bairro:"Pinheiros", cidade:"São Paulo", endereco:"Rua A, 1 - Pinheiros, São Paulo", lat:-23.56, lng:-46.68, phone:"11999990001", instagram:"", site:"", price_aula:"", price_locacao:"", amenities:["raquete","estacionamento_gratuito"], modalidades:["aulas_proprias"], quadras:{saibro_coberta:2}, pisos:["saibro"], cobertura:["coberta"], photos:[], status:"published", created_at: window.__a1CriadaEm || agora, dados_atualizados_em: window.__a1AtualizadaEm || null,
        politica:{ modo:"separado", aula:{reposicao:"24", foraDoPrazo:"Perde a aula."}, locacao:{reposicao:"12", foraDoPrazo:"Cobra metade."} },
        acesso:{ fachada:"Portão preto", entrada:"Avise na portaria", estacionar:"Rua de trás" },
        horario:{ modo:"igual", semana:{de:"06:00",ate:"22:00",fechado:false}, sabado:{de:"08:00",ate:"14:00",fechado:false}, domingo:{de:"",ate:"",fechado:true}, nota:"" } },
      { id:"a2", name:"Quadra Locação", address:"Rua B", numero:"2", bairro:"Moema", cidade:"São Paulo", endereco:"Rua B, 2 - Moema, São Paulo", lat:-23.60, lng:-46.66, phone:"11999990002", price_aula:"", price_locacao:"100-120", amenities:[], modalidades:["locacao"], quadras:{rapida_descoberta:1}, pisos:["rapida"], cobertura:["descoberta"], photos:[], status:"published", created_at:agora, confirmada:false,
        politica:{ modo:"igual", reposicao:"48", foraDoPrazo:"" }, acesso:{}, horario:{} },
    ],
    avaliacoes: JSON.parse(JSON.stringify(window.__avaliacoesIniciais || [])), cliques: [],
    // Login de cada academia (a senha fica em __senhas, pelo e-mail do login).
    academia_acessos: [],
    // Uma conta, várias academias (SQL 20261003120000): quem administra
    // qual academia, com o papel de cada uma. academia_id da conta é a
    // academia aberta no painel.
    academia_vinculos: [],
    // Pedidos de plano (SQL 20261003130000): um por academia.
    pedidos_de_plano: [],
    pedidos_de_acesso: [],
    passos_das_visitas: [],
    respostas: JSON.parse(JSON.stringify(window.__respostasIniciais || [])),
    // Conta do jogador (SQL 20261002130000). window.__jogador abre o site
    // já logado como "Ana Jogadora".
    jogadores: [],
    // Buscas salvas na conta (SQL 20261005150000). window.__semBuscasSalvas
    // finge o banco sem a tabela.
    buscas_salvas: [],
    // Fila dos avisos por e-mail (SQL 20261005160000), vista pelo painel do admin.
    emails_a_enviar: [],
    // Contas excluídas pelo admin (SQL 20261006150000): o e-mail fica bloqueado.
    contas_excluidas: [],
    // Promoções das academias Premium (SQL 20261008140000). window.__semPromocoes
    // finge o banco sem a tabela; window.__promoAviso diz o que o e-mail fez.
    promocoes: JSON.parse(JSON.stringify(window.__promocoesIniciais || [])),
    // Pedidos para tirar a academia do guia (SQL 20261008150000).
    pedidos_para_sair: [],
    // Conversas do chat de ajuda guardadas na conta (SQL 20261009120000).
    // window.__conversasIniciais começa com algumas; window.__semConversas
    // finge o banco sem a tabela.
    conversas_de_ajuda: JSON.parse(JSON.stringify(window.__conversasIniciais || [])),
  };
  // window.__premium: ids das academias que começam no Premium.
  (window.__premium || []).forEach(id => { const ac = db.academias.find(y => y.id === id); if (ac) ac.plano = "premium"; });
  const ADMIN = "guiatennis1@gmail.com";
  const DOMINIO = "@acesso.guiatennis.com.br";
  window.__senhas = {};
  window.__rpcs = [];
  // Academia logada de saída (window.__academia): acesso já completo, a não
  // ser que window.__acessoNovo diga que é o primeiro acesso.
  if (window.__academia) {
    const novo = !!window.__acessoNovo;
    db.academia_acessos.push({ user_id: "u-" + window.__academia, academia_id: window.__academia, usuario: "quadra." + window.__academia,
      nome_responsavel: novo ? null : "Maria Teste", cargo: novo ? null : "Gerente", email: novo ? null : "maria@teste.com", whatsapp: novo ? null : "11900000001", cnpj: null,
      recebe_relatorio: false, termos_aceitos_em: novo ? null : agora, dados_completos_em: novo ? null : agora, senha_trocada_em: novo ? null : agora,
      avisos_por_email: true, token_avisos: "tok-u-" + window.__academia });
    window.__senhas["quadra." + window.__academia + DOMINIO] = "provisoria1";
    db.academia_vinculos.push({ user_id: "u-" + window.__academia, academia_id: window.__academia, papel: "principal", created_at: agora });
    // window.__outrasAcademias: a mesma conta administra também essas.
    (window.__outrasAcademias || []).forEach(id => db.academia_vinculos.push({ user_id: "u-" + window.__academia, academia_id: id, papel: "principal", created_at: agora }));
  }
  if (window.__jogador) {
    db.jogadores.push({ user_id: "j-ana", nome: "Ana Jogadora", email: "ana@exemplo.com", cidade: "São Paulo", avisos_academias: false, promocoes: false, novidades: false, termos_aceitos_em: agora, created_at: agora, token_avisos: "tok-j-ana" });
    window.__senhas["ana@exemplo.com"] = "senhadaana";
  }
  let sessao = window.__admin ? { user: { id: "admin", email: ADMIN } }
    : window.__jogador ? { user: { id: "j-ana", email: "ana@exemplo.com" } }
    : window.__academia ? { user: { id: "u-" + window.__academia, email: "quadra." + window.__academia + DOMINIO } } : null;
  const souAdmin = () => !!(sessao && sessao.user.email === ADMIN);
  const meuAcesso = () => sessao && db.academia_acessos.find(a => a.user_id === sessao.user.id);
  const euJogador = () => sessao && db.jogadores.find(j => j.user_id === sessao.user.id);
  // Conta do GuiaTennis Parceiros (SQL 20260930160000): e-mail de entrar,
  // telefone só com números e o limite de pessoas do plano.
  // Depois do primeiro acesso, quem tinha usuário entra pelo e-mail (SQL 20261004120000).
  const loginDe = (x) => x.loginEmail || (x.usuario.includes("@") ? x.usuario : x.usuario + DOMINIO);
  const tel = (t) => { const d = String(t || "").replace(/\D/g, ""); return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d; };
  const planoDe = (id) => window.__plano || (db.academias.find(y => y.id === id) || {}).plano || "basico";
  const limite = (plano) => ({ premium: 10, completo: 5 }[plano] || 1);
  const ordem = (plano) => ({ premium: 3, completo: 2 }[plano] || 1);
  const vinculosDe = (userId) => db.academia_vinculos.filter(v => v.user_id === userId);
  // Vários pedidos por conta (SQL 20261005120000): o pedido que um teste pôs
  // nas colunas antigas de academia_acessos vira uma linha, como a migração faz.
  const migrarPedidos = () => db.academia_acessos.forEach(x => {
    if (!x.pedido_academia_id) return;
    if (!db.pedidos_de_acesso.some(p => p.user_id === x.user_id && p.academia_id === x.pedido_academia_id))
      db.pedidos_de_acesso.push({ user_id: x.user_id, academia_id: x.pedido_academia_id, nome: x.pedido_nome || null, destino: x.pedido_destino || null, pedido_em: x.pedido_em || new Date().toISOString() });
    Object.assign(x, { pedido_academia_id: null, pedido_nome: null, pedido_em: null, pedido_destino: null });
  });
  const pedidosDe = (userId) => { migrarPedidos(); return db.pedidos_de_acesso.filter(p => p.user_id === userId).sort((p, q) => String(p.pedido_em).localeCompare(String(q.pedido_em))); };
  const pedidosPara = (academiaId) => { migrarPedidos(); return db.pedidos_de_acesso.filter(p => p.academia_id === academiaId); };
  const fecharPedido = (userId, academiaId) => {
    db.pedidos_de_acesso = db.pedidos_de_acesso.filter(p => !(p.user_id === userId && p.academia_id === academiaId));
    window.__db.pedidos_de_acesso = db.pedidos_de_acesso;
    const c = (window.__codigos || {})[userId];
    if (c && c.academia === academiaId) delete window.__codigos[userId];
  };
  // O pedido do admin: o da academia dita ou o único da conta.
  const pedidoDaConta = (userId, academiaId) => {
    const lista = pedidosDe(userId);
    if (academiaId) return lista.find(p => p.academia_id === academiaId) || null;
    return lista.length === 1 ? lista[0] : null;
  };
  const vinculo = (userId, academiaId) => db.academia_vinculos.find(v => v.user_id === userId && v.academia_id === academiaId);
  // ligar_conta_a_academia: abrir = a academia passa a ser a aberta (pedido
  // da própria pessoa); sem ele, só abre se a conta não tinha nenhuma.
  const ligar = (x, academiaId, abrir = true) => {
    if (!vinculo(x.user_id, academiaId)) {
      const temPrincipal = db.academia_vinculos.some(v => v.academia_id === academiaId && v.papel === "principal");
      db.academia_vinculos.push({ user_id: x.user_id, academia_id: academiaId, papel: temPrincipal ? "equipe" : "principal", created_at: new Date().toISOString() });
    }
    if (abrir || !x.academia_id) Object.assign(x, { academia_id: academiaId, papel: vinculo(x.user_id, academiaId).papel });
    fecharPedido(x.user_id, academiaId);
  };
  // SQL 20261007130000: academia do guia sem responsável, assumida sem
  // código; e quem vence a disputa vira o responsável (os outros saem).
  const assumir = (x, academiaId) => {
    const ac = db.academias.find(y => y.id === academiaId);
    const t = new Date().toISOString();
    ac.revisar_desde = t;
    ligar(x, academiaId, true);
    Object.assign(vinculo(x.user_id, academiaId), { declarou_em: t, telefone_da_ficha: ac.phone || null });
    db.pedidos_de_acesso.filter(p => p.academia_id === academiaId && p.destino === "guiatennis").forEach(p => { p.destino = "responsavel"; });
    db.emails_a_enviar.push({ id: "e-assumida-" + academiaId + x.user_id, tipo: "academia_assumida", para: ADMIN, assunto: "Academia assumida: " + ac.name, criado_em: t, enviado_em: null, tentativas: 0, erro: null });
  };
  const vencerDisputa = (x, academiaId) => {
    db.academia_vinculos.filter(v => v.academia_id === academiaId && v.user_id !== x.user_id).forEach(v => desligar(v.user_id, academiaId));
    ligar(x, academiaId, true);
    vinculo(x.user_id, academiaId).papel = "principal";
    x.papel = "principal";
  };
  // O código da disputa pelo WhatsApp (SQL 20261007140000), como o banco:
  // vai para o WhatsApp de antes (na disputa) ou o da ficha; a conta pede
  // um por hora, até 3. O código fica em window.__codigos, como o do admin.
  const codigoPeloWhatsapp = (x, academiaId, origem) => {
    if (!window.__whatsappLigado) return "desligado";
    const ac = db.academias.find(y => y.id === academiaId) || {};
    const disputa = db.pedidos_de_acesso.some(p => p.user_id === x.user_id && p.academia_id === academiaId && p.destino === "disputa");
    const antes = disputa && (db.academia_vinculos.find(v => v.academia_id === academiaId && v.papel === "principal" && v.telefone_da_ficha) || {}).telefone_da_ficha;
    const para = tel(antes || ac.phone || "");
    if (para.length < 10) return "sem_whatsapp";
    const codigo = String(100000 + Math.floor(Math.random() * 900000));
    const em = new Date().toISOString();
    const c = { codigo, academia: academiaId, tentativas: 0, em };
    window.__codigos = window.__codigos || {};
    window.__codigos[x.user_id + "|" + academiaId] = c;
    window.__codigos[x.user_id] = c;
    window.__whatsapps = window.__whatsapps || [];
    window.__whatsapps.push({ user_id: x.user_id, academia_id: academiaId, para: "55" + para, codigo, origem, criado_em: em, enviado_em: em, erro: null });
    return "mandado";
  };
  const codigoDaDisputaPelaConta = (x, academiaId) => {
    if (!db.pedidos_de_acesso.some(p => p.user_id === x.user_id && p.academia_id === academiaId && p.destino === "disputa")) return "sem_disputa";
    if (!x.email_confirmado_em) return "confirme_email";
    if (!window.__whatsappLigado) return "desligado";
    const meus = (window.__whatsapps || []).filter(w => w.user_id === x.user_id && w.academia_id === academiaId && w.origem !== "admin");
    if (meus.some(w => Date.now() - new Date(w.criado_em).getTime() < 3600e3)) return "espere";
    if (meus.length >= 3) return "limite";
    return codigoPeloWhatsapp(x, academiaId, "conta");
  };
  // Vínculo removido: se era a academia aberta, abre outra (ou nenhuma).
  const desligar = (userId, academiaId) => {
    const i = db.academia_vinculos.findIndex(v => v.user_id === userId && v.academia_id === academiaId);
    if (i >= 0) db.academia_vinculos.splice(i, 1);
    const x = db.academia_acessos.find(y => y.user_id === userId);
    if (x && (!x.academia_id || x.academia_id === academiaId)) {
      const outro = vinculosDe(userId)[0];
      Object.assign(x, { academia_id: outro ? outro.academia_id : null, papel: outro ? outro.papel : x.papel });
    }
  };
  const apagarConta = (userId) => {
    const i = db.academia_acessos.findIndex(y => y.user_id === userId);
    if (i >= 0) db.academia_acessos.splice(i, 1);
    db.academia_vinculos = db.academia_vinculos.filter(v => v.user_id !== userId);
    db.pedidos_de_acesso = db.pedidos_de_acesso.filter(p => p.user_id !== userId);
    window.__db.pedidos_de_acesso = db.pedidos_de_acesso;
  };
  let seq = 0;
  const novoLogin = (email, senha) => { window.__senhas[email] = senha; return "u-conta-" + (++seq); };
  window.__cliques = db.cliques;
  function builder(table) {
    let colunas = "*", rows = null, op = "select", payload = null, filtros = [], single = false;
    const q = {
      select(c){ if (c) colunas = c; return q; }, order(){ return q; }, limit(){ return q; },
      eq(k,v){ filtros.push([k,v]); return q; },
      gte(k,v){ filtros.push([k,v,"gte"]); return q; },
      single(){ single = true; return q; },
      insert(p){ op="insert"; payload=p; return q; },
      update(p){ op="update"; payload=p; return q; },
      delete(){ op="delete"; return q; },
      then(res, rej){ return Promise.resolve(run()).then(res, rej); },
    };
    function run(){
      if (table === "buscas_salvas" && window.__semBuscasSalvas) return { data:null, error:{ message:'relation "public.buscas_salvas" does not exist' } };
      if (table === "promocoes" && window.__semPromocoes) return { data:null, error:{ message:'relation "public.promocoes" does not exist' } };
      // Política promocoes_valendo: só as valendo, de academia Premium no ar.
      if (table === "promocoes" && op === "select") {
        const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
        const visiveis = db.promocoes.filter(x => { const ac = db.academias.find(y => y.id === x.academia_id); return ac && ac.plano === "premium" && ac.status === "published" && String(x.valida_ate) >= hoje; })
          .map(x => ({ id: x.id, academia_id: x.academia_id, titulo: x.titulo, detalhes: x.detalhes, valida_ate: x.valida_ate }));
        return { data: visiveis, error:null };
      }
      const t = db[table];
      if (!t || (window.__semAcesso && (table === "academia_acessos" || table === "respostas"))) return { data:null, error:{ message:"relation does not exist" } };
      const pass = r => filtros.every(([k,v,op]) => op === "gte" ? String(r[k]) >= String(v) : r[k] === v);
      // Conversas do chat: só a própria conta lê e apaga; gravar é pela função.
      if (table === "conversas_de_ajuda") {
        if (window.__semConversas) return { data:null, error:{ message:'relation "public.conversas_de_ajuda" does not exist' } };
        const eu = sessao && sessao.user.id;
        const minhas = t.filter(r => r.user_id === eu).filter(pass);
        if (op === "select") return { data: JSON.parse(JSON.stringify(minhas)).sort((x, y) => String(y.atualizada_em).localeCompare(String(x.atualizada_em))), error:null };
        if (op === "delete") { minhas.forEach(r => t.splice(t.indexOf(r), 1)); return { data:null, error:null }; }
        return { data:null, error:{ message:"permission denied for table conversas_de_ajuda", code:"42501" } };
      }
      // Banco sem a tabela do percurso (SQL 20261005140000).
      if (table === "passos_das_visitas" && window.__semPercurso) return { data:null, error:{ message:'relation "public.passos_das_visitas" does not exist' } };
      if (op === "insert") {
        if (table === "cliques" && window.__semDetalhe && "detalhe" in payload) return { data:null, error:{ message:"column detalhe does not exist" } };
        if (table === "cliques" && window.__semCep && "cep" in payload) return { data:null, error:{ message:"column cep does not exist" } };
        if (table === "cliques" && window.__semTempo && ("segundos" in payload || "segundos_ficha" in payload)) return { data:null, error:{ message:"column segundos does not exist" } };
        if (table === "academias" && window.__semConfirmada && "confirmada" in payload) return { data:null, error:{ message:"column academias.confirmada does not exist" } };
        if (table === "avaliacoes" && !souAdmin()) {
          // Gatilho avaliacao_de_parceiro (SQL 20261005170000): quem
          // administra a academia não avalia ela; as outras, avalia.
          if (sessao && vinculo(sessao.user.id, payload.academia_id))
            return { data:null, error:{ message:"Você administra essa academia: responda às avaliações pelo painel do GuiaTennis Parceiros.", code:"42501" } };
          const c = String(payload.contato_autor || "").trim().toLowerCase(), n = tel(payload.contato_autor);
          const daAcademia = db.academia_vinculos.filter(v => v.academia_id === payload.academia_id).map(v => db.academia_acessos.find(x => x.user_id === v.user_id)).filter(Boolean);
          const deAcademia = c && (daAcademia.some(x => (x.email || "").toLowerCase() === c || loginDe(x) === c || (n.length >= 10 && tel(x.whatsapp) === n))
            || (n.length >= 10 && db.academias.some(y => y.id === payload.academia_id && tel(y.phone) === n)));
          if (deAcademia) return { data:null, error:{ message:"Esse contato é da própria academia: quem administra a academia não avalia ela.", code:"42501" } };
          // Gatilho avaliacao_do_jogador: só com conta, uma por academia, com o nome dela.
          const j = euJogador();
          if (!j) return { data:null, error:{ message:"Entre na sua conta para avaliar.", code:"42501" } };
          if (t.some(r => r.academia_id === payload.academia_id && r.user_id === j.user_id)) return { data:null, error:{ message:"Você já avaliou essa academia.", code:"23505" } };
          Object.assign(payload, { user_id: j.user_id, nome_autor: j.nome, contato_autor: j.email });
        }
        // Gatilho arrumar_busca_salva e regras da tabela (SQL 20261005150000).
        if (table === "buscas_salvas") {
          const j = euJogador();
          if (!j || payload.user_id !== j.user_id) return { data:null, error:{ message:'new row violates row-level security policy for table "buscas_salvas"', code:"42501" } };
          if (!/^\/(busca|quadras\/[a-z0-9-]+(\/[a-z0-9-]+)?)(\?[^#\s]*)?$/.test(payload.link || "")) return { data:null, error:{ message:"Busca inválida.", code:"22023" } };
          if (t.filter(b => b.user_id === j.user_id).length >= 20) return { data:null, error:{ message:"Você já tem 20 buscas salvas. Apague uma para salvar outra.", code:"22023" } };
          if (t.some(b => b.user_id === j.user_id && b.link === payload.link)) return { data:null, error:{ message:"duplicate key value violates unique constraint", code:"23505" } };
          const arred = v => typeof v === "number" ? Math.round(v * 1000) / 1000 : null;
          payload = { ...payload, lat: arred(payload.lat), lng: arred(payload.lng), avisar: !!payload.avisar };
        }
        const r = { id: "n" + (t.length+1) + Math.random().toString(36).slice(2,5), created_at: new Date().toISOString(), ...payload };
        // Gatilho marcar_dados_atualizados (SQL 20261007120000).
        if (table === "academias") r.dados_atualizados_em = r.created_at;
        t.push(r);
        // Gatilho pedido_da_academia_nova (SQL 20261006140000 e
        // 20261007130000): conta com o e-mail confirmado → no ar na hora e a
        // conta administra; senão, vira o pedido da conta.
        if (table === "academias" && sessao && !souAdmin() && meuAcesso()) {
          const x = meuAcesso();
          // Sem o limite de 3 em 24 horas (SQL 20261007130000).
          if (r.status === "pending" && x.email_confirmado_em && x.dados_completos_em) {
            const agora3 = new Date().toISOString();
            Object.assign(r, { status: "published", confirmada: true, revisar_desde: agora3, publicada_em: agora3 });
            ligar(x, r.id, true);
            vinculo(x.user_id, r.id).declarou_em = agora3;
            db.emails_a_enviar.push({ id: "e-no-ar-" + r.id, tipo: "academia_no_ar", para: ADMIN, assunto: "Academia nova no ar: " + r.name, criado_em: agora3, enviado_em: null, tentativas: 0, erro: null });
          } else {
            fecharPedido(x.user_id, r.id);
            db.pedidos_de_acesso.push({ user_id: x.user_id, academia_id: r.id, nome: r.name, destino: "guiatennis", pedido_em: new Date().toISOString(), declarou_em: new Date().toISOString() });
          }
        }
        return { data: single ? r : [r], error:null };
      }
      if (op === "update") {
        window.__ultimoUpdate = JSON.parse(JSON.stringify(payload));
        if (table === "jogadores" && !(euJogador() && filtros.every(([k, v]) => k === "user_id" && v === euJogador().user_id))) return { data:null, error:{ message:"permission denied" } };
        if (table === "buscas_salvas") {
          const j = euJogador();
          if (!j || Object.keys(payload).some(k => k !== "avisar")) return { data:null, error:{ message:"permission denied" } };
          t.filter(pass).filter(r => r.user_id === j.user_id).forEach(r => { r.avisar = !!payload.avisar; });
          return { data:null, error:null };
        }
        const mudanca = JSON.parse(JSON.stringify(payload));
        // Gatilho marcar_dados_atualizados (SQL 20261007120000): só o banco
        // escreve a data; muda quando a informação muda ou a academia salva.
        const FORA_DA_FICHA = ["status", "pago", "plano", "pausada", "pausada_ate", "pausada_pela_academia", "source", "nome_solicitante", "contato_solicitante", "revisar_desde", "publicada_em", "confirmada", "lat", "lng"];
        if (table === "academias") delete mudanca.dados_atualizados_em;
        const atualizou = (r) => table === "academias" && ((sessao && !souAdmin() && vinculo(sessao.user.id, r.id))
          || Object.keys(mudanca).some(k => !FORA_DA_FICHA.includes(k) && JSON.stringify(r[k] ?? null) !== JSON.stringify(mudanca[k] ?? null)));
        // O que o gatilho do banco faz quando quem salva é a academia.
        if (table === "academias" && sessao && !souAdmin()) {
          ["status", "pago", "plano", "pausada", "pausada_ate", "source", "nome_solicitante", "contato_solicitante"].forEach(k => delete mudanca[k]);
          mudanca.confirmada = true;
        }
        t.filter(pass).forEach(r => {
          const antes = r.status;
          if (atualizou(r)) r.dados_atualizados_em = new Date().toISOString();
          Object.assign(r, mudanca);
          // Gatilho pedido_de_plano_atendido.
          if (table === "academias" && "plano" in mudanca)
            db.pedidos_de_plano.filter(x => x.academia_id === r.id && ordem(x.plano) <= ordem(r.plano)).forEach(x => db.pedidos_de_plano.splice(db.pedidos_de_plano.indexOf(x), 1));
          // Gatilho liberar_pedidos_da_academia.
          if (table === "academias" && r.status === "published" && antes !== "published")
            pedidosPara(r.id).map(p => db.academia_acessos.find(x => x.user_id === p.user_id)).filter(Boolean).forEach(x => ligar(x, r.id));
        });
        return { data:null, error:null };
      }
      if (op === "delete") {
        if (table === "respostas") { const fora = t.filter(pass); fora.forEach(r => t.splice(t.indexOf(r), 1)); window.__apagadas = (window.__apagadas || 0) + fora.length; }
        if (table === "pedidos_de_plano") { if (!souAdmin()) return { data:null, error:{ message:"permission denied" } }; t.filter(pass).forEach(r => t.splice(t.indexOf(r), 1)); }
        if (table === "buscas_salvas") { const j = euJogador(); t.filter(pass).filter(r => j && r.user_id === j.user_id).forEach(r => t.splice(t.indexOf(r), 1)); }
        // Avaliação: só o admin apaga (painel do admin e ficha).
        if (table === "avaliacoes") { if (!souAdmin()) return { data:null, error:{ message:"permission denied" } }; t.filter(pass).forEach(r => t.splice(t.indexOf(r), 1)); }
        return { data:null, error:null };
      }
      // Depois do SQL-SEGURANCA.sql, o visitante não lê a linha inteira.
      if (window.__colunasFechadas && !window.__admin && colunas === "*" && (table === "academias" || table === "avaliacoes")) return { data:null, error:{ message:"permission denied for table " + table } };
      // Antes do SQL, pode faltar coluna nova.
      if (window.__semPlano && table === "academias" && colunas.includes("plano")) return { data:null, error:{ message:"column academias.plano does not exist" } };
      // Banco sem a coluna da ficha básica: a lista com ela falha, e o "*" não traz o campo.
      if (window.__semConfirmada && table === "academias" && colunas.includes("confirmada")) return { data:null, error:{ message:"column academias.confirmada does not exist" } };
      // Banco antes do SQL 20261007120000 (a data da ficha).
      if (window.__semDataDaFicha && table === "academias" && colunas.includes("dados_atualizados_em")) return { data:null, error:{ message:"column academias.dados_atualizados_em does not exist" } };
      if (window.__semDataDaFicha && table === "academias") { const out = JSON.parse(JSON.stringify(t.filter(pass))).map(r => { delete r.dados_atualizados_em; return r; }); return { data: single ? out[0] : out, error:null }; }
      if (window.__semConfirmada && table === "academias") { const out = JSON.parse(JSON.stringify(t.filter(pass))).map(r => { delete r.confirmada; return r; }); return { data: single ? out[0] : out, error:null }; }
      if (table === "cliques" && window.__semCep && colunas.includes("cep")) return { data:null, error:{ message:"column cliques.cep does not exist" } };
      const out = JSON.parse(JSON.stringify(t.filter(pass)));
      return { data: single ? out[0] : out, error:null };
    }
    return q;
  }
  const semFuncao = { data:null, error:{ message:"Could not find the function", code:"PGRST202" } };
  const erro = (message, code) => ({ data:null, error:{ message, code } });
  let seqConversa = 0;
  function rodarRpc(nome, a){
    window.__rpcs.push({ nome, args: JSON.parse(JSON.stringify(a || {})) });
    // Chat de ajuda guardado na conta (SQL 20261009120000).
    if (nome === "guardar_conversa_de_ajuda") {
      if (window.__semConversas) return semFuncao;
      if (!sessao) return erro("Entre na sua conta para guardar a conversa.", "42501");
      const eu = sessao.user.id, m = a.p_mensagens;
      if (!["parceiros", "jogadores"].includes(a.p_site)) return erro("Chat inválido.", "22023");
      if (!Array.isArray(m) || !m.length || m.length > 120 || m.some(x => !x || !["eu", "gt"].includes(x.de) || typeof x.texto !== "string" || x.texto.length > 2000 || (x.de === "eu" && x.texto.length > 300)))
        return erro("Conversa inválida.", "22023");
      const titulo = String(a.p_titulo || "").trim().slice(0, 80) || String((m.find(x => x.de === "eu") || {}).texto || "").trim().slice(0, 80);
      if (!titulo) return erro("Escreva a sua dúvida antes.", "22023");
      const quando = new Date(Date.now() + (++seqConversa)).toISOString();
      let c = a.p_id && db.conversas_de_ajuda.find(x => x.id === a.p_id && x.user_id === eu);
      if (c) Object.assign(c, { mensagens: JSON.parse(JSON.stringify(m)), titulo, atualizada_em: quando });
      else {
        c = { id: "conv-" + seqConversa, user_id: eu, site: a.p_site, titulo, mensagens: JSON.parse(JSON.stringify(m)), criada_em: quando, atualizada_em: quando };
        db.conversas_de_ajuda.push(c);
        db.conversas_de_ajuda.filter(x => x.user_id === eu).sort((x, y) => String(y.atualizada_em).localeCompare(String(x.atualizada_em)))
          .slice(50).forEach(x => db.conversas_de_ajuda.splice(db.conversas_de_ajuda.indexOf(x), 1));
      }
      return { data: c.id, error:null };
    }
    if (nome === "estatisticas_publicas") return { data:{ acessos_total:1234, buscas_total:567, fichas_total:89, contatos_total:12 }, error:null };
    if (window.__semAcesso) return semFuncao;
    if (nome === "contatos_privados") {
      if (!souAdmin()) return { data:[], error:null };
      return { data: [
        ...db.academias.filter(x => x.nome_solicitante || x.contato_solicitante).map(x => ({ tabela:"academias", id:x.id, nome:x.nome_solicitante, contato:x.contato_solicitante })),
        ...db.avaliacoes.filter(x => x.contato_autor).map(x => ({ tabela:"avaliacoes", id:x.id, nome:null, contato:x.contato_autor })),
      ], error:null };
    }
    // Uma linha por academia de cada conta, e uma para a conta sem nenhuma.
    if (nome === "acessos_das_academias") {
      if (!souAdmin()) return { data:[], error:null };
      const linhas = [];
      db.academia_acessos.forEach(x => {
        const vs = vinculosDe(x.user_id);
        const p = pedidosDe(x.user_id).slice(-1)[0];
        const ped = p ? { pedido_academia_id: p.academia_id, pedido_nome: p.nome, pedido_em: p.pedido_em, pedido_destino: p.destino } : {};
        if (!vs.length) linhas.push({ ...x, ...ped, academia_id: null });
        vs.forEach(v => linhas.push({ ...x, ...ped, academia_id: v.academia_id, papel: v.papel }));
      });
      return { data: JSON.parse(JSON.stringify(linhas)), error:null };
    }
    // Os pedidos da conta e a lista do admin (SQL 20261005120000).
    if (nome === "meus_pedidos_de_acesso") {
      if (window.__semVariosPedidos) return semFuncao;
      const x = meuAcesso();
      if (!x) return { data:[], error:null };
      return { data: pedidosDe(x.user_id).map(p => {
        const ac = db.academias.find(y => y.id === p.academia_id) || {};
        const c = (window.__codigos || {})[x.user_id + "|" + p.academia_id] || ((window.__codigos || {})[x.user_id] || {}).academia === p.academia_id && (window.__codigos || {})[x.user_id];
        return { academia_id: p.academia_id, nome: ac.name || p.nome, destino: p.destino, pedido_em: p.pedido_em, status: ac.status || null, codigo_em: c ? (c.em || p.pedido_em) : null };
      }), error:null };
    }
    if (nome === "pedidos_de_acesso_admin") {
      if (window.__semVariosPedidos) return semFuncao;
      if (!souAdmin()) return { data:[], error:null };
      migrarPedidos();
      return { data: db.pedidos_de_acesso.map(p => {
        const x = db.academia_acessos.find(y => y.user_id === p.user_id) || {};
        const ac = db.academias.find(y => y.id === p.academia_id) || {};
        const c = (window.__codigos || {})[p.user_id + "|" + p.academia_id];
        return { user_id: p.user_id, academia_id: p.academia_id, nome: ac.name || p.nome, destino: p.destino, pedido_em: p.pedido_em, codigo_em: c ? c.em : null,
          nome_responsavel: x.nome_responsavel || null, tratamento: x.tratamento || null, cargo: x.cargo || null, email: x.email || null, usuario: x.usuario, whatsapp: x.whatsapp || null,
          telefone_antes: (db.academia_vinculos.find(v => v.academia_id === p.academia_id && v.papel === "principal" && v.telefone_da_ficha) || {}).telefone_da_ficha || null,
          ...(() => {
            const w = (window.__whatsapps || []).filter(z => z.user_id === p.user_id && z.academia_id === p.academia_id).slice(-1)[0];
            return w ? { whatsapp_em: w.criado_em, whatsapp_enviado_em: w.enviado_em, whatsapp_origem: w.origem, whatsapp_erro: w.erro } : {};
          })() };
      }), error:null };
    }
    // Pedido de acesso ao responsável (SQL 20261003140000).
    if (nome === "pedidos_para_minha_academia") {
      const x = meuAcesso();
      if (!x || !x.academia_id || (vinculo(x.user_id, x.academia_id) || {}).papel !== "principal") return { data:[], error:null };
      return { data: pedidosPara(x.academia_id).filter(p => p.user_id !== x.user_id && p.destino !== "disputa")
        .map(p => { const y = db.academia_acessos.find(z => z.user_id === p.user_id) || {};
          return { user_id: p.user_id, nome: y.nome_responsavel || null, email: y.email || y.usuario, cargo: y.cargo || null, pedido_em: p.pedido_em || null }; }), error:null };
    }
    if (nome === "responder_pedido_de_acesso") {
      const x = meuAcesso();
      if (!x || !x.academia_id || (vinculo(x.user_id, x.academia_id) || {}).papel !== "principal") return erro("Só o responsável principal responde aos pedidos.", "42501");
      const ele = pedidosPara(x.academia_id).some(p => p.user_id === a.p_user && p.destino !== "disputa") && db.academia_acessos.find(y => y.user_id === a.p_user);
      if (!ele) return erro("Pedido não encontrado.", "22023");
      if (!a.p_aceitar) { fecharPedido(a.p_user, x.academia_id); return { data:null, error:null }; }
      const lim = limite(planoDe(x.academia_id));
      if (db.academia_vinculos.filter(v => v.academia_id === x.academia_id).length >= lim) return erro(`O seu plano permite até ${lim} ${lim === 1 ? "pessoa" : "pessoas"}. Aprimore o plano para aceitar mais gente.`, "22023");
      ligar(ele, x.academia_id, true);
      return { data:null, error:null };
    }
    if (nome === "pedir_plano") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      if (!["completo", "premium"].includes(a.p_plano)) return erro("Plano inválido.", "22023");
      if (!vinculo(x.user_id, a.p_academia) && !pedidosDe(x.user_id).some(p => p.academia_id === a.p_academia)) return erro("A sua conta não administra essa academia.", "42501");
      const ac = db.academias.find(y => y.id === a.p_academia);
      if (!ac) return erro("Academia não encontrada.", "22023");
      if (ordem(ac.plano || "basico") >= ordem(a.p_plano)) return { data:null, error:null };
      const i = db.pedidos_de_plano.findIndex(y => y.academia_id === a.p_academia);
      if (i >= 0) db.pedidos_de_plano.splice(i, 1);
      db.pedidos_de_plano.push({ academia_id: a.p_academia, plano: a.p_plano, user_id: x.user_id, onde: a.p_onde || null, created_at: new Date().toISOString() });
      return { data:null, error:null };
    }
    if (nome === "pedidos_de_plano_admin") {
      if (!souAdmin()) return { data:[], error:null };
      return { data: db.pedidos_de_plano.map(p => {
        const ac = db.academias.find(y => y.id === p.academia_id) || {};
        const x = db.academia_acessos.find(y => y.user_id === p.user_id) || {};
        return { academia_id: p.academia_id, nome: ac.name, status: ac.status, plano_atual: ac.plano || "basico", plano: p.plano, onde: p.onde, created_at: p.created_at, pessoa: x.nome_responsavel || null, email: x.email || x.usuario || null, whatsapp: x.whatsapp || null };
      }), error:null };
    }
    // A academia pausa a própria ficha (SQL 20261005130000).
    if (nome === "pausar_minha_academia") {
      const x = meuAcesso();
      if (!x || !vinculo(x.user_id, a.p_academia)) return erro("A sua conta não administra essa academia.", "42501");
      const ac = db.academias.find(y => y.id === a.p_academia);
      if (!ac) return erro("Academia não encontrada.", "22023");
      if (ac.status !== "published") return erro("A academia ainda está em análise: ela só aparece no site depois que o GuiaTennis publicar.", "22023");
      if (a.p_pausar && a.p_ate && new Date(a.p_ate) <= new Date()) return erro("Escolha uma data depois de hoje.", "22023");
      if (!a.p_pausar && ac.pausada && !ac.pausada_pela_academia && (!ac.pausada_ate || new Date(ac.pausada_ate) > new Date())) return erro("Essa academia foi pausada pelo GuiaTennis. Fale com a gente para ela voltar a aparecer.", "42501");
      Object.assign(ac, { pausada: !!a.p_pausar, pausada_ate: a.p_pausar ? (a.p_ate || null) : null, pausada_pela_academia: !!a.p_pausar });
      return { data:null, error:null };
    }
    // Pedido para tirar do guia (SQL 20261008150000).
    if (nome === "pedir_para_sair_do_guia") {
      const x = meuAcesso();
      const v = x && vinculo(x.user_id, a.p_academia);
      if (!v || v.papel !== "principal") return erro("Quem pede para tirar a academia do guia é o responsável principal.", "42501");
      if (!["fechou", "nao_quer", "outro"].includes(a.p_motivo)) return erro("Escolha o motivo.", "22023");
      if (a.p_motivo === "outro" && !String(a.p_detalhes || "").trim()) return erro("Conte o motivo em poucas palavras.", "22023");
      if (db.pedidos_para_sair.some(p => p.academia_id === a.p_academia && !p.resolvido_em)) return erro("Já existe um pedido para tirar esta academia do guia.", "22023");
      const ac = db.academias.find(y => y.id === a.p_academia) || {};
      const p = { id: "saida-" + (db.pedidos_para_sair.length + 1), academia_id: a.p_academia, academia_nome: ac.name, user_id: x.user_id, motivo: a.p_motivo, detalhes: String(a.p_detalhes || "").trim() || null, pedido_em: new Date().toISOString(), resolvido_em: null };
      db.pedidos_para_sair.push(p);
      db.emails_a_enviar.push({ id: "e-" + p.id, tipo: "pedido_para_sair", para: ADMIN, assunto: "Pedido para tirar do guia: " + ac.name, criado_em: p.pedido_em, enviado_em: null, tentativas: 0, erro: null });
      return { data: p.id, error:null };
    }
    if (nome === "cancelar_pedido_para_sair") {
      const x = meuAcesso();
      if (!x || !vinculo(x.user_id, a.p_academia)) return erro("A sua conta não administra essa academia.", "42501");
      db.pedidos_para_sair.filter(p => p.academia_id === a.p_academia && !p.resolvido_em).forEach(p => { p.resolvido_em = new Date().toISOString(); p.resolucao = "cancelado"; });
      return { data:null, error:null };
    }
    if (nome === "meus_pedidos_para_sair") {
      const x = meuAcesso();
      if (!x) return { data:[], error:null };
      return { data: db.pedidos_para_sair.filter(p => !p.resolvido_em && vinculo(x.user_id, p.academia_id)).map(p => ({ academia_id: p.academia_id, motivo: p.motivo, pedido_em: p.pedido_em })), error:null };
    }
    if (nome === "pedidos_para_sair_admin") {
      if (!souAdmin()) return { data:[], error:null };
      return { data: db.pedidos_para_sair.filter(p => !p.resolvido_em).map(p => {
        const ac = db.academias.find(y => y.id === p.academia_id) || {};
        const x = db.academia_acessos.find(y => y.user_id === p.user_id) || {};
        return { id: p.id, academia_id: p.academia_id, nome: p.academia_nome, bairro: ac.bairro, cidade: ac.cidade, motivo: p.motivo, detalhes: p.detalhes, pedido_em: p.pedido_em, pessoa: x.nome_responsavel, email: x.email, whatsapp: x.whatsapp };
      }), error:null };
    }
    if (nome === "resolver_pedido_para_sair") {
      if (!souAdmin()) return erro("Só o GuiaTennis resolve esse pedido.", "42501");
      const p = db.pedidos_para_sair.find(y => y.id === a.p_id && !y.resolvido_em);
      if (!p) return erro("Pedido não encontrado ou já resolvido.", "22023");
      Object.assign(p, { resolvido_em: new Date().toISOString(), resolucao: a.p_remover ? "removida" : "mantida", resposta: a.p_resposta || null });
      if (a.p_remover) { db.academias = window.__db.academias = db.academias.filter(y => y.id !== p.academia_id); p.academia_id = null; }
      return { data:null, error:null };
    }
    // Promoções (SQL 20261008140000).
    if (nome === "salvar_promocao") {
      const x = meuAcesso();
      if (!x || !vinculo(x.user_id, a.p_academia)) return erro("A sua conta não administra essa academia.", "42501");
      const ac = db.academias.find(y => y.id === a.p_academia);
      if (!ac || ac.plano !== "premium") return erro("As promoções são do plano Premium.", "42501");
      const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      const limite = new Date(Date.now() + 90 * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      const titulo = String(a.p_titulo || "").trim();
      if (titulo.length < 3 || titulo.length > 60) return erro('Escreva a promoção em até 60 letras (por exemplo, "Primeira aula grátis").', "22023");
      if (!a.p_valida_ate || a.p_valida_ate < hoje || a.p_valida_ate > limite) return erro("Escolha até quando a promoção vale: de hoje até 90 dias.", "22023");
      if (a.p_id) {
        const p = db.promocoes.find(y => y.id === a.p_id && y.academia_id === a.p_academia);
        if (!p) return erro("Promoção não encontrada.", "22023");
        Object.assign(p, { titulo, detalhes: String(a.p_detalhes || "").trim() || null, valida_ate: a.p_valida_ate });
        return { data: { id: p.id, aviso: null, avisados: p.avisados || 0 }, error:null };
      }
      if (db.promocoes.filter(y => y.academia_id === a.p_academia && y.valida_ate >= hoje).length >= 3) return erro("A academia já tem 3 promoções valendo. Encerre uma para criar outra.", "22023");
      const aviso = window.__promoAviso || { aviso: "ninguem", avisados: 0 };
      const p = { id: "promo-" + (db.promocoes.length + 1), academia_id: a.p_academia, titulo, detalhes: String(a.p_detalhes || "").trim() || null, valida_ate: a.p_valida_ate, avisados: aviso.avisados, created_at: new Date().toISOString() };
      db.promocoes.push(p);
      return { data: { id: p.id, aviso: aviso.aviso, avisados: aviso.avisados }, error:null };
    }
    if (nome === "apagar_promocao") {
      const p = db.promocoes.find(y => y.id === a.p_id);
      if (!p) return { data:null, error:null };
      const x = meuAcesso();
      if (!souAdmin() && !(x && vinculo(x.user_id, p.academia_id))) return erro("A sua conta não administra essa academia.", "42501");
      db.promocoes = window.__db.promocoes = db.promocoes.filter(y => y.id !== a.p_id);
      return { data:null, error:null };
    }
    if (nome === "promocoes_da_minha_academia") {
      const x = meuAcesso();
      if (!souAdmin() && !(x && vinculo(x.user_id, a.p_academia))) return { data:[], error:null };
      const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      return { data: db.promocoes.filter(y => y.academia_id === a.p_academia).map(y => ({ ...y, valendo: y.valida_ate >= hoje }))
        .sort((p, q) => (q.valendo - p.valendo) || String(q.valida_ate).localeCompare(String(p.valida_ate))), error:null };
    }
    if (nome === "academias_da_minha_conta") {
      const x = meuAcesso();
      if (!x) return { data:[], error:null };
      const lista = vinculosDe(x.user_id).map(v => {
        const ac = db.academias.find(y => y.id === v.academia_id) || {};
        const pausada = !!ac.pausada && (!ac.pausada_ate || new Date(ac.pausada_ate) > new Date());
        return { academia_id: v.academia_id, nome: ac.name, papel: v.papel, status: ac.status, pausada, plano: ac.plano || "basico", bairro: ac.bairro, cidade: ac.cidade, aberta: v.academia_id === x.academia_id,
          pausada_ate: ac.pausada_ate || null, pausada_pela_academia: !!ac.pausada_pela_academia };
      }).sort((p, q) => String(p.nome).localeCompare(String(q.nome)));
      return { data: lista, error:null };
    }
    if (nome === "abrir_minha_academia") {
      const x = meuAcesso();
      const v = x && vinculo(x.user_id, a.p_academia);
      if (!v) return erro("A sua conta não administra essa academia.", "42501");
      Object.assign(x, { academia_id: v.academia_id, papel: v.papel });
      return { data:null, error:null };
    }
    if (nome === "criar_acesso_academia") {
      if (!souAdmin()) return erro("Só o GuiaTennis cria acesso.", "42501");
      if (db.academia_acessos.some(x => x.usuario === a.p_usuario)) return erro("Esse usuário já existe. Escolha outro.", "23505");
      const id = "u-" + a.p_academia;
      db.academia_acessos.push({ user_id:id, academia_id:a.p_academia, usuario:a.p_usuario, created_at:new Date().toISOString() });
      if (!vinculo(id, a.p_academia)) db.academia_vinculos.push({ user_id:id, academia_id:a.p_academia, papel:"principal", created_at:new Date().toISOString() });
      window.__senhas[a.p_usuario + DOMINIO] = a.p_senha;
      return { data:id, error:null };
    }
    if (nome === "nova_senha_academia") {
      const x = db.academia_acessos.find(x => x.user_id === a.p_user);
      if (!souAdmin() || !x) return erro("Só o GuiaTennis troca a senha de uma academia.", "42501");
      window.__senhas[x.usuario + DOMINIO] = a.p_senha; x.senha_trocada_em = null;
      return { data:null, error:null };
    }
    if (nome === "remover_acesso_academia") {
      if (!souAdmin()) return erro("Só o GuiaTennis remove um acesso.", "42501");
      window.__removido = { user: a.p_user, academia: a.p_academia || null };
      if (a.p_academia && vinculosDe(a.p_user).some(v => v.academia_id !== a.p_academia)) { desligar(a.p_user, a.p_academia); return { data:null, error:null }; }
      apagarConta(a.p_user);
      return { data:null, error:null };
    }
    if (nome === "completar_meu_acesso") {
      const x = meuAcesso();
      if (!x) return erro("Acesso não encontrado.", "42501");
      if (!x.termos_aceitos_em && !a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      const novoEmail = String(a.p_email || "").trim().toLowerCase();
      if (loginDe(x).endsWith(DOMINIO) && novoEmail && !window.__senhas[novoEmail]) {
        window.__senhas[novoEmail] = window.__senhas[loginDe(x)];
        delete window.__senhas[loginDe(x)];
        x.loginEmail = novoEmail;
      }
      Object.assign(x, { nome_responsavel:a.p_nome, cargo:a.p_cargo, tratamento:a.p_tratamento || x.tratamento || null, email:a.p_email.toLowerCase(), whatsapp:a.p_whatsapp, cnpj:a.p_cnpj || null, recebe_relatorio:!!a.p_recebe_relatorio,
        termos_aceitos_em: x.termos_aceitos_em || new Date().toISOString(), dados_completos_em: x.dados_completos_em || new Date().toISOString() });
      return { data:null, error:null };
    }
    if (nome === "login_do_usuario") {
      const u = String(a.p_usuario || "").trim().toLowerCase();
      const x = !u.includes("@") && db.academia_acessos.find(y => y.usuario === u);
      return { data: x ? loginDe(x) : null, error:null };
    }
    if (nome === "login_do_email") {
      const e = String(a.p_email || "").trim().toLowerCase();
      const x = e.includes("@") && db.academia_acessos.find(x => loginDe(x) === e || (x.email || "").toLowerCase() === e);
      return { data: x ? loginDe(x) : null, error:null };
    }
    if (nome === "criar_minha_conta") {
      const e = String(a.p_email || "").trim().toLowerCase();
      if (sessao) return erro("Saia da conta atual para criar outra.", "22023");
      if (db.contas_excluidas.some(c => c.email === e)) return erro("Esse e-mail não pode criar conta no GuiaTennis. Fale com o GuiaTennis.", "42501");
      if (!a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      if (tel(a.p_whatsapp).length < 10 || tel(a.p_whatsapp).length > 11) return erro("WhatsApp inválido: use o DDD e o número.", "22023");
      if (db.academia_acessos.some(x => loginDe(x) === e || (x.email || "").toLowerCase() === e) || e === ADMIN) return erro("Esse e-mail já tem conta no GuiaTennis Parceiros. Entre com a sua senha.", "23505");
      const id = novoLogin(e, a.p_senha);
      const t = new Date().toISOString();
      if (a.p_tratamento && !["Sr.", "Sra.", "Prefiro não informar"].includes(a.p_tratamento)) return erro("Escolha o tratamento.", "22023");
      db.academia_acessos.push({ user_id:id, academia_id:null, usuario:e, nome_responsavel:a.p_nome, email:e, whatsapp:tel(a.p_whatsapp), papel:"principal",
        tratamento:a.p_tratamento || null, cargo:a.p_cargo || null, recebe_relatorio:!!a.p_recebe_novidades,
        termos_aceitos_em:t, dados_completos_em:t, senha_trocada_em:t, created_at:t });
      return { data:null, error:null };
    }
    if (nome === "pedir_para_administrar") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      // A declaração (SQL 20261006130000): false recusa, true guarda a hora.
      if (a.p_declaro === false) return erro("Marque a declaração para pedir.", "22023");
      if (vinculo(x.user_id, a.p_academia)) return erro("A sua conta já administra essa academia.", "22023");
      const ac = db.academias.find(y => y.id === a.p_academia && y.status === "published");
      if (!ac) return erro("Academia não encontrada.", "22023");
      const temDono = db.academia_vinculos.some(v => v.academia_id === ac.id && v.papel === "principal");
      // Sem responsável e sem disputa (SQL 20261007130000): com o e-mail
      // confirmado e a declaração, a conta assume na hora.
      if (a.p_declaro === true && x.email_confirmado_em && x.dados_completos_em && !temDono) {
        fecharPedido(x.user_id, ac.id);
        assumir(x, ac.id);
        return { data:"assumiu", error:null };
      }
      if (pedidosDe(x.user_id).filter(p => p.academia_id !== ac.id).length >= 10) return erro("A sua conta já tem 10 pedidos abertos. Espere algum ser confirmado ou cancele um.", "22023");
      db.pedidos_de_acesso = db.pedidos_de_acesso.filter(p => !(p.user_id === x.user_id && p.academia_id === ac.id));
      db.pedidos_de_acesso.push({ user_id: x.user_id, academia_id: ac.id, nome: ac.name, destino: temDono ? "responsavel" : "guiatennis", pedido_em: new Date().toISOString(), declarou_em: a.p_declaro ? new Date().toISOString() : null });
      window.__db.pedidos_de_acesso = db.pedidos_de_acesso;
      return { data:"pedido", error:null };
    }
    if (nome === "contestar_academia") {
      if (window.__semDisputa) return semFuncao;
      const x = meuAcesso();
      const p = x && pedidosDe(x.user_id).find(q => q.academia_id === a.p_academia && q.destino === "responsavel");
      if (!p) return erro("Peça para administrar a academia antes de contestar.", "22023");
      Object.assign(p, { destino: "disputa", pedido_em: new Date().toISOString() });
      const ac = db.academias.find(y => y.id === a.p_academia) || {};
      db.emails_a_enviar.push({ id: "e-disputa-" + a.p_academia + x.user_id, tipo: "disputa", para: ADMIN, assunto: "Disputa: " + ac.name, criado_em: p.pedido_em, enviado_em: null, tentativas: 0, erro: null });
      // Banco antes do SQL 20261007140000: não devolve nada.
      if (window.__semCodigoPeloWhatsapp) return { data:null, error:null };
      return { data: codigoDaDisputaPelaConta(x, p.academia_id), error:null };
    }
    // O código da disputa pelo WhatsApp (SQL 20261007140000). window.__whatsappLigado
    // liga o envio; window.__whatsapps anota as mensagens (o teste lê o código dali).
    if (nome === "pedir_codigo_da_disputa") {
      if (window.__semCodigoPeloWhatsapp) return semFuncao;
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      return { data: codigoDaDisputaPelaConta(x, a.p_academia), error:null };
    }
    if (nome === "mandar_codigo_admin") {
      if (window.__semCodigoPeloWhatsapp) return semFuncao;
      if (!souAdmin()) return erro("Só o GuiaTennis manda o código.", "42501");
      const x = db.academia_acessos.find(y => y.user_id === a.p_user);
      const p = x && pedidoDaConta(x.user_id, a.p_academia);
      if (!p) return erro("Pedido não encontrado.", "22023");
      return { data: codigoPeloWhatsapp(x, p.academia_id, "admin"), error:null };
    }
    // O que a pessoa guarda fica na conta (SQL 20261008130000).
    if (nome === "guardar_na_conta") {
      if (window.__semGuardados) return semFuncao;
      const j = euJogador();
      if (!j) return erro("Conta de jogador não encontrada.", "42501");
      const objeto = ["preferencias", "pedir_avaliacao"].includes(a.p_chave);
      if (!["favoritas", "chamadas", "viagens", "preferencias", "avaliadas", "pedir_avaliacao"].includes(a.p_chave)) return erro("Não sei guardar isso.", "22023");
      if (a.p_valor == null || (objeto ? (typeof a.p_valor !== "object" || Array.isArray(a.p_valor)) : !Array.isArray(a.p_valor))) return erro("Formato errado.", "22023");
      j.guardados = { ...(j.guardados || {}), [a.p_chave]: JSON.parse(JSON.stringify(a.p_valor)) };
      return { data: null, error: null };
    }
    if (nome === "situacao_do_whatsapp") {
      if (window.__semCodigoPeloWhatsapp) return semFuncao;
      if (!souAdmin()) return erro("Só o admin.", "42501");
      return { data: window.__situacaoWhatsapp || { ligado: !!window.__whatsappLigado, token: !!window.__whatsappLigado, numero: !!window.__whatsappLigado, real: true, numero_de_teste: false, envio: true, relogio: true, enviados_30_dias: (window.__whatsapps || []).length, falharam: 0, ultimo_erro: null }, error:null };
    }
    if (nome === "cancelar_meu_pedido") {
      const x = meuAcesso();
      if (x) pedidosDe(x.user_id).filter(p => !a || !a.p_academia || p.academia_id === a.p_academia).forEach(p => fecharPedido(x.user_id, p.academia_id));
      return { data:null, error:null };
    }
    if (nome === "aprovar_pedido_de_acesso" || nome === "recusar_pedido_de_acesso") {
      if (!souAdmin()) return erro("Só o GuiaTennis aprova pedidos.", "42501");
      const x = db.academia_acessos.find(y => y.user_id === a.p_user);
      const p = x && pedidoDaConta(x.user_id, a.p_academia);
      if (!p) return erro("Pedido não encontrado.", "22023");
      if (nome === "aprovar_pedido_de_acesso") { if (p.destino === "disputa") vencerDisputa(x, p.academia_id); else ligar(x, p.academia_id); }
      else fecharPedido(x.user_id, p.academia_id);
      return { data:null, error:null };
    }
    // Código para o WhatsApp da academia (SQL 20261001120000). O código
    // gerado fica em window.__codigos, para o teste digitar.
    if (nome === "gerar_codigo_do_pedido") {
      if (!souAdmin()) return erro("Só o GuiaTennis gera o código.", "42501");
      const x = db.academia_acessos.find(y => y.user_id === a.p_user);
      const p = x && pedidoDaConta(x.user_id, a.p_academia);
      if (!p) return erro("Pedido não encontrado.", "22023");
      if (vinculo(x.user_id, p.academia_id)) return erro("Essa conta já administra essa academia.", "22023");
      if (p.destino !== "disputa" && db.academia_vinculos.some(v => v.academia_id === p.academia_id && v.papel === "principal")) return erro("Essa academia já tem responsável: o pedido está com ele.", "22023");
      const codigo = String(100000 + Math.floor(Math.random() * 900000));
      window.__codigos = window.__codigos || {};
      // Um código por conta e academia; o mais novo também fica na conta (o teste lê dali).
      const c = { codigo, academia: p.academia_id, tentativas: 0, em: new Date().toISOString() };
      window.__codigos[a.p_user + "|" + p.academia_id] = c;
      window.__codigos[a.p_user] = c;
      x.codigo_em = c.em;
      return { data: codigo, error:null };
    }
    if (nome === "confirmar_meu_codigo") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      const cs = window.__codigos || {};
      const daConta = cs[x.user_id];
      const c = a.p_academia ? (cs[x.user_id + "|" + a.p_academia] || (daConta && daConta.academia === a.p_academia ? daConta : null)) : daConta;
      if (!c || !pedidosDe(x.user_id).some(p => p.academia_id === c.academia)) return { data:"sem_codigo", error:null };
      if (c.tentativas >= 5) return { data:"tentativas", error:null };
      if (String(a.p_codigo || "").replace(/\D/g, "") !== c.codigo) { c.tentativas++; return { data:"errado", error:null }; }
      const naDisputa = pedidosDe(x.user_id).some(p => p.academia_id === c.academia && p.destino === "disputa");
      if (naDisputa) vencerDisputa(x, c.academia); else ligar(x, c.academia);
      delete cs[x.user_id + "|" + c.academia];
      return { data:"ok", error:null };
    }
    if (nome === "pessoas_da_minha_academia") {
      const x = meuAcesso();
      if (!x || !x.academia_id) return { data:[], error:null };
      const lista = db.academia_vinculos.filter(v => v.academia_id === x.academia_id)
        .sort((p, q) => (q.papel === "principal") - (p.papel === "principal"))
        .map(v => { const y = db.academia_acessos.find(z => z.user_id === v.user_id) || {};
          return { user_id:v.user_id, nome:y.nome_responsavel || null, email:y.email || y.usuario, papel:v.papel, dados_completos_em:y.dados_completos_em || null, ultimo_acesso:null, sou_eu:v.user_id === x.user_id }; });
      return { data:lista, error:null };
    }
    if (nome === "adicionar_pessoa") {
      const x = meuAcesso();
      if (!x || !x.academia_id) return erro("A sua conta ainda não administra uma academia.", "42501");
      if ((vinculo(x.user_id, x.academia_id) || {}).papel !== "principal") return erro("Só o responsável principal adiciona pessoas.", "42501");
      const e = String(a.p_email || "").trim().toLowerCase();
      const lim = limite(planoDe(x.academia_id));
      if (db.academia_vinculos.filter(v => v.academia_id === x.academia_id).length >= lim) return erro(`O seu plano permite até ${lim} ${lim === 1 ? "pessoa" : "pessoas"}. Aprimore o plano para adicionar mais.`, "22023");
      const outro = db.academia_acessos.find(y => loginDe(y) === e || (y.email || "").toLowerCase() === e);
      if (outro) {
        if (vinculo(outro.user_id, x.academia_id)) return erro("Essa pessoa já tem acesso a esta academia.", "23505");
        ligar(outro, x.academia_id, false);
        return { data:"ligada", error:null };
      }
      const id = novoLogin(e, a.p_senha);
      db.academia_acessos.push({ user_id:id, academia_id:x.academia_id, usuario:e, nome_responsavel:a.p_nome || null, email:e, papel:"equipe", created_at:new Date().toISOString() });
      db.academia_vinculos.push({ user_id:id, academia_id:x.academia_id, papel:"equipe", created_at:new Date().toISOString() });
      return { data:"criada", error:null };
    }
    if (nome === "remover_pessoa") {
      const x = meuAcesso();
      if (!x || !x.academia_id || (vinculo(x.user_id, x.academia_id) || {}).papel !== "principal") return erro("Só o responsável principal remove pessoas.", "42501");
      if (a.p_user === x.user_id) return erro("Você não pode remover a si mesmo.", "22023");
      const v = vinculo(a.p_user, x.academia_id);
      if (!v) return erro("Pessoa não encontrada.", "22023");
      if (v.papel === "principal") return erro("Outro responsável principal só o GuiaTennis remove.", "42501");
      desligar(a.p_user, x.academia_id);
      const ele = db.academia_acessos.find(y => y.user_id === a.p_user);
      if (ele && !pedidosDe(a.p_user).length && !vinculosDe(a.p_user).length) apagarConta(a.p_user);
      return { data:null, error:null };
    }
    // Números da academia: o plano sai de window.__plano ou da ficha.
    if (nome === "numeros_da_academia") {
      const x = meuAcesso();
      if (!x || !x.academia_id) return erro("Sem acesso aos números dessa academia.", "42501");
      const ac = db.academias.find(y => y.id === x.academia_id) || {};
      const plano = window.__plano || ac.plano || "basico";
      const pedido = a.p_dias === undefined ? 30 : a.p_dias;
      const dias = plano === "premium" ? (pedido <= 0 ? 0 : pedido) : plano === "completo" ? Math.min(Math.max(pedido || 30, 7), 90) : 30;
      // Desde 02/10/2026, números só no Premium (SQL 20261002120000).
      // Desde 07/10/2026, os acessos de 30 dias em todo plano (SQL 20261007160000).
      // window.__semAcessos finge o banco antes dele; window.__acessos troca o número.
      if (plano !== "premium") return { data: window.__semAcessos ? { plano, trancado: true } : { plano, trancado: true, dias: 30, acessos: window.__acessos ?? 42 }, error: null };
      const base = { plano, dias, visitas: 42, contatos: 9 };
      if (plano === "basico") return { data: base, error: null };
      const n = dias || 120;
      const por_dia = Array.from({ length: n }, (_, i) => ({ dia: new Date(Date.UTC(2026, 8, 30) - (n - 1 - i) * 864e5).toISOString().slice(0, 10), visitas: (i * 7) % 5, contatos: i % 4 === 0 ? 1 : 0 }));
      const completo = { ...base, canais: { whatsapp: 7, instagram: 2, site: 0, compartilhar: 1 }, anterior: { visitas: 30, contatos: 9 }, por_dia,
        origens: [{ nome: "Instagram", n: 20 }, { nome: "Google", n: 15 }, { nome: "Direto", n: 7 }], aparelhos: [{ nome: "Celular", n: 35 }, { nome: "Computador", n: 7 }] };
      if (plano === "completo") return { data: completo, error: null };
      return { data: { ...completo, regioes: [{ nome: "Pinheiros, São Paulo", n: 12 }, { nome: "Vila Madalena, São Paulo", n: 5 }], media_cidade: { cidade: "São Paulo", academias: 2, visitas: 30, contatos: 5 } }, error: null };
    }
    if (nome === "conta_do_email") {
      const email = String(a.p_email || "").trim().toLowerCase();
      if (email === ADMIN) return { data: { tipo: "admin", login: email }, error: null };
      const x = db.academia_acessos.find(y => (y.email || "").toLowerCase() === email || loginDe(y) === email);
      if (x) return { data: { tipo: "academia", login: loginDe(x) }, error: null };
      if (db.jogadores.some(j => j.email === email)) return { data: { tipo: "jogador", login: email }, error: null };
      return { data: null, error: null };
    }
    if (nome === "confirmar_meu_email") {
      if (!sessao || !sessao.otp) return erro("Confirme o e-mail pelo código.", "42501");
      const agora2 = new Date().toISOString();
      db.jogadores.filter(j => j.user_id === sessao.user.id).forEach(j => { j.email_confirmado_em = j.email_confirmado_em || agora2; });
      db.academia_acessos.filter(x => x.user_id === sessao.user.id).forEach(x => { x.email_confirmado_em = x.email_confirmado_em || agora2; });
      // assumir_pedidos_da_conta (SQL 20261007130000).
      const x = meuAcesso();
      if (x && x.dados_completos_em) pedidosDe(x.user_id).filter(p => p.destino === "guiatennis" && p.declarou_em).forEach(p => {
        const ac = db.academias.find(y => y.id === p.academia_id);
        if (!ac) return;
        if (ac.status === "pending") { Object.assign(ac, { status: "published", confirmada: true, revisar_desde: agora2 }); ligar(x, ac.id, true); }
        else if (!db.academia_vinculos.some(v => v.academia_id === ac.id && v.papel === "principal")) assumir(x, ac.id);
      });
      return { data:null, error:null };
    }
    if (nome === "criar_conta_jogador") {
      const email = String(a.p_email || "").trim().toLowerCase();
      if (sessao) return erro("Saia da conta atual para criar outra.", "22023");
      if (!a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      if ((a.p_senha || "").length < 8) return erro("A senha precisa ter pelo menos 8 caracteres.", "22023");
      if (db.contas_excluidas.some(c => c.email === email)) return erro("Esse e-mail não pode criar conta no GuiaTennis. Fale com o GuiaTennis.", "42501");
      if (window.__senhas[email] || email === ADMIN || db.academia_acessos.some(x => (x.email || "").toLowerCase() === email))
        return erro("Esse e-mail já tem conta no GuiaTennis. Entre com a sua senha.", "23505");
      const id = novoLogin(email, a.p_senha);
      db.jogadores.push({ user_id: id, nome: String(a.p_nome).trim(), email, cidade: a.p_cidade || null,
        avisos_academias: !!a.p_avisos_academias, promocoes: !!a.p_promocoes, novidades: !!a.p_novidades,
        termos_aceitos_em: new Date().toISOString(), created_at: new Date().toISOString() });
      return { data:null, error:null };
    }
    if (nome === "excluir_minha_conta_jogador") {
      const j = euJogador();
      if (!j) return erro("Essa conta não é de jogador.", "42501");
      db.jogadores.splice(db.jogadores.indexOf(j), 1);
      db.avaliacoes.filter(r => r.user_id === j.user_id).forEach(r => { r.user_id = null; });
      delete window.__senhas[j.email];
      return { data:null, error:null };
    }
    // Conta do GuiaTennis Parceiros também joga (SQL 20261005170000).
    if (nome === "ativar_conta_de_jogador") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta.", "42501");
      let j = euJogador();
      if (!j) {
        const login = sessao.user.email || "";
        const email = login.includes("@") && !login.endsWith(DOMINIO) ? login : (x.email || "");
        j = { user_id: x.user_id, nome: x.nome_responsavel || email.split("@")[0], email, cidade: null, avisos_academias: false, promocoes: false, novidades: false,
          email_confirmado_em: x.email_confirmado_em || null, termos_aceitos_em: x.termos_aceitos_em || new Date().toISOString(), created_at: new Date().toISOString(), token_avisos: "tok-" + x.user_id };
        db.jogadores.push(j);
      }
      return { data: j, error: null };
    }
    // Avisos por e-mail (SQL 20261005160000).
    if (nome === "parar_avisos") {
      const j = db.jogadores.find(y => y.token_avisos === a.p_token);
      if (j) {
        const buscas = db.buscas_salvas.filter(b => b.user_id === j.user_id);
        if (a.p_aviso === "viagem") { j.avisos_viagem = false; return { data: "viagem", error: null }; }
        if (a.p_aviso === "novas") { j.avisos_academias = false; buscas.forEach(b => { b.avisar = false; }); return { data: "novas", error: null }; }
        Object.assign(j, { avisos_academias: false, promocoes: false, novidades: false, avisos_viagem: false });
        buscas.forEach(b => { b.avisar = false; });
        return { data: "todos", error: null };
      }
      const x = db.academia_acessos.find(y => y.token_avisos === a.p_token);
      if (x) { x.avisos_por_email = false; return { data: "parceiros", error: null }; }
      return { data: null, error: null };
    }
    if (nome === "mudar_avisos_dos_parceiros") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      x.avisos_por_email = !!a.p_ligado;
      return { data: null, error: null };
    }
    if (nome === "situacao_dos_emails") {
      if (!souAdmin()) return erro("Só o admin.", "42501");
      return { data: window.__situacaoEmails || { chave: true, envio: true, relogio: true, na_fila: 0, enviados_7_dias: 3, falharam: 0, ultimo_erro: null, por_tipo: {} }, error: null };
    }
    // Painel do admin (SQL 20261006120000): os e-mails da fila, mandar de
    // novo e os números das contas. window.__semPainelAdmin finge o banco sem o SQL.
    // Conta de jogador passa a valer no Parceiros (SQL 20261006160000).
    if (nome === "ativar_conta_do_parceiros") {
      if (!sessao) return erro("Entre na sua conta.", "42501");
      if (meuAcesso()) return { data: null, error: null };
      const j = euJogador();
      if (!j) return erro("Essa conta não é de jogador.", "42501");
      if (!a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      if (tel(a.p_whatsapp).length < 10 || tel(a.p_whatsapp).length > 11) return erro("WhatsApp inválido: use o DDD e o número.", "22023");
      const t = new Date().toISOString();
      db.academia_acessos.push({ user_id: j.user_id, academia_id: null, usuario: j.email, nome_responsavel: String(a.p_nome).trim(), tratamento: a.p_tratamento || null, cargo: a.p_cargo || null,
        email: j.email, whatsapp: tel(a.p_whatsapp), recebe_relatorio: !!a.p_recebe_novidades, termos_aceitos_em: t, dados_completos_em: t, senha_trocada_em: t, papel: "principal",
        email_confirmado_em: j.email_confirmado_em || null, avisos_por_email: true });
      return { data: null, error: null };
    }
    // O admin exclui a conta de quem descumprir os Termos (SQL 20261006150000).
    if (nome === "excluir_conta_admin") {
      if (!souAdmin()) return erro("Só o admin.", "42501");
      if (String(a.p_motivo || "").trim().length < 5) return erro("Escreva o motivo da exclusão.", "22023");
      const j = db.jogadores.find(y => y.user_id === a.p_user), x = db.academia_acessos.find(y => y.user_id === a.p_user);
      if (!j && !x) return erro("Conta não encontrada.", "22023");
      const emails = [...new Set([j && j.email, x && x.email, x && loginDe(x)].filter(Boolean).map(e => e.toLowerCase()))];
      const tipo = j && x ? "jogador e GuiaTennis Parceiros" : x ? "GuiaTennis Parceiros" : "jogador";
      emails.forEach(e => { db.contas_excluidas = db.contas_excluidas.filter(c => c.email !== e); db.contas_excluidas.push({ email: e, nome: (j && j.nome) || (x && x.nome_responsavel), tipo, motivo: a.p_motivo.trim(), avaliacoes_apagadas: !!a.p_apagar_avaliacoes, excluida_em: new Date().toISOString() }); });
      if (a.p_apagar_avaliacoes) db.avaliacoes = db.avaliacoes.filter(r => r.user_id !== a.p_user);
      else db.avaliacoes.forEach(r => { if (r.user_id === a.p_user) r.user_id = null; });
      window.__db.avaliacoes = db.avaliacoes;
      db.jogadores = db.jogadores.filter(y => y.user_id !== a.p_user); window.__db.jogadores = db.jogadores;
      db.academia_acessos = db.academia_acessos.filter(y => y.user_id !== a.p_user); window.__db.academia_acessos = db.academia_acessos;
      db.academia_vinculos = db.academia_vinculos.filter(y => y.user_id !== a.p_user); window.__db.academia_vinculos = db.academia_vinculos;
      db.buscas_salvas = db.buscas_salvas.filter(y => y.user_id !== a.p_user); window.__db.buscas_salvas = db.buscas_salvas;
      db.pedidos_de_acesso = db.pedidos_de_acesso.filter(y => y.user_id !== a.p_user); window.__db.pedidos_de_acesso = db.pedidos_de_acesso;
      window.__db.contas_excluidas = db.contas_excluidas;
      return { data: null, error: null };
    }
    if (nome === "contas_excluidas_admin") {
      if (!souAdmin()) return { data: [], error: null };
      return { data: JSON.parse(JSON.stringify(db.contas_excluidas)), error: null };
    }
    if (nome === "liberar_email_admin") {
      if (!souAdmin()) return erro("Só o admin.", "42501");
      db.contas_excluidas = db.contas_excluidas.filter(c => c.email !== String(a.p_email || "").trim().toLowerCase()); window.__db.contas_excluidas = db.contas_excluidas;
      return { data: null, error: null };
    }
    // Academias novas que foram ao ar sozinhas (SQL 20261006140000).
    if (nome === "academias_para_revisar_admin") {
      if (!souAdmin()) return { data: [], error: null };
      return { data: db.academias.filter(a => a.revisar_desde).map(a => {
        const v = db.academia_vinculos.find(y => y.academia_id === a.id && y.papel === "principal");
        const x = v && db.academia_acessos.find(y => y.user_id === v.user_id);
        return { id: a.id, nome: a.name, bairro: a.bairro, cidade: a.cidade, no_ar_desde: a.revisar_desde, quem: x ? x.nome_responsavel : null, email: x ? (x.email || x.usuario) : null, whatsapp: x ? x.whatsapp : null, declarou_em: v ? v.declarou_em || null : null };
      }), error: null };
    }
    if (nome === "marcar_academia_revisada") {
      if (!souAdmin()) return erro("Só o admin.", "42501");
      const ac = db.academias.find(y => y.id === a.p_academia);
      if (ac) ac.revisar_desde = null;
      return { data: null, error: null };
    }
    if (nome === "emails_recentes_admin" || nome === "reenviar_email_admin" || nome === "numeros_das_contas_admin") {
      if (window.__semPainelAdmin) return semFuncao;
      if (!souAdmin()) return erro("Só o admin.", "42501");
      const fila = db.emails_a_enviar;
      if (nome === "emails_recentes_admin") return { data: JSON.parse(JSON.stringify([...fila].sort((x, y) => String(y.criado_em).localeCompare(String(x.criado_em))).slice(0, a.p_limite || 50))), error: null };
      if (nome === "reenviar_email_admin") {
        fila.filter(e => e.id === a.p_id && !e.enviado_em).forEach(e => Object.assign(e, { tentativas: 0, erro: null, criado_em: new Date().toISOString() }));
        return { data: null, error: null };
      }
      const semana = Date.now() - 7 * 86400000;
      return { data: {
        jogadores: db.jogadores.length, confirmados: db.jogadores.filter(j => j.email_confirmado_em).length,
        novos_7_dias: db.jogadores.filter(j => new Date(j.created_at).getTime() > semana).length,
        aviso_cidade: db.jogadores.filter(j => j.avisos_academias).length, aviso_viagem: db.jogadores.filter(j => j.avisos_viagem).length,
        promocoes: db.jogadores.filter(j => j.promocoes).length, novidades: db.jogadores.filter(j => j.novidades).length,
        buscas_salvas: db.buscas_salvas.length, buscas_com_aviso: db.buscas_salvas.filter(b => b.avisar).length,
        contas_parceiros: db.academia_acessos.length,
        academias_com_responsavel: new Set(db.academia_vinculos.filter(v => v.papel === "principal").map(v => v.academia_id)).size,
        pedidos_abertos: db.pedidos_de_acesso.length,
      }, error: null };
    }
    if (nome === "marcar_senha_trocada") { const x = meuAcesso(); if (x) x.senha_trocada_em = new Date().toISOString(); return { data:null, error:null }; }
    return semFuncao;
  }
  window.supabase = { createClient(url, chave){ window.__banco = { url, chave }; return {
    from: builder,
    rpc(nome, args){
      const r = rodarRpc(nome, args);
      const p = Promise.resolve(r);
      p.single = () => Promise.resolve(r);
      return p;
    },
    auth: {
      getSession(){ return Promise.resolve({ data:{ session: sessao } }); },
      signInWithPassword({ email, password }){
        window.__ultimoLogin = email;
        if (email === ADMIN || (window.__senhas[email] && window.__senhas[email] === password)) {
          const acesso = db.academia_acessos.find(x => loginDe(x) === email);
          const jog = db.jogadores.find(x => x.email === email);
          sessao = { user: { id: email === ADMIN ? "admin" : (acesso ? acesso.user_id : jog ? jog.user_id : "sem-acesso"), email } };
          return Promise.resolve({ data:{ session: sessao, user: sessao.user }, error:null });
        }
        return Promise.resolve({ data:{ session:null }, error:{ message:"Invalid login credentials", code:"invalid_credentials" } });
      },
      updateUser(attrs){
        // window.__erroSenha: true (a mesma senha de antes) ou o erro do Supabase; vale uma vez.
        if (window.__erroSenha) {
          const e = window.__erroSenha === true ? { message:"New password should be different from the old password.", code:"same_password", status:422 } : window.__erroSenha;
          window.__erroSenha = null;
          return Promise.resolve({ data:{}, error:e });
        }
        window.__senhaNova = attrs.password;
        window.__senhaAtualEnviada = attrs.current_password;
        if (sessao) window.__senhas[sessao.user.email] = attrs.password;
        return Promise.resolve({ data:{ user: sessao && sessao.user }, error:null });
      },
      // Código por e-mail (SQL 20261002150000): o código mandado fica em
      // __codigos[email]; window.__semEmail finge o serviço de e-mail desligado.
      signInWithOtp({ email }){
        if (window.__semEmail) return Promise.resolve({ data:{}, error:{ message:"Error sending magic link email" } });
        window.__codigos = window.__codigos || {};
        window.__codigos[email] = "123456";
        return Promise.resolve({ data:{}, error:null });
      },
      verifyOtp({ email, token }){
        if (!window.__codigos || window.__codigos[email] !== token) return Promise.resolve({ data:{ session:null }, error:{ message:"Token has expired or is invalid" } });
        delete window.__codigos[email];
        const acesso = db.academia_acessos.find(x => loginDe(x) === email);
        const jog = db.jogadores.find(x => x.email === email);
        sessao = { user: { id: email === ADMIN ? "admin" : acesso ? acesso.user_id : jog ? jog.user_id : "sem-acesso", email }, otp: true };
        return Promise.resolve({ data:{ session: sessao, user: sessao.user }, error:null });
      },
      signOut(){ sessao = null; window.__saiu = true; return Promise.resolve({}); },
      onAuthStateChange(){ return { data:{ subscription:{ unsubscribe(){} } } }; },
    },
  }; } };
})();
