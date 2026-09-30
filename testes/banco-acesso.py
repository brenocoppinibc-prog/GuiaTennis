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
ok(not bom and "row-level security" in s, "academia não avalia a si mesma")
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

print(f"\n{'Tudo certo.' if not falhas else str(falhas) + ' falha(s).'}")
sys.exit(1 if falhas else 0)
