#!/usr/bin/env python3
"""Confere o acesso das academias num banco de verdade, com o login de
verdade do Supabase (supabase/auth, o "GoTrue").

Não roda com os outros testes: precisa de um Postgres com a pasta
supabase/ aplicada e do GoTrue ligado nele (GUIATENNIS-CONTEXTO.md, seção 6,
"Banco e login locais"). Nunca aponte para o banco de verdade.

  BANCO_URL=postgresql://postgres@127.0.0.1:5433/postgres \
  AUTH_URL=http://127.0.0.1:9999 JWT_SECRET=… python3 testes/banco-acesso.py

Cada consulta roda como o site roda: papel anon ou authenticated, com o
token do login em request.jwt.claims, igual ao PostgREST do Supabase.
"""
import base64, hashlib, hmac, json, os, subprocess, sys, time, urllib.error, urllib.request

BANCO = os.environ["BANCO_URL"]
AUTH = os.environ["AUTH_URL"].rstrip("/")
SEGREDO = os.environ["JWT_SECRET"]
ADMIN = "guiatennis1@gmail.com"
ACADEMIA = "00000000-0000-4000-8000-000000000001"   # Academia Exemplo Pinheiros
OUTRA = "00000000-0000-4000-8000-000000000002"      # Quadra Exemplo Moema
REVIEW_MINHA = "00000000-0000-4000-9000-000000000001"
REVIEW_OUTRA = "00000000-0000-4000-9000-000000000003"
falhas = 0


def ok(cond, msg):
    global falhas
    if not cond:
        falhas += 1
    print(("OK    " if cond else "FALHA ") + msg)


def b64(d):
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()


def token_servico():
    cab = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    corpo = b64(json.dumps({"role": "service_role", "iss": "supabase", "exp": int(time.time()) + 600}).encode())
    ass = b64(hmac.new(SEGREDO.encode(), f"{cab}.{corpo}".encode(), hashlib.sha256).digest())
    return f"{cab}.{corpo}.{ass}"


def claims(token):
    corpo = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(corpo + "=" * (-len(corpo) % 4)))


