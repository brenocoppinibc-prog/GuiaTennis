// Finge o Supabase para os testes: tabelas em memória (window.__db), e as
// funções do banco. Chaves: __admin, __semDetalhe, __semCep, __semTempo, __colunasFechadas,
// __semPlano, __semConfirmada, __academia (id da academia logada),
// __semAcesso (banco sem o SQL do acesso das academias). O que o site grava
// em cliques fica em __cliques, o banco que o site abriu fica em __banco, as
// funções chamadas em __rpcs e a última senha trocada em __senhaNova.
(function(){
  const agora = new Date().toISOString();
  const db = window.__db = {
    academias: [
      { id:"a1", name:"Só Aula Tennis", address:"Rua A", numero:"1", bairro:"Pinheiros", cidade:"São Paulo", endereco:"Rua A, 1 - Pinheiros, São Paulo", lat:-23.56, lng:-46.68, phone:"11999990001", instagram:"", site:"", price_aula:"", price_locacao:"", amenities:["raquete","estacionamento_gratuito"], modalidades:["aulas_proprias"], quadras:{saibro_coberta:2}, pisos:["saibro"], cobertura:["coberta"], photos:[], status:"published", created_at:agora,
        politica:{ modo:"separado", aula:{reposicao:"24", foraDoPrazo:"Perde a aula."}, locacao:{reposicao:"12", foraDoPrazo:"Cobra metade."} },
        acesso:{ fachada:"Portão preto", entrada:"Avise na portaria", estacionar:"Rua de trás" },
        horario:{ modo:"igual", semana:{de:"06:00",ate:"22:00",fechado:false}, sabado:{de:"08:00",ate:"14:00",fechado:false}, domingo:{de:"",ate:"",fechado:true}, nota:"" } },
      { id:"a2", name:"Quadra Locação", address:"Rua B", numero:"2", bairro:"Moema", cidade:"São Paulo", endereco:"Rua B, 2 - Moema, São Paulo", lat:-23.60, lng:-46.66, phone:"11999990002", price_aula:"", price_locacao:"100-120", amenities:[], modalidades:["locacao"], quadras:{rapida_descoberta:1}, pisos:["rapida"], cobertura:["descoberta"], photos:[], status:"published", created_at:agora, confirmada:false,
        politica:{ modo:"igual", reposicao:"48", foraDoPrazo:"" }, acesso:{}, horario:{} },
    ],
    avaliacoes: JSON.parse(JSON.stringify(window.__avaliacoesIniciais || [])), cliques: [],
    // Login de cada academia (a senha fica em __senhas, pelo e-mail do login).
    academia_acessos: [],
    respostas: JSON.parse(JSON.stringify(window.__respostasIniciais || [])),
    // Conta do jogador (SQL 20261002130000). window.__jogador abre o site
    // já logado como "Ana Jogadora".
    jogadores: [],
  };
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
      recebe_relatorio: false, termos_aceitos_em: novo ? null : agora, dados_completos_em: novo ? null : agora, senha_trocada_em: novo ? null : agora });
    window.__senhas["quadra." + window.__academia + DOMINIO] = "provisoria1";
  }
  if (window.__jogador) {
    db.jogadores.push({ user_id: "j-ana", nome: "Ana Jogadora", email: "ana@exemplo.com", cidade: "São Paulo", avisos_academias: false, promocoes: false, novidades: false, termos_aceitos_em: agora, created_at: agora });
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
  const loginDe = (x) => x.usuario.includes("@") ? x.usuario : x.usuario + DOMINIO;
  const tel = (t) => { const d = String(t || "").replace(/\D/g, ""); return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d; };
  const planoDe = (id) => window.__plano || (db.academias.find(y => y.id === id) || {}).plano || "basico";
  const limite = (plano) => ({ premium: 10, completo: 5 }[plano] || 1);
  const ligar = (x, academiaId) => {
    const temPrincipal = db.academia_acessos.some(y => y.academia_id === academiaId && (y.papel || "principal") === "principal");
    Object.assign(x, { academia_id: academiaId, papel: temPrincipal ? "equipe" : "principal", pedido_academia_id: null, pedido_nome: null, pedido_em: null });
  };
  let seq = 0;
  const novoLogin = (email, senha) => { window.__senhas[email] = senha; return "u-conta-" + (++seq); };
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
      if (!t || (window.__semAcesso && (table === "academia_acessos" || table === "respostas"))) return { data:null, error:{ message:"relation does not exist" } };
      const pass = r => filtros.every(([k,v]) => r[k] === v);
      if (op === "insert") {
        if (table === "cliques" && window.__semDetalhe && "detalhe" in payload) return { data:null, error:{ message:"column detalhe does not exist" } };
        if (table === "cliques" && window.__semCep && "cep" in payload) return { data:null, error:{ message:"column cep does not exist" } };
        if (table === "cliques" && window.__semTempo && ("segundos" in payload || "segundos_ficha" in payload)) return { data:null, error:{ message:"column segundos does not exist" } };
        if (table === "academias" && window.__semConfirmada && "confirmada" in payload) return { data:null, error:{ message:"column academias.confirmada does not exist" } };
        if (table === "avaliacoes" && !souAdmin()) {
          if (meuAcesso()) return { data:null, error:{ message:"Contas do GuiaTennis Parceiros não avaliam academias.", code:"42501" } };
          const c = String(payload.contato_autor || "").trim().toLowerCase(), n = tel(payload.contato_autor);
          const deAcademia = c && (db.academia_acessos.some(x => (x.email || "").toLowerCase() === c || loginDe(x) === c || (n.length >= 10 && tel(x.whatsapp) === n))
            || (n.length >= 10 && db.academias.some(y => tel(y.phone) === n)));
          if (deAcademia) return { data:null, error:{ message:"Esse contato é de uma academia do GuiaTennis, e academias não avaliam academias.", code:"42501" } };
          // Gatilho avaliacao_do_jogador: só com conta, uma por academia, com o nome dela.
          const j = euJogador();
          if (!j) return { data:null, error:{ message:"Entre na sua conta para avaliar.", code:"42501" } };
          if (t.some(r => r.academia_id === payload.academia_id && r.user_id === j.user_id)) return { data:null, error:{ message:"Você já avaliou essa academia.", code:"23505" } };
          Object.assign(payload, { user_id: j.user_id, nome_autor: j.nome, contato_autor: j.email });
        }
        const r = { id: "n" + (t.length+1) + Math.random().toString(36).slice(2,5), created_at: new Date().toISOString(), ...payload };
        t.push(r);
        // Gatilho pedido_da_academia_nova: a academia nova vira o pedido da conta.
        if (table === "academias" && sessao && !souAdmin() && meuAcesso() && !meuAcesso().academia_id)
          Object.assign(meuAcesso(), { pedido_academia_id: r.id, pedido_nome: r.name, pedido_em: new Date().toISOString() });
        return { data: single ? r : [r], error:null };
      }
      if (op === "update") {
        window.__ultimoUpdate = JSON.parse(JSON.stringify(payload));
        if (table === "jogadores" && !(euJogador() && filtros.every(([k, v]) => k === "user_id" && v === euJogador().user_id))) return { data:null, error:{ message:"permission denied" } };
        const mudanca = JSON.parse(JSON.stringify(payload));
        // O que o gatilho do banco faz quando quem salva é a academia.
        if (table === "academias" && sessao && !souAdmin()) {
          ["status", "pago", "plano", "pausada", "pausada_ate", "source", "nome_solicitante", "contato_solicitante"].forEach(k => delete mudanca[k]);
          mudanca.confirmada = true;
        }
        t.filter(pass).forEach(r => {
          const antes = r.status;
          Object.assign(r, mudanca);
          // Gatilho liberar_pedidos_da_academia.
          if (table === "academias" && r.status === "published" && antes !== "published")
            db.academia_acessos.filter(x => x.pedido_academia_id === r.id && !x.academia_id).forEach(x => ligar(x, r.id));
        });
        return { data:null, error:null };
      }
      if (op === "delete") {
        if (table === "respostas") { const fora = t.filter(pass); fora.forEach(r => t.splice(t.indexOf(r), 1)); window.__apagadas = (window.__apagadas || 0) + fora.length; }
        return { data:null, error:null };
      }
      // Depois do SQL-SEGURANCA.sql, o visitante não lê a linha inteira.
      if (window.__colunasFechadas && !window.__admin && colunas === "*" && (table === "academias" || table === "avaliacoes")) return { data:null, error:{ message:"permission denied for table " + table } };
      // Antes do SQL, pode faltar coluna nova.
      if (window.__semPlano && table === "academias" && colunas.includes("plano")) return { data:null, error:{ message:"column academias.plano does not exist" } };
      // Banco sem a coluna da ficha básica: a lista com ela falha, e o "*" não traz o campo.
      if (window.__semConfirmada && table === "academias" && colunas.includes("confirmada")) return { data:null, error:{ message:"column academias.confirmada does not exist" } };
      if (window.__semConfirmada && table === "academias") { const out = JSON.parse(JSON.stringify(t.filter(pass))).map(r => { delete r.confirmada; return r; }); return { data: single ? out[0] : out, error:null }; }
      if (table === "cliques" && window.__semCep && colunas.includes("cep")) return { data:null, error:{ message:"column cliques.cep does not exist" } };
      const out = JSON.parse(JSON.stringify(t.filter(pass)));
      return { data: single ? out[0] : out, error:null };
    }
    return q;
  }
  const semFuncao = { data:null, error:{ message:"Could not find the function", code:"PGRST202" } };
  const erro = (message, code) => ({ data:null, error:{ message, code } });
  function rodarRpc(nome, a){
    window.__rpcs.push({ nome, args: JSON.parse(JSON.stringify(a || {})) });
    if (nome === "estatisticas_publicas") return { data:{ acessos_total:1234, buscas_total:567, fichas_total:89, contatos_total:12 }, error:null };
    if (window.__semAcesso) return semFuncao;
    if (nome === "contatos_privados") {
      if (!souAdmin()) return { data:[], error:null };
      return { data: [
        ...db.academias.filter(x => x.nome_solicitante || x.contato_solicitante).map(x => ({ tabela:"academias", id:x.id, nome:x.nome_solicitante, contato:x.contato_solicitante })),
        ...db.avaliacoes.filter(x => x.contato_autor).map(x => ({ tabela:"avaliacoes", id:x.id, nome:null, contato:x.contato_autor })),
      ], error:null };
    }
    if (nome === "acessos_das_academias") return { data: souAdmin() ? JSON.parse(JSON.stringify(db.academia_acessos)) : [], error:null };
    if (nome === "criar_acesso_academia") {
      if (!souAdmin()) return erro("Só o GuiaTennis cria acesso.", "42501");
      if (db.academia_acessos.some(x => x.usuario === a.p_usuario)) return erro("Esse usuário já existe. Escolha outro.", "23505");
      const id = "u-" + a.p_academia;
      db.academia_acessos.push({ user_id:id, academia_id:a.p_academia, usuario:a.p_usuario, created_at:new Date().toISOString() });
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
      const i = db.academia_acessos.findIndex(x => x.user_id === a.p_user);
      if (i >= 0) db.academia_acessos.splice(i, 1);
      return { data:null, error:null };
    }
    if (nome === "completar_meu_acesso") {
      const x = meuAcesso();
      if (!x) return erro("Acesso não encontrado.", "42501");
      if (!x.termos_aceitos_em && !a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      Object.assign(x, { nome_responsavel:a.p_nome, cargo:a.p_cargo, tratamento:a.p_tratamento || x.tratamento || null, email:a.p_email.toLowerCase(), whatsapp:a.p_whatsapp, cnpj:a.p_cnpj || null, recebe_relatorio:!!a.p_recebe_relatorio,
        termos_aceitos_em: x.termos_aceitos_em || new Date().toISOString(), dados_completos_em: x.dados_completos_em || new Date().toISOString() });
      return { data:null, error:null };
    }
    if (nome === "login_do_email") {
      const e = String(a.p_email || "").trim().toLowerCase();
      const x = e.includes("@") && db.academia_acessos.find(x => loginDe(x) === e || (x.email || "").toLowerCase() === e);
      return { data: x ? loginDe(x) : null, error:null };
    }
    if (nome === "criar_minha_conta") {
      const e = String(a.p_email || "").trim().toLowerCase();
      if (sessao) return erro("Saia da conta atual para criar outra.", "22023");
      if (!a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      if (tel(a.p_whatsapp).length < 10 || tel(a.p_whatsapp).length > 11) return erro("WhatsApp inválido: use o DDD e o número.", "22023");
      if (db.academia_acessos.some(x => loginDe(x) === e || (x.email || "").toLowerCase() === e) || e === ADMIN) return erro("Esse e-mail já tem conta no GuiaTennis Parceiros. Entre com a sua senha.", "23505");
      const id = novoLogin(e, a.p_senha);
      const t = new Date().toISOString();
      if (a.p_tratamento && !["Sr.", "Sra.", "Prefiro não informar"].includes(a.p_tratamento)) return erro("Escolha o tratamento.", "22023");
      db.academia_acessos.push({ user_id:id, academia_id:null, usuario:e, nome_responsavel:a.p_nome, email:e, whatsapp:tel(a.p_whatsapp), papel:"principal",
        tratamento:a.p_tratamento || null, cargo:a.p_cargo || null, recebe_relatorio:!!a.p_recebe_novidades,
        termos_aceitos_em:t, dados_completos_em:t, senha_trocada_em:t, created_at:t, pedido_academia_id:null, pedido_nome:null, pedido_em:null });
      return { data:null, error:null };
    }
    if (nome === "pedir_para_administrar") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      if (x.academia_id) return erro("A sua conta já administra uma academia.", "22023");
      const ac = db.academias.find(y => y.id === a.p_academia && y.status === "published");
      if (!ac) return erro("Academia não encontrada.", "22023");
      Object.assign(x, { pedido_academia_id: ac.id, pedido_nome: ac.name, pedido_em: new Date().toISOString() });
      return { data:null, error:null };
    }
    if (nome === "cancelar_meu_pedido") {
      const x = meuAcesso();
      if (x && !x.academia_id) Object.assign(x, { pedido_academia_id:null, pedido_nome:null, pedido_em:null });
      return { data:null, error:null };
    }
    if (nome === "aprovar_pedido_de_acesso" || nome === "recusar_pedido_de_acesso") {
      if (!souAdmin()) return erro("Só o GuiaTennis aprova pedidos.", "42501");
      const x = db.academia_acessos.find(y => y.user_id === a.p_user);
      if (!x || !x.pedido_academia_id) return erro("Pedido não encontrado.", "22023");
      if (nome === "aprovar_pedido_de_acesso") ligar(x, x.pedido_academia_id);
      else Object.assign(x, { pedido_academia_id:null, pedido_nome:null, pedido_em:null });
      return { data:null, error:null };
    }
    // Código para o WhatsApp da academia (SQL 20261001120000). O código
    // gerado fica em window.__codigos, para o teste digitar.
    if (nome === "gerar_codigo_do_pedido") {
      if (!souAdmin()) return erro("Só o GuiaTennis gera o código.", "42501");
      const x = db.academia_acessos.find(y => y.user_id === a.p_user);
      if (!x || !x.pedido_academia_id || x.academia_id) return erro("Pedido não encontrado.", "22023");
      const codigo = String(100000 + Math.floor(Math.random() * 900000));
      window.__codigos = window.__codigos || {};
      window.__codigos[a.p_user] = { codigo, academia: x.pedido_academia_id, tentativas: 0 };
      x.codigo_em = new Date().toISOString();
      return { data: codigo, error:null };
    }
    if (nome === "confirmar_meu_codigo") {
      const x = meuAcesso();
      if (!x) return erro("Entre na sua conta do GuiaTennis Parceiros.", "42501");
      if (x.academia_id) return erro("A sua conta já administra uma academia.", "22023");
      const c = (window.__codigos || {})[x.user_id];
      if (!c || c.academia !== x.pedido_academia_id) return { data:"sem_codigo", error:null };
      if (c.tentativas >= 5) return { data:"tentativas", error:null };
      if (String(a.p_codigo || "").replace(/\D/g, "") !== c.codigo) { c.tentativas++; return { data:"errado", error:null }; }
      ligar(x, c.academia);
      delete window.__codigos[x.user_id];
      return { data:"ok", error:null };
    }
    if (nome === "pessoas_da_minha_academia") {
      const x = meuAcesso();
      if (!x || !x.academia_id) return { data:[], error:null };
      const lista = db.academia_acessos.filter(y => y.academia_id === x.academia_id)
        .sort((p, q) => ((q.papel || "principal") === "principal") - ((p.papel || "principal") === "principal"))
        .map(y => ({ user_id:y.user_id, nome:y.nome_responsavel || null, email:y.email || y.usuario, papel:y.papel || "principal", dados_completos_em:y.dados_completos_em || null, ultimo_acesso:null, sou_eu:y.user_id === x.user_id }));
      return { data:lista, error:null };
    }
    if (nome === "adicionar_pessoa") {
      const x = meuAcesso();
      if (!x || !x.academia_id) return erro("A sua conta ainda não administra uma academia.", "42501");
      if ((x.papel || "principal") !== "principal") return erro("Só o responsável principal adiciona pessoas.", "42501");
      const e = String(a.p_email || "").trim().toLowerCase();
      const lim = limite(planoDe(x.academia_id));
      if (db.academia_acessos.filter(y => y.academia_id === x.academia_id).length >= lim) return erro(`O seu plano permite até ${lim} pessoas. Aprimore o plano para adicionar mais.`, "22023");
      const outro = db.academia_acessos.find(y => loginDe(y) === e || (y.email || "").toLowerCase() === e);
      if (outro) {
        if (outro.academia_id) return erro("Esse e-mail já tem acesso a uma academia no GuiaTennis Parceiros.", "23505");
        if (outro.pedido_academia_id && outro.pedido_academia_id !== x.academia_id) return erro("Essa pessoa já pediu para administrar outra academia.", "23505");
        ligar(outro, x.academia_id);
        return { data:"ligada", error:null };
      }
      const id = novoLogin(e, a.p_senha);
      db.academia_acessos.push({ user_id:id, academia_id:x.academia_id, usuario:e, nome_responsavel:a.p_nome || null, email:e, papel:"equipe", created_at:new Date().toISOString() });
      return { data:"criada", error:null };
    }
    if (nome === "remover_pessoa") {
      const x = meuAcesso();
      if (!x || !x.academia_id || (x.papel || "principal") !== "principal") return erro("Só o responsável principal remove pessoas.", "42501");
      if (a.p_user === x.user_id) return erro("Você não pode remover a si mesmo.", "22023");
      const i = db.academia_acessos.findIndex(y => y.user_id === a.p_user && y.academia_id === x.academia_id);
      if (i < 0) return erro("Pessoa não encontrada.", "22023");
      if ((db.academia_acessos[i].papel || "principal") === "principal") return erro("Outro responsável principal só o GuiaTennis remove.", "42501");
      db.academia_acessos.splice(i, 1);
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
      if (plano !== "premium") return { data: { plano, trancado: true }, error: null };
      const base = { plano, dias, visitas: 42, contatos: 9 };
      if (plano === "basico") return { data: base, error: null };
      const n = dias || 120;
      const por_dia = Array.from({ length: n }, (_, i) => ({ dia: new Date(Date.UTC(2026, 8, 30) - (n - 1 - i) * 864e5).toISOString().slice(0, 10), visitas: (i * 7) % 5, contatos: i % 4 === 0 ? 1 : 0 }));
      const completo = { ...base, canais: { whatsapp: 7, instagram: 2, site: 0, compartilhar: 1 }, anterior: { visitas: 30, contatos: 9 }, por_dia,
        origens: [{ nome: "Instagram", n: 20 }, { nome: "Google", n: 15 }, { nome: "Direto", n: 7 }], aparelhos: [{ nome: "Celular", n: 35 }, { nome: "Computador", n: 7 }] };
      if (plano === "completo") return { data: completo, error: null };
      return { data: { ...completo, regioes: [{ nome: "Pinheiros, São Paulo", n: 12 }, { nome: "Vila Madalena, São Paulo", n: 5 }], media_cidade: { cidade: "São Paulo", academias: 2, visitas: 30, contatos: 5 } }, error: null };
    }
    if (nome === "criar_conta_jogador") {
      const email = String(a.p_email || "").trim().toLowerCase();
      if (sessao) return erro("Saia da conta atual para criar outra.", "22023");
      if (!a.p_aceite) return erro("Falta aceitar os Termos de Uso e a Política de Privacidade.", "22023");
      if ((a.p_senha || "").length < 8) return erro("A senha precisa ter pelo menos 8 caracteres.", "22023");
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
        if (window.__erroSenha) return Promise.resolve({ data:{}, error:{ message:"New password should be different from the old password.", code:"same_password" } });
        window.__senhaNova = attrs.password;
        window.__senhaAtualEnviada = attrs.current_password;
        if (sessao) window.__senhas[sessao.user.email] = attrs.password;
        return Promise.resolve({ data:{ user: sessao && sessao.user }, error:null });
      },
      signOut(){ sessao = null; window.__saiu = true; return Promise.resolve({}); },
      onAuthStateChange(){ return { data:{ subscription:{ unsubscribe(){} } } }; },
    },
  }; } };
})();