def http(metodo, caminho, corpo=None, token=None):
    req = urllib.request.Request(AUTH + caminho, method=metodo,
                                 data=json.dumps(corpo).encode() if corpo is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def entrar(email, senha):
    return http("POST", "/token?grant_type=password", {"email": email, "password": senha})


def sql(texto, papel=None, token=None):
    """Roda como o PostgREST: papel + claims do token. Devolve (ok, saída)."""
    prefixo = ""
    if papel:
        c = json.dumps(claims(token)) if token else json.dumps({"role": "anon"})
        prefixo = f"set local role {papel}; set local request.jwt.claims = '{c.replace(chr(39), chr(39) * 2)}'; "
    r = subprocess.run(["psql", BANCO, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-1", "-c", prefixo + texto],
                       capture_output=True, text=True)
    saida = (r.stdout + r.stderr).strip()
    return r.returncode == 0, "\n".join(l for l in saida.splitlines() if l != "")


def ultimo(texto, papel=None, token=None):
    bom, s = sql(texto, papel, token)
    return bom, (s.splitlines()[-1] if s else "")


# Admin do banco de teste: criado como o Breno cria no painel do Supabase.
servico = token_servico()
s, _ = http("POST", "/admin/users", {"email": ADMIN, "password": "senha-do-admin-1", "email_confirm": True}, servico)
s, r = entrar(ADMIN, "senha-do-admin-1")
ok(s == 200, "admin entra pelo login do Supabase")
admin = r["access_token"]

# Limpa sobra de uma rodada anterior.
sql("delete from public.academia_acessos where usuario like 'exemplo%'")
sql("delete from public.respostas")

# ---- o admin cria o acesso ----
bom, uid = ultimo(f"select public.criar_acesso_academia('{ACADEMIA}', 'Exemplo.Pinheiros', 'provisoria1')", "authenticated", admin)
ok(bom and len(uid) == 36, "admin cria o acesso com usuário e senha provisória")
bom, s = sql(f"select public.criar_acesso_academia('{OUTRA}', 'exemplo.pinheiros', 'provisoria2')", "authenticated", admin)
ok(not bom and "já existe" in s, "usuário repetido é recusado")
bom, s = sql(f"select public.criar_acesso_academia('{OUTRA}', 'Ab', 'provisoria2')", "authenticated", admin)
ok(not bom and "Usuário inválido" in s, "usuário curto é recusado")
bom, s = sql(f"select public.criar_acesso_academia('{OUTRA}', 'exemplo.moema', '123')", "authenticated", admin)
ok(not bom and "8 caracteres" in s, "senha curta é recusada")
bom, s = sql(f"select public.criar_acesso_academia('{OUTRA}', 'exemplo.intruso', 'provisoria2')", "anon")
ok(not bom and "permission denied" in s, "visitante não chama a função de criar acesso")

# ---- a academia entra com a senha provisória ----
email = "exemplo.pinheiros@acesso.guiatennis.com.br"
s, r = entrar(email, "provisoria1")
ok(s == 200 and r.get("user", {}).get("id") == uid, "academia entra com o usuário e a senha provisória")
academia = r.get("access_token", "")
refresh = r.get("refresh_token", "")
ok(claims(academia).get("role") == "authenticated", "o token da academia é de usuário logado comum")
s, _ = entrar(email, "errada123")
ok(s == 400, "senha errada não entra")

# ---- o que a academia vê ----
bom, s = ultimo("select count(*) from public.academia_acessos", "authenticated", academia)
ok(bom and s == "1", "academia vê só o próprio acesso")
bom, s = sql("select nome_solicitante from public.academias limit 1", "authenticated", academia)
ok(not bom and "permission denied" in s, "academia não lê quem pediu cadastro")
bom, s = sql("select contato_autor from public.avaliacoes limit 1", "authenticated", academia)
ok(not bom and "permission denied" in s, "academia não lê o WhatsApp de quem avaliou")
bom, s = ultimo("select count(*) from public.cliques", "authenticated", academia)
ok(bom and s == "0", "academia não lê os cliques do site")
bom, s = ultimo("select count(*) from public.contatos_privados()", "authenticated", academia)
ok(bom and s == "0", "contatos privados voltam vazios para a academia")
bom, s = ultimo("select count(*) from public.acessos_das_academias()", "authenticated", academia)
ok(bom and s == "0", "lista de acessos volta vazia para a academia")
bom, s = sql(f"select public.criar_acesso_academia('{OUTRA}', 'exemplo.intruso', 'provisoria2')", "authenticated", academia)
ok(not bom and "Só o GuiaTennis" in s, "academia não cria acesso para ninguém")
bom, s = sql(f"select public.nova_senha_academia('{uid}', 'outrasenha1')", "authenticated", academia)
ok(not bom and "Só o GuiaTennis" in s, "academia não troca senha pela função do admin")

# ---- a academia edita a própria ficha, e só o que é dela ----
PROTEGIDAS = "status || '|' || plano || '|' || pago || '|' || pausada || '|' || source || '|' || coalesce(nome_solicitante, '-') || '|' || created_at"
_, protegidas = ultimo(f"select {PROTEGIDAS} from public.academias where id = '{ACADEMIA}'")
bom, s = sql(f"""update public.academias set name = 'Academia Exemplo Pinheiros (nova)', phone = '11000000099',
  status = 'pending', plano = 'premium', pago = false, pausada = true, source = 'osm', confirmada = false,
  nome_solicitante = 'eu', contato_solicitante = 'eu', created_at = now() - interval '9 years'
  where id = '{ACADEMIA}'""", "authenticated", academia)
ok(bom, "academia salva a própria ficha")
_, s = ultimo(f"select name || '|' || phone || '|' || confirmada from public.academias where id = '{ACADEMIA}'")
ok(s == "Academia Exemplo Pinheiros (nova)|11000000099|true", f"nome e WhatsApp mudam, e a ficha passa a confirmada ({s})")
_, depois = ultimo(f"select {PROTEGIDAS} from public.academias where id = '{ACADEMIA}'")
ok(depois == protegidas, f"status, plano, pausa, origem e quem pediu o cadastro não mudam ({depois})")
_, s = ultimo(f"select ficha_atualizada_em is not null from public.academia_acessos where user_id = '{uid}'")
ok(s == "t", "painel do admin fica sabendo que a academia atualizou a ficha")
_, antes = ultimo(f"select name from public.academias where id = '{OUTRA}'")
bom, s = sql(f"update public.academias set name = 'Invadida' where id = '{OUTRA}'", "authenticated", academia)
_, depois = ultimo(f"select name from public.academias where id = '{OUTRA}'")
ok(antes == depois, "academia não edita outra academia")
sql(f"delete from public.academias where id = '{ACADEMIA}'", "authenticated", academia)
_, s = ultimo(f"select count(*) from public.academias where id = '{ACADEMIA}'")
ok(s == "1", "academia não apaga a própria ficha")
sql(f"update public.academias set pausada = true where id = '{ACADEMIA}'")  # pausada pelo GuiaTennis
_, s = ultimo(f"select count(*) from public.academias where id = '{ACADEMIA}'", "authenticated", academia)
ok(s == "1", "academia pausada continua vendo a própria ficha")
_, s = ultimo(f"select count(*) from public.academias where id = '{ACADEMIA}'", "anon")
ok(s == "0", "o visitante não vê a academia pausada")
sql(f"update public.academias set pausada = false where id = '{ACADEMIA}'")

# ---- avaliações: não apaga, não se avalia ----
sql(f"delete from public.avaliacoes where id = '{REVIEW_MINHA}'", "authenticated", academia)
_, s = ultimo(f"select count(*) from public.avaliacoes where id = '{REVIEW_MINHA}'")
ok(s == "1", "academia não apaga avaliação")
bom, s = sql(f"insert into public.avaliacoes (academia_id, stars, comment, nome_autor) values ('{ACADEMIA}', 5, 'A melhor!', 'Dono')", "authenticated", academia)
ok(not bom and "não avaliam" in s, "academia não avalia a si mesma")
_, s2 = ultimo(f"select stars from public.avaliacoes where id = '00000000-0000-4000-9000-000000000002'")
sql("update public.avaliacoes set stars = 1 where id = '00000000-0000-4000-9000-000000000002'", "authenticated", academia)
_, s3 = ultimo(f"select stars from public.avaliacoes where id = '00000000-0000-4000-9000-000000000002'")
ok(s2 == s3, "academia não muda a nota de quem avaliou")
bom, _ = sql(f"insert into public.avaliacoes (academia_id, stars, comment, nome_autor) values ('{OUTRA}', 4, 'teste', 'Visitante')", "anon")
ok(bom, "visitante continua avaliando")

# ---- respostas ----
bom, s = sql(f"insert into public.respostas (avaliacao_id, texto) values ('{REVIEW_MINHA}', 'Obrigado, Ana!')", "authenticated", academia)
ok(bom, "academia responde avaliação dela")
bom, s = sql(f"insert into public.respostas (avaliacao_id, texto) values ('{REVIEW_OUTRA}', 'Intromissão')", "authenticated", academia)
ok(not bom and "row-level security" in s, "academia não responde avaliação de outra academia")
bom, s = sql(f"insert into public.respostas (avaliacao_id, texto) values ('{REVIEW_MINHA}', 'De novo')", "authenticated", academia)
ok(not bom, "uma resposta por avaliação")
bom, s = sql(f"insert into public.respostas (avaliacao_id, texto) values ('00000000-0000-4000-9000-000000000002', '   ')", "authenticated", academia)
ok(not bom, "resposta vazia é recusada")
_, criada = ultimo(f"select updated_at from public.respostas where avaliacao_id = '{REVIEW_MINHA}'")
time.sleep(0.05)
bom, _ = sql(f"update public.respostas set texto = 'Obrigado, Ana! Volte sempre.' where avaliacao_id = '{REVIEW_MINHA}'", "authenticated", academia)
_, s = ultimo(f"select texto || '|' || (updated_at > created_at) from public.respostas where avaliacao_id = '{REVIEW_MINHA}'")
ok(bom and s == "Obrigado, Ana! Volte sempre.|true", "academia edita a resposta, e a data de edição muda")
bom, s = sql(f"update public.respostas set avaliacao_id = '{REVIEW_OUTRA}' where avaliacao_id = '{REVIEW_MINHA}'", "authenticated", academia)
ok(not bom and "permission denied" in s, "academia não muda a resposta de avaliação")
_, s = ultimo(f"select texto from public.respostas where avaliacao_id = '{REVIEW_MINHA}'", "anon")
ok(s == "Obrigado, Ana! Volte sempre.", "visitante lê a resposta")
bom, s = sql("select user_id from public.respostas", "anon")
ok(not bom and "permission denied" in s, "visitante não lê quem escreveu a resposta")
bom, s = sql(f"insert into public.respostas (avaliacao_id, texto) values ('{REVIEW_OUTRA}', 'x')", "anon")
ok(not bom, "visitante não escreve resposta")
sql(f"insert into public.respostas (avaliacao_id, texto) values ('00000000-0000-4000-9000-000000000002', 'Vamos melhorar o estacionamento.')", "authenticated", academia)
sql("delete from public.respostas where avaliacao_id = '00000000-0000-4000-9000-000000000002'", "authenticated", academia)
_, s = ultimo("select count(*) from public.respostas where avaliacao_id = '00000000-0000-4000-9000-000000000002'")
ok(s == "0", "academia apaga a própria resposta")

# ---- primeiro acesso ----
bom, s = sql("select public.completar_meu_acesso('Maria Exemplo', 'Dono(a) ou sócio(a)', 'nao-e-email', '11 90000-0001', '', true, true)", "authenticated", academia)
ok(not bom and "E-mail inválido" in s, "e-mail errado é recusado")
bom, s = sql("select public.completar_meu_acesso('Maria Exemplo', 'Dono(a) ou sócio(a)', 'maria@exemplo.com', '11 90000-0001', '', true, false)", "authenticated", academia)
ok(not bom and "Termos" in s, "sem o aceite dos Termos não completa")
bom, s = sql("select public.completar_meu_acesso('Maria Exemplo', 'Dono(a) ou sócio(a)', 'Maria@Exemplo.com', '(11) 90000-0001', '12.345.678/0001-90', true, true)", "authenticated", academia)
ok(bom, "academia completa os dados do responsável")
_, s = ultimo(f"select nome_responsavel || '|' || email || '|' || whatsapp || '|' || cnpj || '|' || recebe_relatorio || '|' || (termos_aceitos_em is not null) from public.academia_acessos where user_id = '{uid}'")
ok(s == "Maria Exemplo|maria@exemplo.com|11900000001|12345678000190|true|true", f"dados gravados arrumados ({s})")
bom, s = sql("update public.academia_acessos set academia_id = '00000000-0000-4000-8000-000000000002'", "authenticated", academia)
_, s = ultimo(f"select academia_id from public.academia_acessos where user_id = '{uid}'")
ok(s == ACADEMIA, "academia não troca a academia do próprio acesso")

# ---- troca da senha provisória, pelo login do Supabase ----
s, r = http("PUT", "/user", {"password": "senhanova123"}, academia)
ok(s == 200, "academia troca a senha provisória")
bom, _ = sql("select public.marcar_senha_trocada()", "authenticated", academia)
_, s = ultimo(f"select senha_trocada_em is not null from public.academia_acessos where user_id = '{uid}'")
ok(bom and s == "t", "fica anotado que a senha foi trocada")
s, _ = entrar(email, "provisoria1")
ok(s == 400, "a senha provisória não entra mais")
s, r = entrar(email, "senhanova123")
ok(s == 200, "a senha nova entra")
refresh = r.get("refresh_token", refresh)

# ---- números da academia (GuiaTennis Parceiros) ----
# Cliques de exemplo: hoje, 10, 40 e 200 dias atrás, e outros da outra academia.
sql(f"delete from public.cliques where academia_id in ('{ACADEMIA}', '{OUTRA}')")
sql(f"""insert into public.cliques (academia_id, tipo, origem, dispositivo, detalhe, created_at)
  select '{ACADEMIA}'::uuid, 'visualizacao', 'Instagram'::text, 'Celular'::text, 'Pinheiros, São Paulo'::text, now() from generate_series(1, 5)
  union all select '{ACADEMIA}'::uuid, 'whatsapp', null, 'Celular', null, now() from generate_series(1, 2)
  union all select '{ACADEMIA}'::uuid, 'compartilhar', null, 'Celular', null, now()
  union all select '{ACADEMIA}'::uuid, 'instagram', null, 'Computador', null, now() - interval '10 days'
  union all select '{ACADEMIA}'::uuid, 'visualizacao', 'Google', 'Computador', 'Moema, São Paulo', now() - interval '40 days' from generate_series(1, 3)
  union all select '{ACADEMIA}'::uuid, 'visualizacao', null::text, null::text, null::text, now() - interval '200 days'
  union all select '{OUTRA}'::uuid, 'visualizacao', 'Direto', 'Celular', null, now() from generate_series(1, 4)""")


def numeros(args, token=None, papel="authenticated"):
    bom, s = ultimo(f"select public.numeros_da_academia({args})", papel, token)
    try:
        return bom, json.loads(s)
    except ValueError:
        return bom, s


bom, s = sql("select public.numeros_da_academia(30)", "anon")
ok(not bom and "permission denied" in s, "visitante não lê os números de academia nenhuma")
bom, s = sql("select public.numeros_da_academia(30)", "authenticated", admin)
ok(not bom and "Sem acesso" in s, "login sem academia não tem números para ver")

sql(f"update public.academias set plano = 'basico' where id = '{ACADEMIA}'")
_, d = numeros("90", academia)
ok(isinstance(d, dict) and sorted(d) == ["contatos", "dias", "plano", "visitas"] and d["dias"] == 30,
   f"Básico: só visitas e contatos, e pedir 90 dias devolve 30 ({d})")
ok(d.get("visitas") == 5 and d.get("contatos") == 3, "Básico: conta visitas e contatos dos últimos 30 dias (compartilhar não é contato)")
_, d2 = numeros(f"30, '{OUTRA}'", academia)
ok(d2 == d, "academia que pede os números de outra recebe os dela")

sql(f"update public.academias set plano = 'completo' where id = '{ACADEMIA}'")
_, d = numeros("90", academia)
ok(d.get("dias") == 90 and d.get("visitas") == 8 and len(d.get("por_dia", [])) == 90 and d["por_dia"][-1]["visitas"] == 5,
   "Completo: 90 dias, dia a dia, com o dia de hoje por último")
ok(d.get("canais") == {"whatsapp": 2, "instagram": 1, "site": 0, "compartilhar": 1} and "regioes" not in d and "media_cidade" not in d,
   f"Completo: contatos por canal, sem bairros nem média da cidade ({d.get('canais')})")
ok([o["nome"] for o in d.get("origens", [])] == ["Instagram", "Google"] and d["aparelhos"][0] == {"nome": "Celular", "n": 5},
   f"Completo: de onde vieram e aparelho ({d.get('origens')})")
_, d = numeros("30", academia)
ok(d.get("anterior") == {"visitas": 3, "contatos": 0}, f"Completo: período anterior do mesmo tamanho ({d.get('anterior')})")
_, d = numeros("0", academia)
ok(d.get("dias") == 7, "Completo: \"desde o começo\" é do Premium, cai para 7 dias")
_, d = numeros("365", academia)
ok(d.get("dias") == 90, "Completo: no máximo 90 dias")

sql(f"update public.academias set plano = 'premium' where id = '{ACADEMIA}'")
_, d = numeros("0", academia)
ok(d.get("dias") == 0 and d.get("visitas") == 9 and len(d.get("por_dia", [])) == 201 and d.get("anterior") is None,
   f"Premium: desde o primeiro clique, dia a dia ({len(d.get('por_dia', []))} dias)")
ok(d.get("regioes", [{}])[0] == {"nome": "Pinheiros, São Paulo", "n": 5}, f"Premium: bairros de quem procurou ({d.get('regioes')})")
m = d.get("media_cidade") or {}
ok(m.get("academias", 0) >= 2 and "visitas" in m and "contatos" in m, f"Premium: média das academias da cidade ({m})")

_, d = numeros(f"30, '{OUTRA}'", admin)
ok(d.get("visitas") == 4 and d.get("plano") == "basico", "admin abre os números de qualquer academia")
sql(f"delete from public.cliques where academia_id in ('{ACADEMIA}', '{OUTRA}')")
sql(f"update public.academias set plano = 'basico' where id = '{ACADEMIA}'")

# ---- o admin ----
bom, s = ultimo("select usuario || '|' || nome_responsavel || '|' || (ultimo_acesso is not null) from public.acessos_das_academias()", "authenticated", admin)
ok(s == "exemplo.pinheiros|Maria Exemplo|true", f"admin vê o acesso com o responsável e o último acesso ({s})")
bom, s = ultimo("select count(*) from public.contatos_privados() where tabela = 'avaliacoes'", "authenticated", admin)
ok(bom and int(s) >= 3, "admin lê o WhatsApp de quem avaliou pela função")
bom, s = ultimo("select count(*) from public.contatos_privados() where tabela = 'academias'", "authenticated", admin)
ok(bom and int(s) >= 1, "admin lê quem pediu cadastro pela função")
bom, s = sql(f"update public.academias set plano = 'completo', pago = true where id = '{ACADEMIA}'", "authenticated", admin)
_, s = ultimo(f"select plano from public.academias where id = '{ACADEMIA}'")
ok(s == "completo", "admin continua mudando o plano")
sql(f"update public.academias set plano = 'completo', pago = true, name = 'Academia Exemplo Pinheiros', phone = '11000000001' where id = '{ACADEMIA}'", "authenticated", admin)
bom, s = sql(f"delete from public.respostas where avaliacao_id = '{REVIEW_MINHA}'", "authenticated", admin)
_, s = ultimo(f"select count(*) from public.respostas where avaliacao_id = '{REVIEW_MINHA}'")
ok(s == "0", "admin apaga resposta (moderação)")

# Nova senha provisória: derruba quem estava conectado.
bom, _ = sql(f"select public.nova_senha_academia('{uid}', 'provisoria3')", "authenticated", admin)
ok(bom, "admin gera nova senha provisória")
s, _ = http("POST", "/token?grant_type=refresh_token", {"refresh_token": refresh})
ok(s != 200, "a sessão antiga da academia cai")
s, _ = entrar(email, "senhanova123")
ok(s == 400, "a senha anterior não entra mais")
s, r = entrar(email, "provisoria3")
ok(s == 200, "a nova senha provisória entra")
_, s = ultimo(f"select senha_trocada_em is null from public.academia_acessos where user_id = '{uid}'")
ok(s == "t", "a academia vai trocar a senha de novo")

# Remover o acesso apaga o login.
bom, _ = sql(f"select public.remover_acesso_academia('{uid}')", "authenticated", admin)
_, s = ultimo(f"select count(*) from auth.users where id = '{uid}'")
ok(bom and s == "0", "admin remove o acesso e o login some")
s, _ = entrar(email, "provisoria3")
ok(s == 400, "acesso removido não entra")

# Academia excluída leva o login junto.
_, nova = ultimo("insert into public.academias (name, status) values ('Exemplo Temporária', 'published') returning id")
_, uid2 = ultimo(f"select public.criar_acesso_academia('{nova}', 'exemplo.temporaria', 'provisoria9')", "authenticated", admin)
sql(f"delete from public.academias where id = '{nova}'", "authenticated", admin)
_, s = ultimo(f"select count(*) from auth.users where id = '{uid2}'")
ok(s == "0", "academia excluída leva o login junto")

# ---- contas do GuiaTennis Parceiros (20260930160000) ----
PENDENTE = "00000000-0000-4000-8000-000000000005"
sql("delete from public.academia_acessos where usuario like '%@exemplo.com' or usuario like 'exemplo.mapa%'")
sql("delete from auth.users where email like '%@exemplo.com'")
sql("delete from public.avaliacoes where comment like 'Teste de conta%'")
sql(f"update public.academias set plano = 'basico' where id = '{OUTRA}'")


def conta_nova(email, whats="(11) 98888-0001", nome="Dono Novo", senha="senhaforte1", aceite="true"):
    return sql(f"select public.criar_minha_conta('{email}', '{senha}', '{nome}', '{whats}', {aceite})", "anon")


_, s = ultimo("select coalesce(public.login_do_email('dono.novo@exemplo.com'), 'nada')", "anon")
ok(s == "nada", "e-mail sem conta: o cadastro segue para criar a conta")
bom, s = conta_nova("dono.novo@exemplo.com", aceite="false")
ok(not bom and "Termos" in s, "conta nova sem o aceite dos Termos é recusada")
bom, s = conta_nova("dono.novo@exemplo.com", whats="123")
ok(not bom and "WhatsApp inválido" in s, "conta nova com WhatsApp errado é recusada")
bom, s = conta_nova("dono.novo@exemplo.com", whats="+55 (11) 98888-0001")
ok(bom, "visitante cria a conta com e-mail, senha, nome e WhatsApp")
bom, s = conta_nova("Dono.Novo@Exemplo.com")
ok(not bom and "já tem conta" in s, "mesmo e-mail de novo: manda entrar com a senha")
_, s = ultimo("select public.login_do_email(' Dono.Novo@Exemplo.com ')", "anon")
ok(s == "dono.novo@exemplo.com", f"o cadastro acha a conta pelo e-mail ({s})")
_, s = ultimo("select whatsapp || '|' || papel || '|' || (academia_id is null) || '|' || (termos_aceitos_em is not null) from public.academia_acessos where usuario = 'dono.novo@exemplo.com'")
ok(s == "11988880001|principal|true|true", f"conta sem academia, com o WhatsApp arrumado e o aceite ({s})")
s, r = entrar("dono.novo@exemplo.com", "senhaforte1")
ok(s == 200, "a conta nova entra pelo login do Supabase com o e-mail")
conta = r.get("access_token", "")
bom, s = sql("select public.criar_minha_conta('outra@exemplo.com', 'senhaforte1', 'Outra Pessoa', '11 97777-0001', true)", "authenticated", conta)
ok(not bom and "Saia da conta" in s, "quem está logado não cria outra conta")

bom, s = ultimo("select count(*) from public.minhas_academias()", "authenticated", conta)
ok(bom and s == "0", "conta sem academia não edita academia nenhuma")
bom, s = sql("select public.numeros_da_academia(30)", "authenticated", conta)
ok(not bom and "Sem acesso" in s, "conta sem academia não vê números")
bom, s = sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{OUTRA}', 5, 'Teste de conta logada')", "authenticated", conta)
ok(not bom and "não avaliam" in s, "conta de parceiro logada não avalia academia")

bom, s = sql(f"select public.pedir_para_administrar('{PENDENTE}')", "authenticated", conta)
ok(not bom and "não encontrada" in s, "pedido só vale para academia publicada")
bom, s = sql(f"select public.pedir_para_administrar('{OUTRA}')", "authenticated", conta)
_, s = ultimo("select pedido_academia_id || '|' || pedido_nome from public.academia_acessos where usuario = 'dono.novo@exemplo.com'")
ok(bom and s == f"{OUTRA}|Quadra Exemplo Moema", f"conta pede para administrar a academia ({s})")
bom, s = sql(f"select public.aprovar_pedido_de_acesso((select user_id from public.academia_acessos where usuario = 'dono.novo@exemplo.com'))", "authenticated", conta)
ok(not bom and "Só o GuiaTennis" in s, "a conta não aprova o próprio pedido")
_, s = ultimo("select pedido_nome from public.acessos_das_academias() where usuario = 'dono.novo@exemplo.com'", "authenticated", admin)
ok(s == "Quadra Exemplo Moema", "admin vê o pedido na lista")
_, dono_id = ultimo("select user_id from public.academia_acessos where usuario = 'dono.novo@exemplo.com'")
bom, _ = sql(f"select public.aprovar_pedido_de_acesso('{dono_id}')", "authenticated", admin)
_, s = ultimo(f"select academia_id || '|' || papel || '|' || (pedido_academia_id is null) from public.academia_acessos where user_id = '{dono_id}'")
ok(bom and s == f"{OUTRA}|principal|true", f"admin aprova: a conta vira a responsável principal ({s})")
bom, s = ultimo(f"update public.academias set instagram = '@moema' where id = '{OUTRA}' returning instagram", "authenticated", conta)
ok(bom and s == "@moema", "depois de aprovada, a conta edita a ficha da academia")

# Equipe: o plano decide quantas pessoas (Básico 1, Completo 5, Premium 10).
bom, s = sql("select public.adicionar_pessoa('Equipe1@Exemplo.com', 'Pessoa Um', 'provisoria7')", "authenticated", conta)
ok(not bom and "até 1 pessoa." in s, "plano Básico: só o responsável principal")
sql(f"update public.academias set plano = 'completo' where id = '{OUTRA}'")
_, s = ultimo("select public.adicionar_pessoa('Equipe1@Exemplo.com', 'Pessoa Um', 'provisoria7')", "authenticated", conta)
ok(s == "criada", f"responsável principal adiciona uma pessoa com e-mail e senha provisória ({s})")
s, r = entrar("equipe1@exemplo.com", "provisoria7")
ok(s == 200, "a pessoa nova entra com o e-mail e a senha provisória")
equipe = r.get("access_token", "")
_, s = ultimo("select papel || '|' || (dados_completos_em is null) || '|' || (senha_trocada_em is null) from public.academia_acessos where usuario = 'equipe1@exemplo.com'")
ok(s == "equipe|true|true", "a pessoa nova faz o primeiro acesso e troca a senha, como as academias")
_, s = ultimo("select public.adicionar_pessoa('equipe2@exemplo.com', 'Pessoa Dois', 'provisoria7')", "authenticated", conta)
ok(s == "criada", "plano Completo: cabe mais gente")
bom, s = sql("select public.adicionar_pessoa('equipe3@exemplo.com', 'Pessoa Três', 'provisoria7')", "authenticated", equipe)
ok(not bom and "Só o responsável principal" in s, "quem é da equipe não adiciona pessoas")
bom, s = sql(f"select public.remover_pessoa('{dono_id}')", "authenticated", equipe)
ok(not bom and "Só o responsável principal" in s, "quem é da equipe não remove ninguém")
_, s = sql("select papel || ':' || email from public.pessoas_da_minha_academia()", "authenticated", equipe)
ok(s.splitlines() == ["principal:dono.novo@exemplo.com", "equipe:equipe1@exemplo.com", "equipe:equipe2@exemplo.com"], f"todos veem quem tem acesso, o principal primeiro ({s.splitlines()})")
bom, s = sql(f"select public.remover_pessoa('{dono_id}')", "authenticated", conta)
ok(not bom and "a si mesmo" in s, "o principal não remove a si mesmo")
_, e2 = ultimo("select user_id from public.academia_acessos where usuario = 'equipe2@exemplo.com'")
bom, _ = sql(f"select public.remover_pessoa('{e2}')", "authenticated", conta)
_, s = ultimo(f"select count(*) from auth.users where id = '{e2}'")
ok(bom and s == "0", "o principal remove uma pessoa e o login dela some")
bom, s = sql("select public.adicionar_pessoa('dono.novo@exemplo.com', 'Eu', 'provisoria7')", "authenticated", conta)
ok(not bom and "já tem acesso" in s, "quem já está na academia não entra de novo")
conta_nova("pediu@exemplo.com", whats="11 97777-0004", nome="Pediu Outra")
s, r = entrar("pediu@exemplo.com", "senhaforte1")
sql(f"select public.pedir_para_administrar('{ACADEMIA}')", "authenticated", r.get("access_token", ""))
_, s = ultimo("select public.adicionar_pessoa('pediu@exemplo.com', 'Pediu Outra', 'provisoria7')", "authenticated", conta)
_, s2 = ultimo("select academia_id || '|' || papel || '|' || pedido_academia_id from public.academia_acessos where usuario = 'pediu@exemplo.com'")
ok(s == "ligada" and s2 == f"{OUTRA}|equipe|{ACADEMIA}", f"quem pediu outra academia entra na equipe e o pedido continua ({s2})")
conta_nova("solto@exemplo.com", whats="11 97777-0002", nome="Pessoa Solta")
_, s = ultimo("select public.adicionar_pessoa('solto@exemplo.com', 'Pessoa Solta', 'provisoria7')", "authenticated", conta)
_, s2 = ultimo("select academia_id || '|' || papel from public.academia_acessos where usuario = 'solto@exemplo.com'")
ok(s == "ligada" and s2 == f"{OUTRA}|equipe", f"conta que já existia (sem academia) entra na equipe com a senha dela ({s2})")

# ---- uma conta, várias academias (20261003120000) ----
bom, s = sql(f"select public.pedir_para_administrar('{OUTRA}')", "authenticated", conta)
ok(not bom and "já administra essa academia" in s, "pedir a academia que já é sua: avisa")
bom, _ = sql(f"select public.pedir_para_administrar('{ACADEMIA}')", "authenticated", conta)
_, s = ultimo(f"select academia_id || '|' || pedido_academia_id from public.academia_acessos where user_id = '{dono_id}'")
ok(bom and s == f"{OUTRA}|{ACADEMIA}", f"quem já administra uma academia pede outra, sem perder a primeira ({s})")
_, codigo = ultimo(f"select public.gerar_codigo_do_pedido('{dono_id}')", "authenticated", admin)
bom, s = ultimo(f"select public.confirmar_meu_codigo('{codigo}')", "authenticated", conta)
_, s2 = ultimo(f"select academia_id || '|' || papel || '|' || (pedido_academia_id is null) from public.academia_acessos where user_id = '{dono_id}'")
ok(bom and s == "ok" and s2 == f"{ACADEMIA}|principal|true", f"código certo: a segunda academia entra e fica aberta no painel ({s2})")
_, s = ultimo("select count(*) from public.minhas_academias()", "authenticated", conta)
ok(s == "2", "a conta administra as duas academias")
_, s = sql("select nome || '|' || papel || '|' || aberta from public.academias_da_minha_conta()", "authenticated", conta)
ok(len(s.splitlines()) == 2 and f"|principal|true" in s and "Quadra Exemplo Moema|principal|false" in s, f"a lista \"Suas academias\" mostra as duas, com a aberta marcada ({s.splitlines()})")
bom, s = ultimo(f"update public.academias set instagram = '@moema2' where id = '{OUTRA}' returning instagram", "authenticated", conta)
ok(bom and s == "@moema2", "com a outra aberta, a conta continua editando a primeira")
_, s = ultimo(f"select (select count(*) from public.academia_vinculos where academia_id = '{ACADEMIA}') || '|' || (select count(*) from public.academia_vinculos)", "authenticated", conta)
ok(s.startswith("1|"), f"a conta só lê os próprios vínculos ({s})")
bom, s = sql(f"select public.abrir_minha_academia('{PENDENTE}')", "authenticated", conta)
ok(not bom and "não administra" in s, "não abre academia que não é sua")
bom, _ = sql(f"select public.abrir_minha_academia('{OUTRA}')", "authenticated", conta)
_, s = sql("select papel || ':' || email from public.pessoas_da_minha_academia()", "authenticated", conta)
ok(bom and "principal:dono.novo@exemplo.com" in s.splitlines() and "equipe:equipe1@exemplo.com" in s.splitlines(), "trocar a academia aberta: as pessoas são as dela")
sql(f"select public.abrir_minha_academia('{ACADEMIA}')", "authenticated", conta)
sql(f"update public.academias set plano = 'basico' where id = '{ACADEMIA}'")
bom, s = sql("select public.adicionar_pessoa('equipe1@exemplo.com', 'Pessoa Um', 'provisoria7')", "authenticated", conta)
ok(not bom and "até 1 pessoa." in s, "o limite de pessoas é do plano de cada academia")
sql(f"update public.academias set plano = 'completo' where id = '{ACADEMIA}'")
_, s = ultimo("select public.adicionar_pessoa('equipe1@exemplo.com', 'Pessoa Um', 'provisoria7')", "authenticated", conta)
_, s2 = ultimo("select academia_id || '|' || (select string_agg(v.papel, ',') from public.academia_vinculos v where v.user_id = x.user_id) from public.academia_acessos x where usuario = 'equipe1@exemplo.com'")
ok(s == "ligada" and s2 == f"{OUTRA}|equipe,equipe", f"pessoa de uma academia entra na equipe da outra, sem mudar a que ela tem aberta ({s2})")
_, e1 = ultimo("select user_id from public.academia_acessos where usuario = 'equipe1@exemplo.com'")
bom, _ = sql(f"select public.remover_pessoa('{e1}')", "authenticated", conta)
_, s = ultimo(f"select (select count(*) from auth.users where id = '{e1}') || '|' || (select count(*) from public.academia_vinculos where user_id = '{e1}')")
ok(bom and s == "1|1", f"tirar a pessoa de uma academia não apaga o login de quem tem outra ({s})")
_, s = ultimo(f"select count(*) from public.acessos_das_academias() where user_id = '{dono_id}'", "authenticated", admin)
ok(s == "2", "admin vê uma linha para cada academia da conta")
bom, _ = sql(f"select public.remover_acesso_academia('{dono_id}', '{ACADEMIA}')", "authenticated", admin)
_, s = ultimo(f"select academia_id || '|' || (select count(*) from public.academia_vinculos where user_id = '{dono_id}') from public.academia_acessos where user_id = '{dono_id}'")
ok(bom and s == f"{OUTRA}|1", f"admin tira a conta de uma academia: a outra continua e fica aberta ({s})")
_, temp = ultimo("insert into public.academias (name, status) values ('Exemplo Segunda', 'published') returning id")
sql(f"select public.pedir_para_administrar('{temp}')", "authenticated", conta)
sql(f"select public.aprovar_pedido_de_acesso('{dono_id}')", "authenticated", admin)
sql(f"delete from public.academias where id = '{temp}'", "authenticated", admin)
_, s = ultimo(f"select (select count(*) from auth.users where id = '{dono_id}') || '|' || academia_id from public.academia_acessos where user_id = '{dono_id}'")
ok(s == f"1|{OUTRA}", f"academia apagada não leva o login de quem administra outras ({s})")
sql(f"update public.academias set plano = 'basico' where id = '{ACADEMIA}'")

# Avaliação: nenhum contato de academia avalia.
def avaliar(contato):
    return sql(f"insert into public.avaliacoes (academia_id, stars, comment, nome_autor, contato_autor) values ('{ACADEMIA}', 4, 'Teste de conta visitante', 'Visitante', '{contato}')", "anon")


bom, s = avaliar("DONO.NOVO@exemplo.com")
ok(not bom and "academias não avaliam" in s, "visitante com o e-mail de uma conta de academia não avalia")
bom, s = avaliar("+55 (11) 98888-0001")
ok(not bom and "academias não avaliam" in s, "visitante com o WhatsApp de uma conta de academia não avalia")
bom, s = avaliar("(11) 00000-0003")
ok(not bom and "academias não avaliam" in s, "visitante com o WhatsApp de uma academia não avalia")
bom, s = sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{ACADEMIA}', 4, 'Teste de conta da equipe')", "authenticated", equipe)
ok(not bom and "não avaliam" in s, "pessoa da equipe logada não avalia outra academia")
bom, s = avaliar("11 96666-0001")
ok(bom, "visitante comum continua avaliando")
sql("delete from public.avaliacoes where comment like 'Teste de conta%'")

# Academia nova mandada por uma conta: publicar libera a conta junto.
conta_nova("nova.academia@exemplo.com", whats="11 97777-0003", nome="Dona Nova")
s, r = entrar("nova.academia@exemplo.com", "senhaforte1")
nova_conta = r.get("access_token", "")
bom, s = sql("insert into public.academias (name, status, nome_solicitante, contato_solicitante) values ('Exemplo Nova da Conta', 'pending', 'Dona Nova', '11977770003')", "authenticated", nova_conta)
_, s = ultimo("select pedido_nome || '|' || (pedido_academia_id is not null) from public.academia_acessos where usuario = 'nova.academia@exemplo.com'")
ok(bom and s == "Exemplo Nova da Conta|true", f"academia nova mandada pela conta vira o pedido dela ({s})")
_, nova_id = ultimo("select id from public.academias where name = 'Exemplo Nova da Conta'")
sql(f"update public.academias set status = 'published' where id = '{nova_id}'", "authenticated", admin)
_, s = ultimo("select (academia_id = pedido_academia_id or academia_id is not null) || '|' || papel from public.academia_acessos where usuario = 'nova.academia@exemplo.com'")
_, s2 = ultimo(f"select count(*) from public.academia_acessos where academia_id = '{nova_id}' and papel = 'principal'")
ok(s == "true|principal" and s2 == "1", "admin publica a academia nova e a conta passa a administrar")
sql(f"delete from public.academias where id = '{nova_id}'", "authenticated", admin)

# Quem recebeu usuário do GuiaTennis também entra pelo e-mail de contato.
_, uid_mapa = ultimo(f"select public.criar_acesso_academia('{ACADEMIA}', 'exemplo.mapa', 'provisoria5')", "authenticated", admin)
sql(f"update public.academia_acessos set email = 'contato@mapa-exemplo.com' where user_id = '{uid_mapa}'")
_, s = ultimo("select public.login_do_email('Contato@Mapa-Exemplo.com')", "anon")
ok(s == "exemplo.mapa@acesso.guiatennis.com.br", f"e-mail do responsável leva ao login dado pelo GuiaTennis ({s})")

# O que o visitante não chama.
for f in ["public.pedir_para_administrar('" + OUTRA + "')", "public.adicionar_pessoa('x@exemplo.com', 'X', 'provisoria7')",
          "public.pessoas_da_minha_academia()", "public.criar_login('x@exemplo.com', 'provisoria7')",
          "public.aprovar_pedido_de_acesso('" + dono_id + "')"]:
    bom, s = sql("select " + f, "anon")
    ok(not bom and "permission denied" in s, "visitante não chama " + f.split("(")[0])

# Freio contra robô: muitas contas novas na mesma hora.
recusou = False
for n in range(25):
    bom, s = conta_nova(f"robo{n}@exemplo.com", whats=f"11 9{n:04d}-0000", nome="Robo Teste")
    if not bom:
        recusou = "Muitos cadastros" in s
        break
ok(recusou, "muitas contas novas na mesma hora: pede para esperar")

sql("delete from public.academia_acessos where usuario like '%@exemplo.com' or usuario like 'exemplo.mapa%'")
sql("delete from auth.users where email like '%@exemplo.com'")
sql(f"update public.academias set plano = 'basico', instagram = null where id = '{OUTRA}'")

# ---- cadastro completo e código no WhatsApp da academia (20261001120000) ----
sql("delete from public.academia_acessos where usuario like '%@exemplo.com'")
sql("delete from auth.users where email like '%@exemplo.com'")
bom, s = sql("select public.criar_minha_conta('completo@exemplo.com', 'senhaforte1', 'Ana Completa', '11 97777-0101', true, 'Sra.', 'Gerente', true)", "anon")
_, s2 = ultimo("select tratamento || '|' || cargo || '|' || recebe_relatorio || '|' || nome_responsavel from public.academia_acessos where usuario = 'completo@exemplo.com'")
ok(bom and s2 == "Sra.|Gerente|true|Ana Completa", f"conta nova guarda tratamento, cargo e o aceite das novidades ({s2})")
bom, s = sql("select public.criar_minha_conta('antigo@exemplo.com', 'senhaforte1', 'Chamada Antiga', '11 97777-0102', true)", "anon")
ok(bom, "a chamada antiga (sem os campos novos) continua valendo")
bom, s = sql("select public.criar_minha_conta('errado@exemplo.com', 'senhaforte1', 'Tratamento Errado', '11 97777-0103', true, 'Dr.')", "anon")
ok(not bom and "tratamento" in s, "tratamento fora da lista é recusado")
s, r = entrar("completo@exemplo.com", "senhaforte1")
ana = r.get("access_token", "")
_, ana_id = ultimo("select user_id from public.academia_acessos where usuario = 'completo@exemplo.com'")
bom, s = ultimo("select public.confirmar_meu_codigo('123456')", "authenticated", ana)
ok(bom and s == "sem_codigo", "sem pedido nem código: diz que o código ainda não foi mandado")
sql(f"select public.pedir_para_administrar('{OUTRA}')", "authenticated", ana)
bom, s = sql(f"select public.gerar_codigo_do_pedido('{ana_id}')", "authenticated", ana)
ok(not bom and "Só o GuiaTennis" in s, "a conta não gera o próprio código")
bom, codigo = ultimo(f"select public.gerar_codigo_do_pedido('{ana_id}')", "authenticated", admin)
ok(bom and len(codigo) == 6 and codigo.isdigit(), "admin gera um código de 6 números para mandar ao WhatsApp da academia")
bom, s = sql("select codigo_hash from public.codigos_de_verificacao", "authenticated", ana)
ok(not bom and "permission denied" in s, "ninguém lê a tabela dos códigos, nem a própria conta")
_, s = ultimo(f"select codigo_em is not null from public.acessos_das_academias() where user_id = '{ana_id}'", "authenticated", admin)
ok(s == "t", "admin vê que o código já foi gerado")
errado = "000000" if codigo != "000000" else "111111"
bom, s = ultimo(f"select public.confirmar_meu_codigo('{errado}')", "authenticated", ana)
_, s2 = ultimo(f"select tentativas from public.codigos_de_verificacao where user_id = '{ana_id}'")
ok(bom and s == "errado" and s2 == "1", "código errado: avisa e a tentativa fica contada")
bom, s3 = ultimo(f"select public.confirmar_meu_codigo('{codigo[:3]} {codigo[3:]}')", "authenticated", ana)
_, s = ultimo(f"select academia_id || '|' || (pedido_academia_id is null) from public.academia_acessos where user_id = '{ana_id}'")
_, s2 = ultimo(f"select count(*) from public.codigos_de_verificacao where user_id = '{ana_id}'")
ok(bom and s3 == "ok" and s == f"{OUTRA}|true" and s2 == "0", f"código certo (até com espaço): a conta passa a administrar a academia ({s})")
# Muitas tentativas e código vencido.
conta_nova("tentativas@exemplo.com", whats="11 97777-0104", nome="Muitas Tentativas")
s, r = entrar("tentativas@exemplo.com", "senhaforte1")
tt = r.get("access_token", "")
_, tt_id = ultimo("select user_id from public.academia_acessos where usuario = 'tentativas@exemplo.com'")
sql(f"select public.pedir_para_administrar('{ACADEMIA}')", "authenticated", tt)
_, codigo = ultimo(f"select public.gerar_codigo_do_pedido('{tt_id}')", "authenticated", admin)
errado = "000000" if codigo != "000000" else "111111"
for _ in range(5):
    sql(f"select public.confirmar_meu_codigo('{errado}')", "authenticated", tt)
bom, s = ultimo(f"select public.confirmar_meu_codigo('{codigo}')", "authenticated", tt)
ok(bom and s == "tentativas", "depois de 5 tentativas, nem o código certo vale: pede outro")
_, codigo = ultimo(f"select public.gerar_codigo_do_pedido('{tt_id}')", "authenticated", admin)
sql(f"update public.codigos_de_verificacao set criado_em = now() - interval '73 hours' where user_id = '{tt_id}'")
bom, s = ultimo(f"select public.confirmar_meu_codigo('{codigo}')", "authenticated", tt)
ok(bom and s == "venceu", "código de mais de 72 horas vence")
sql("delete from public.academia_acessos where usuario like '%@exemplo.com'")
sql("delete from auth.users where email like '%@exemplo.com'")

print(f"\n{'Tudo certo.' if not falhas else str(falhas) + ' falha(s).'}")
sys.exit(1 if falhas else 0)
