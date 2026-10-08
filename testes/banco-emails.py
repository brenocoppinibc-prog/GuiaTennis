#!/usr/bin/env python3
"""Confere os avisos por e-mail e as buscas salvas num Postgres local
(SQL 20261005150000_buscas_salvas e 20261005160000_avisos_por_email) e as
consultas do painel do admin (20261006120000_painel_do_admin) e a declaração
de quem pede uma academia (20261006130000_declaracao_ao_pedir) e a academia
nova que vai ao ar sozinha (20261006140000_academia_nova_no_ar) e a exclusão de
conta pelo admin (20261006150000_excluir_conta), a conta de jogador que vira
Parceiros (20261006160000), a data em que a ficha foi atualizada
(20261007120000_ficha_atualizada_em), o código só em disputa
(20261007130000_codigo_so_em_disputa), o código da disputa pelo WhatsApp
(20261007140000_codigo_pelo_whatsapp), a logo nos e-mails
(20261007150000_logo_nos_emails) e os acessos em todo plano
(20261007160000_acessos_em_todo_plano), os guardados na conta
(20261008130000_guardados_na_conta) e as promoções (20261008140000_promocoes).

Não roda com os outros testes: precisa de um Postgres com a pasta
supabase/ aplicada (GUIATENNIS-CONTEXTO.md, seção 6, "Banco e login
locais" — aqui não precisa do GoTrue). O teste cria um cofre (vault), um
pg_net (net) e um relógio (cron) de mentira, que anotam o que o banco
pediu. Nunca aponte para o banco de verdade.

  BANCO_URL=postgresql://postgres@127.0.0.1:5433/postgres python3 testes/banco-emails.py

Cada consulta do site roda como o PostgREST: papel anon ou authenticated,
com os dados do login em request.jwt.claims.
"""
import json, os, subprocess, sys, uuid

BANCO = os.environ["BANCO_URL"]
if "supabase" in BANCO:
    sys.exit("Este teste é só para o Postgres local.")
ADMIN = "guiatennis1@gmail.com"
PINHEIROS = "00000000-0000-4000-8000-000000000001"   # aulas e locação, saibro
MOEMA = "00000000-0000-4000-8000-000000000002"       # locação, rápida
falhas = 0


def ok(cond, msg):
    global falhas
    if not cond:
        falhas += 1
    print(("OK    " if cond else "FALHA ") + msg)


def sql(texto, papel=None, user=None, email=None, amr=None):
    """Devolve (ok, saída). Com papel, roda como o site."""
    prefixo = ""
    if papel:
        c = {"role": papel}
        if user:
            c["sub"] = user
        if email:
            c["email"] = email
        if amr:
            c["amr"] = [{"method": amr}]
        prefixo = f"set local role {papel}; set local request.jwt.claims = '{json.dumps(c)}'; "
    r = subprocess.run(["psql", BANCO, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-1", "-c", prefixo + texto],
                       capture_output=True, text=True)
    saida = (r.stdout + r.stderr).strip()
    return r.returncode == 0, "\n".join(l for l in saida.splitlines() if l and not l.startswith("WARNING") and not l.startswith("NOTICE"))


def um(texto, **kw):
    certo, saida = sql(texto, **kw)
    if not certo:
        print("      erro: " + saida)
    return saida.splitlines()[-1] if certo and saida else ("" if certo else None)


def fila(where="true"):
    return um(f"select count(*) from public.emails_a_enviar where {where}")


# Cofre, pg_net e relógio de mentira ---------------------------------------
sql("""
create schema if not exists vault;
create table if not exists vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
create or replace view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
  returns uuid language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null)
  returns void language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
create schema if not exists net;
create table if not exists net.pedidos (id bigserial primary key, url text, body jsonb, headers jsonb);
create table if not exists net._http_response (id bigint primary key, status_code int, content text, error_msg text, timed_out boolean, created timestamptz default now());
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000)
  returns bigint language sql as $$ insert into net.pedidos (url, body, headers) values (url, body, headers) returning id $$;
""")
# O que uma rodada anterior deixou: contas, academias e avaliações do teste.
sql("delete from public.avaliacoes where contato_autor like '%@exemplo.com';"
    "delete from auth.users where email like '%@exemplo.com';"
    "delete from public.academias where id::text not like '00000000-0000-4000-8000-%';")
sql("delete from vault.secrets; truncate net.pedidos, net._http_response; truncate public.emails_a_enviar;"
    "update public.academias set publicada_em = coalesce(created_at, now()) - interval '60 days' where status = 'published';"
    "update public.emails_configuracao set site = 'https://guiatennis.com.br', prefixo = '';")


# Contas ---------------------------------------------------------------------
def login(email):
    uid = str(uuid.uuid4())
    sql(f"insert into auth.users (id, email, aud, role) values ('{uid}', '{email}', 'authenticated', 'authenticated')")
    return uid


def jogador(nome, email, confirmado=True, **colunas):
    uid = login(email)
    extra = "".join(f", {k}" for k in colunas)
    valores = "".join(f", {v}" for v in colunas.values())
    sql(f"insert into public.jogadores (user_id, nome, email, email_confirmado_em{extra}) values "
        f"('{uid}', '{nome}', '{email}', {'now()' if confirmado else 'null'}{valores})")
    return uid


def parceiro(nome, email, academia=None, papel="principal", confirmado=True):
    uid = login(email)
    sql(f"insert into public.academia_acessos (user_id, usuario, nome_responsavel, cargo, email, whatsapp, email_confirmado_em, academia_id, papel) values "
        f"('{uid}', '{email}', '{nome}', 'Dono(a)', '{email}', '11999990000', {'now()' if confirmado else 'null'}, "
        f"{repr(academia) if academia else 'null'}, '{papel}')")
    if academia:
        sql(f"insert into public.academia_vinculos (user_id, academia_id, papel) values ('{uid}', '{academia}', '{papel}') on conflict do nothing")
    return uid


sufixo = uuid.uuid4().hex[:6]
dono = parceiro("Ana Dona", f"ana{sufixo}@exemplo.com", PINHEIROS)
equipe_sem = parceiro("Beto Sem", f"beto{sufixo}@exemplo.com", PINHEIROS, "equipe", confirmado=False)
carla = jogador("Carla Jogadora", f"carla{sufixo}@exemplo.com")

# 1. Avaliação nova ----------------------------------------------------------
print("\n# Avaliação nova")
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{PINHEIROS}', 2, 'Quadra boa, mas <b>demorou</b> & atrasou')",
                   papel="authenticated", user=carla, email=f"carla{sufixo}@exemplo.com")
ok(certo, "jogadora avalia normalmente (o aviso não atrapalha)" + ("" if certo else ": " + saida))
ok(fila("tipo = 'avaliacao'") == "1", "um aviso de avaliação: só para quem confirmou o e-mail")
linha = um(f"select para || '|' || assunto from public.emails_a_enviar where tipo = 'avaliacao'")
ok(linha == f"ana{sufixo}@exemplo.com|Academia Exemplo Pinheiros recebeu uma avaliação nova (2 de 5)", "vai para a dona, com a nota no assunto: " + str(linha))
html = um("select html from public.emails_a_enviar where tipo = 'avaliacao'") or ""
ok("&lt;b&gt;demorou&lt;/b&gt; &amp; atrasou" in html and "<b>demorou" not in html, "comentário escapado no HTML")
ok("Pedir análise" in html, "nota baixa lembra o Pedir análise")
ok("/parceiros/painel?utm_source=Email-avaliacao" in html, "botão leva ao painel, com a etiqueta do e-mail")
ok("parar-avisos=" in html and "aviso=parceiros" in html, "rodapé com o link para parar os avisos")
ok(um("select texto like '%★★☆☆☆ (2 de 5)%' and texto not like '%&lt;%' from public.emails_a_enviar where tipo = 'avaliacao'") == "t",
   "versão em texto com as estrelas, sem HTML")

# Sem a fila, a avaliação continua entrando.
sql("alter table public.emails_a_enviar rename to emails_a_enviar_x")
outro = jogador("Davi Jogador", f"davi{sufixo}@exemplo.com")
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars) values ('{PINHEIROS}', 5)",
                   papel="authenticated", user=outro, email=f"davi{sufixo}@exemplo.com")
sql("alter table public.emails_a_enviar_x rename to emails_a_enviar")
ok(certo, "sem a fila, avaliar continua funcionando" + ("" if certo else ": " + saida))

# 2. Pedido de acesso -------------------------------------------------------
print("\n# Pedido de acesso")
novo = parceiro("Edu Novo", f"edu{sufixo}@exemplo.com")
certo, saida = sql(f"select public.pedir_para_administrar('{PINHEIROS}')", papel="authenticated", user=novo, email=f"edu{sufixo}@exemplo.com")
ok(certo, "pedido para academia com responsável" + ("" if certo else ": " + saida))
ok(um(f"select para from public.emails_a_enviar where tipo = 'pedido_responsavel'") == f"ana{sufixo}@exemplo.com", "o responsável recebe o pedido")
ok(um("select assunto from public.emails_a_enviar where tipo = 'pedido_responsavel'") == "Edu Novo pediu acesso à Academia Exemplo Pinheiros", "assunto com quem pediu")
ok("/parceiros/pessoas" in (um("select html from public.emails_a_enviar where tipo = 'pedido_responsavel'") or ""), "botão leva a Pessoas")
sql(f"select public.cancelar_meu_pedido('{PINHEIROS}')", papel="authenticated", user=novo)
sql(f"select public.pedir_para_administrar('{PINHEIROS}')", papel="authenticated", user=novo)
ok(fila("tipo = 'pedido_responsavel'") == "1", "cancelar e pedir de novo no mesmo dia não manda outro e-mail")

certo, saida = sql(f"select public.pedir_para_administrar('{MOEMA}')", papel="authenticated", user=novo)
ok(um(f"select para from public.emails_a_enviar where tipo = 'pedido_guiatennis'") == ADMIN, "academia sem responsável: o aviso vai para o GuiaTennis")
ok(um("select texto like '%WhatsApp 11999990000%' from public.emails_a_enviar where tipo = 'pedido_guiatennis'") == "t", "com o WhatsApp de quem pediu")

# 3. Pedido aceito ------------------------------------------------------------
print("\n# Pedido aceito")
sql(f"update public.academia_acessos set academia_id = '{PINHEIROS}' where user_id = '{dono}'")
certo, saida = sql(f"select public.responder_pedido_de_acesso('{novo}', true)", papel="authenticated", user=dono)
ok(certo, "responsável aceita" + ("" if certo else ": " + saida))
ok(um("select para || '|' || assunto from public.emails_a_enviar where tipo = 'pedido_aceito'") == f"edu{sufixo}@exemplo.com|Pronto: você já administra a Academia Exemplo Pinheiros",
   "quem pediu recebe o \"Pronto\"")
# Quem confirma pelo próprio código não recebe (já viu na tela).
codigo = um(f"select public.gerar_codigo_do_pedido('{novo}', '{MOEMA}')", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN)
ok(um(f"select public.confirmar_meu_codigo('{codigo}', '{MOEMA}')", papel="authenticated", user=novo) == "ok", "quem pediu digita o código")
ok(fila("tipo = 'pedido_aceito'") == "1", "quem digitou o código não recebe o \"Pronto\" (já viu na tela)")

# 4. Vou viajar ---------------------------------------------------------------
print("\n# Vou viajar")
fabi = jogador("Fabi Viajante", f"fabi{sufixo}@exemplo.com")
sql(f"update public.jogadores set avisos_viagem = true, viagem_uf = 'SP', viagem_cidade = 'São Paulo', viagem_ida = current_date + 20, viagem_volta = current_date + 23 where user_id = '{fabi}'",
    papel="authenticated", user=fabi)
ok(fila("tipo = 'viagem'") == "0", "viagem daqui a 20 dias: ainda não")
sql(f"update public.jogadores set viagem_ida = current_date + 5, viagem_volta = current_date + 8 where user_id = '{fabi}'", papel="authenticated", user=fabi)
ok(fila("tipo = 'viagem'") == "1", "viagem daqui a 5 dias: o aviso sai ao salvar")
assunto = um("select assunto from public.emails_a_enviar where tipo = 'viagem'")
ok(assunto == "Sua viagem para São Paulo: 3 academias de tênis para jogar", "assunto com quantas academias (sem a pausada nem a pendente): " + str(assunto))
html = um("select html from public.emails_a_enviar where tipo = 'viagem'") or ""
ok("/academia/academia-exemplo-pinheiros-" in html and "utm_source=Email-viagem" in html, "cada academia com link para a ficha")
ok("Pausada" not in html and "Pendente" not in html, "sem a academia pausada e sem a pendente")
ok("/quadras/sao-paulo?utm_source=Email-viagem" in html, "botão para a página da cidade")
ok(" a " in (um("select public.datas_da_viagem(current_date + 5, current_date + 8)") or ""), "datas por extenso")
sql(f"update public.jogadores set viagem_volta = current_date + 9 where user_id = '{fabi}'", papel="authenticated", user=fabi)
sql("select public.preparar_aviso_de_viagem(null)")
ok(fila("tipo = 'viagem'") == "1", "a mesma viagem não recebe de novo")
sql(f"update public.jogadores set viagem_cidade = 'Ubatuba', viagem_ida = null, viagem_volta = null where user_id = '{fabi}'", papel="authenticated", user=fabi)
ok(fila("tipo = 'viagem'") == "1", "cidade sem academia no guia: espera")
gabi = jogador("Gabi Sem Confirmar", f"gabi{sufixo}@exemplo.com", confirmado=False)
sql(f"update public.jogadores set avisos_viagem = true, viagem_uf = 'SP', viagem_cidade = 'São Paulo' where user_id = '{gabi}'", papel="authenticated", user=gabi)
ok(fila(f"para = 'gabi{sufixo}@exemplo.com'") == "0", "e-mail não confirmado não recebe")
sql(f"select public.confirmar_meu_email()", papel="authenticated", user=gabi, amr="otp")
ok(fila(f"para = 'gabi{sufixo}@exemplo.com' and tipo = 'viagem'") == "1", "ao confirmar o e-mail, a viagem sem data recebe na hora")

# 5. Buscas salvas ---------------------------------------------------------------
print("\n# Buscas salvas")
hugo = jogador("Hugo Buscador", f"hugo{sufixo}@exemplo.com")
busca = ("insert into public.buscas_salvas (user_id, termo, bairro, cidade, lat, lng, filtros, link, avisar) values "
         f"('{hugo}', 'Moema, São Paulo', 'Moema', 'São Paulo', -23.60123456, -46.66543210, "
         "'{\"piso\": [\"rapida\"], \"distancia\": 5}', '/busca?q=Moema,+S%C3%A3o+Paulo&piso=rapida&distancia=5', true) returning id")
id_busca = um(busca, papel="authenticated", user=hugo)
ok(bool(id_busca), "jogador salva a busca")
ok(um(f"select lat || ',' || lng from public.buscas_salvas where id = '{id_busca}'") == "-23.601,-46.665", "o ponto fica arredondado (~100 m)")
certo, _ = sql(busca, papel="authenticated", user=hugo)
ok(not certo, "a mesma busca não entra duas vezes")
certo, _ = sql(busca.replace("'/busca?q=Moema", "'https://golpe.com/?q=Moema"), papel="authenticated", user=hugo)
ok(not certo, "link que não é busca do site é recusado")
ok(um(f"select count(*) from public.buscas_salvas", papel="authenticated", user=carla) == "0", "outra conta não vê as buscas")
certo, _ = sql(busca.replace(f"('{hugo}'", f"('{carla}'"), papel="authenticated", user=hugo)
ok(not certo, "não salva busca em nome de outra conta")
certo, _ = sql(busca.replace(f"('{hugo}'", f"('{dono}'"), papel="authenticated", user=dono)
ok(not certo, "conta de academia não salva busca")
certo, _ = sql(f"update public.buscas_salvas set avisada_ate = now() where id = '{id_busca}'", papel="authenticated", user=hugo)
ok(not certo, "o site só muda o aviso da busca, mais nada")
for i in range(19):
    sql(busca.replace("distancia=5'", f"distancia=5&n={i}'"), papel="authenticated", user=hugo)
certo, saida = sql(busca.replace("distancia=5'", "distancia=5&n=x'"), papel="authenticated", user=hugo)
ok(not certo and "20 buscas" in saida, "até 20 buscas por conta")
sql(f"delete from public.buscas_salvas where user_id = '{hugo}' and id <> '{id_busca}'", papel="authenticated", user=hugo)
ok(um(f"select count(*) from public.buscas_salvas where user_id = '{hugo}'") == "1", "a própria conta apaga as buscas")

# 6. Academias novas -----------------------------------------------------------
print("\n# Academias novas")
iara = jogador("Iara Cidade", f"iara{sufixo}@exemplo.com", avisos_academias="true", cidade="'Sao Paulo'",
               avisos_mudados_em="now() - interval '2 days'")
sql("update public.buscas_salvas set avisar_desde = now() - interval '2 days' where id = '%s'" % id_busca)


def academia_nova(nome, lat, lng, pisos, cidade="São Paulo"):
    i = um(f"insert into public.academias (name, cidade, bairro, lat, lng, pisos, modalidades, cobertura, status) values "
           f"('{nome}', '{cidade}', 'Moema', {lat}, {lng}, '{json.dumps(pisos)}', '[\"locacao\"]', '[\"coberta\"]', 'pending') returning id",
           papel="authenticated", user=str(uuid.uuid4()), email=ADMIN)
    sql(f"update public.academias set status = 'published' where id = '{i}'", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN)
    return i


perto = academia_nova("Arena Nova <Moema>", -23.603, -46.664, ["rapida"])
ok(um(f"select publicada_em is not null from public.academias where id = '{perto}'") == "t", "publicar marca quando a academia entrou")
academia_nova("Saibro Novo Moema", -23.602, -46.666, ["saibro"])
academia_nova("Rápida Longe", -23.40, -46.40, ["rapida"], cidade="Guarulhos")
sql("select public.preparar_avisos_de_academias_novas()")
ok(fila(f"para = 'iara{sufixo}@exemplo.com' and tipo = 'academias_novas'") == "1", "cidade da conta (sem acento): recebe")
assunto = um(f"select assunto from public.emails_a_enviar where para = 'iara{sufixo}@exemplo.com' and tipo = 'academias_novas'")
ok(assunto == "2 academias novas no GuiaTennis", "as duas de São Paulo, não a de Guarulhos: " + str(assunto))
html = um(f"select html from public.emails_a_enviar where para = 'hugo{sufixo}@exemplo.com' and tipo = 'academias_novas'") or ""
ok("Arena Nova &lt;Moema&gt;" in html, "busca salva: a academia nova perto, com piso rápido (nome escapado)")
ok("Saibro Novo" not in html and "Longe" not in html, "busca salva: sem a de saibro e sem a de longe")
ok("Na sua busca" in html and "/busca?q=Moema" in html, "seção da busca com o link dela")
ok(um(f"select assunto from public.emails_a_enviar where para = 'hugo{sufixo}@exemplo.com' and tipo = 'academias_novas'") == "Academia nova no GuiaTennis: Arena Nova <Moema>",
   "uma só: o nome no assunto")
ok(fila(f"para = 'carla{sufixo}@exemplo.com' and tipo = 'academias_novas'") == "0", "sem o aviso ligado, nada")
# A página da cidade salva (sem ponto) vale a cidade inteira.
leo = jogador("Leo Cidade", f"leo{sufixo}@exemplo.com")
certo, saida = sql("insert into public.buscas_salvas (user_id, termo, cidade, link, avisar) values "
                   f"('{leo}', 'São Paulo', 'São Paulo', '/quadras/sao-paulo', true)", papel="authenticated", user=leo)
ok(certo, "a página da cidade se salva como busca" + ("" if certo else ": " + saida))
sql(f"update public.buscas_salvas set avisar_desde = now() - interval '2 days' where user_id = '{leo}'")
sql(f"update public.emails_a_enviar set chave = chave || ':antes' where tipo = 'academias_novas'")
sql(f"update public.jogadores set academias_avisadas_ate = null where user_id in ('{iara}')")
sql("select public.preparar_avisos_de_academias_novas()")
ok(um(f"select assunto from public.emails_a_enviar where para = 'leo{sufixo}@exemplo.com'") == "2 academias novas no GuiaTennis",
   "busca da cidade: as academias novas da cidade inteira")
ok("/quadras/sao-paulo?utm_source=Email-academias-novas" in (um(f"select html from public.emails_a_enviar where para = 'leo{sufixo}@exemplo.com'") or ""),
   "com o link da página da cidade")
sql(f"delete from public.emails_a_enviar where para in ('leo{sufixo}@exemplo.com', 'iara{sufixo}@exemplo.com') and chave not like '%:antes'")
sql("update public.emails_a_enviar set chave = replace(chave, ':antes', '') where tipo = 'academias_novas'")
sql("select public.preparar_avisos_de_academias_novas()")
ok(fila("tipo = 'academias_novas'") == "2", "rodar de novo não repete")
sql(f"update public.academias set publicada_em = now() - interval '1 hour' where id = '{perto}'")
sql("update public.emails_a_enviar set chave = chave || ':ontem' where tipo = 'academias_novas'")
sql("select public.preparar_avisos_de_academias_novas()")
ok(fila("tipo = 'academias_novas'") == "2", "academia já avisada não volta no dia seguinte")

# 7. Envio -----------------------------------------------------------------------
print("\n# Envio pelo Resend")
ok(um("select public.enviar_emails()") == "0", "sem a chave: nada sai, tudo fica na fila")
ok(um("select public.configurar_emails('re_teste_123', 'https://deploy-preview-5--exemplo.netlify.app/')") == "chave do Resend guardada", "o GitHub guarda a chave")
ok(um("select public.configurar_emails('re_teste_456', null)") == "chave do Resend guardada", "trocar a chave")
ok(um("select count(*) from vault.secrets where name = 'resend_api_key' and secret = 're_teste_456'") == "1", "uma chave só no cofre")
ok(um("select prefixo = '[Teste] ' from public.emails_configuracao") == "t", "banco de teste: assunto com [Teste]")
ok(um("select public.site_dos_emails()") == "https://deploy-preview-5--exemplo.netlify.app", "banco de teste: os links novos apontam para a prévia")
certo, _ = sql("select public.configurar_emails('x', null)", papel="authenticated", user=hugo)
ok(not certo, "o site não mexe na chave")
certo, _ = sql("select public.enviar_emails()", papel="anon")
ok(not certo, "o visitante não dispara o envio")
certo, _ = sql("select count(*) from public.emails_a_enviar", papel="authenticated", user=dono)
ok(not certo, "ninguém de fora lê a fila")
total = int(fila("enviado_em is null"))
ok(um("select public.enviar_emails()") == "2", "manda dois por vez")
pedido = um("select body::text || '|' || headers::text from net.pedidos order by id limit 1") or ""
corpo, cab = pedido.split("|", 1)
corpo, cab = json.loads(corpo), json.loads(cab)
ok(cab.get("Authorization") == "Bearer re_teste_456" and cab.get("Idempotency-Key", "").startswith("guiatennis-"), "chave e idempotência no cabeçalho")
ok(corpo["from"] == "GuiaTennis <nao-responda@guiatennis.com.br>" and corpo["subject"].startswith("[Teste] "), "remetente e assunto")
ok("List-Unsubscribe" in json.dumps(corpo.get("headers", {})), "cabeçalho para descadastrar")
ids = um("select string_agg(pedido_id::text, ',' order by pedido_id) from public.emails_a_enviar where pedido_id is not null").split(",")
sql(f"insert into net._http_response (id, status_code, content) values ({ids[0]}, 200, '{{\"id\":\"abc-123\"}}'), ({ids[1]}, 429, 'rate limit')")
ok(um("select public.enviar_emails()") == "2", "lê as respostas e manda os próximos")
ok(um("select resend_id from public.emails_a_enviar where enviado_em is not null") == "abc-123", "o que deu certo fica como enviado")
ok(um(f"select tentativas || ' ' || erro from public.emails_a_enviar where pedido_id is null and erro like '429%'") is not None, "429 volta para a fila")
ok(um("select tentativas from public.emails_a_enviar where erro like '429%'") == "1", "429 não conta como tentativa (só a nova)")
sql("update public.emails_a_enviar set pedido_id = null, tentativas = 5, erro = '422 e-mail inválido' where enviado_em is null and erro like '429%'")
ok(um("select count(*) from public.emails_a_enviar where tentativas >= 5 and enviado_em is null") == "1", "depois de 5 tentativas, desiste")

# 8. Parar os avisos pelo link ---------------------------------------------------
print("\n# Parar os avisos")
token = um(f"select token_avisos from public.jogadores where user_id = '{hugo}'")
ok(um(f"select public.parar_avisos('{token}', 'novas')", papel="anon") == "novas", "o link do e-mail para os avisos de academias novas, sem entrar")
ok(um(f"select count(*) from public.buscas_salvas where user_id = '{hugo}' and avisar") == "0", "as buscas salvas param de avisar (e continuam salvas)")
ok(um(f"select public.parar_avisos('{uuid.uuid4()}', 'novas')", papel="anon") == "", "link inventado não faz nada")
token = um(f"select token_avisos from public.jogadores where user_id = '{fabi}'")
ok(um(f"select public.parar_avisos('{token}', 'viagem')", papel="anon") == "viagem", "parar os avisos de viagem")
ok(um(f"select avisos_viagem from public.jogadores where user_id = '{fabi}'") == "f", "aviso de viagem desligado")
token = um(f"select token_avisos from public.academia_acessos where user_id = '{dono}'")
ok(um(f"select public.parar_avisos('{token}', 'parceiros')", papel="anon") == "parceiros", "a academia para os avisos pelo link")
antes = fila(f"tipo = 'avaliacao' and para = 'ana{sufixo}@exemplo.com'")
jota = jogador("Jota Jogador", f"jota{sufixo}@exemplo.com")
sql(f"insert into public.avaliacoes (academia_id, stars) values ('{PINHEIROS}', 4)", papel="authenticated", user=jota)
ok(fila(f"tipo = 'avaliacao' and para = 'ana{sufixo}@exemplo.com'") == antes, "quem parou não recebe mais")
ok(fila(f"tipo = 'avaliacao' and para = 'edu{sufixo}@exemplo.com'") == "1", "quem entrou na equipe e tem o e-mail confirmado recebe")
certo, _ = sql("select public.mudar_avisos_dos_parceiros(true)", papel="authenticated", user=dono)
ok(certo and um(f"select avisos_por_email from public.academia_acessos where user_id = '{dono}'") == "t", "no Perfil dos Parceiros, liga de novo")
certo, _ = sql("select public.mudar_avisos_dos_parceiros(true)", papel="authenticated", user=hugo)
ok(not certo, "jogador não mexe nos avisos dos Parceiros")

# 9. Situação para o admin -------------------------------------------------------
print("\n# Situação no painel do admin")
s = um("select public.situacao_dos_emails()::text", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN)
s = json.loads(s) if s else {}
ok(s.get("chave") is True and s.get("envio") is True and s.get("relogio") is False, "admin vê a chave, o envio e o relógio (desligado aqui)")
ok(s.get("enviados_7_dias") == 1 and s.get("falharam") == 1, "e quantos saíram e quantos falharam")
certo, _ = sql("select public.situacao_dos_emails()", papel="authenticated", user=hugo)
ok(not certo, "só o admin vê")

# 10. Conta do Parceiros também joga ---------------------------------------------
print("\n# Conta do GuiaTennis Parceiros no site dos jogadores")
certo, _ = sql(f"insert into public.avaliacoes (academia_id, stars) values ('{MOEMA}', 5)", papel="authenticated", user=dono)
ok(not certo, "antes de ativar a parte de jogador, não avalia")
ok(um("select nome || '|' || email || '|' || (email_confirmado_em is not null) from public.ativar_conta_de_jogador()", papel="authenticated", user=dono)
   == f"Ana Dona|ana{sufixo}@exemplo.com|true", "o site ativa a parte de jogador com o nome e o e-mail do Parceiros")
ok(um("select count(*) from public.ativar_conta_de_jogador()", papel="authenticated", user=dono) == "1"
   and um(f"select count(*) from public.jogadores where user_id = '{dono}'") == "1", "ativar de novo não duplica")
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{MOEMA}', 5, 'Ótima')", papel="authenticated", user=dono)
ok(certo, "avalia outra academia normalmente" + ("" if certo else ": " + saida))
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars) values ('{PINHEIROS}', 5)", papel="authenticated", user=dono)
ok(not certo and "administra essa academia" in saida, "não avalia a academia que administra")
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars, contato_autor) values ('{PINHEIROS}', 5, 'ana{sufixo}@exemplo.com')",
                   papel="authenticated", user=jogador("Kiko Jogador", f"kiko{sufixo}@exemplo.com"))
ok(not certo and "própria academia" in saida, "o contato de quem administra a academia também não avalia ela")
certo, _ = sql(busca.replace(f"('{hugo}'", f"('{dono}'"), papel="authenticated", user=dono)
ok(certo, "salva busca como qualquer jogador")
certo, _ = sql("select public.excluir_minha_conta_jogador()", papel="authenticated", user=dono)
ok(certo and um(f"select count(*) from public.jogadores where user_id = '{dono}'") == "0"
   and um(f"select count(*) from public.academia_acessos where user_id = '{dono}'") == "1"
   and um(f"select count(*) from auth.users where id = '{dono}'") == "1", "excluir a parte de jogador mantém o login e as academias")
ok(um(f"select count(*) from public.buscas_salvas where user_id = '{dono}'") == "0", "e apaga as buscas dela")

# 11. Painel do admin (SQL 20261006120000) --------------------------------------
print("\n# Painel do admin")
n = um("select public.numeros_das_contas_admin()", papel="authenticated", user="00000000-0000-4000-8000-0000000000ad", email=ADMIN)
n = json.loads(n) if n else {}
ok(n.get("jogadores") == int(um("select count(*) from public.jogadores")) and n.get("buscas_salvas") == int(um("select count(*) from public.buscas_salvas"))
   and n.get("contas_parceiros") == int(um("select count(*) from public.academia_acessos")), "admin: os números das contas batem com as tabelas — " + json.dumps(n))
certo, _ = sql("select public.numeros_das_contas_admin()", papel="authenticated", user=hugo)
ok(not certo, "os números das contas são só do admin")
ok(um("select count(*) from public.emails_recentes_admin(500)", papel="authenticated", user="00000000-0000-4000-8000-0000000000ad", email=ADMIN)
   == um("select count(*) from public.emails_a_enviar"), "admin vê os últimos e-mails da fila")
ok(um("select count(*) from public.emails_recentes_admin()", papel="authenticated", user=hugo) == "0", "quem não é admin não vê nenhum")
certo, _ = sql("select * from public.emails_recentes_admin()", papel="anon")
ok(not certo, "visitante nem chama")
falhou = um("select id from public.emails_a_enviar where enviado_em is null and erro is not null limit 1")
if falhou:
    certo, _ = sql(f"select public.reenviar_email_admin('{falhou}')", papel="authenticated", user=hugo)
    ok(not certo, "só o admin manda de novo")
    certo, _ = sql(f"select public.reenviar_email_admin('{falhou}')", papel="authenticated", user="00000000-0000-4000-8000-0000000000ad", email=ADMIN)
    ok(certo and um(f"select tentativas || '|' || coalesce(erro, '') from public.emails_a_enviar where id = '{falhou}'") == "0|", "admin: o e-mail que não saiu volta para a fila")
else:
    ok(False, "faltou um e-mail que não saiu para testar o reenviar")

# 12. Declaração ao pedir (SQL 20261006130000) -----------------------------------
print("\n# Declaração de quem pede uma academia")
decl = parceiro("Dora Declara", f"dora{sufixo}@exemplo.com")
certo, saida = sql(f"select public.pedir_para_administrar('{MOEMA}', false)", papel="authenticated", user=decl)
ok(not certo and "Marque a declaração" in saida, "sem marcar a declaração, o pedido não vai")
certo, saida = sql(f"select public.pedir_para_administrar('{MOEMA}', true)", papel="authenticated", user=decl)
ok(certo and um(f"select declarou_em is not null from public.pedidos_de_acesso where user_id = '{decl}' and academia_id = '{MOEMA}'") == "t",
   "com a declaração marcada, o banco guarda quando" + ("" if certo else ": " + saida))
certo, _ = sql(f"select public.pedir_para_administrar('{MOEMA}')", papel="authenticated", user=decl)
ok(certo and um(f"select declarou_em is not null from public.pedidos_de_acesso where user_id = '{decl}' and academia_id = '{MOEMA}'") == "t",
   "o site antigo (sem a caixinha) ainda pede, e a hora da declaração fica")
certo, saida = sql("insert into public.academias (name, cidade, bairro, status, source) values ('Quadra Dora', 'São Paulo', 'Lapa', 'pending', 'custom')", papel="authenticated", user=decl)
nova = um("select id from public.academias where name = 'Quadra Dora' order by created_at desc limit 1")
ok(certo and nova and um(f"select declarou_em is not null from public.pedidos_de_acesso where user_id = '{decl}' and academia_id = '{nova}'") == "t",
   "academia nova da conta: o pedido sai com a hora da declaração" + ("" if certo else ": " + saida))

# 13. Academia nova da conta vai ao ar sozinha (SQL 20261006140000) --------------
print("\n# Academia nova da conta vai ao ar sozinha")
eva = parceiro("Eva Nova", f"eva{sufixo}@exemplo.com")
sql(f"update public.academia_acessos set dados_completos_em = now() where user_id = '{eva}'")
nova_sql = "insert into public.academias (name, cidade, bairro, status, source) values ('{n}', 'São Paulo', 'Lapa', 'pending', 'custom')"
certo, saida = sql(nova_sql.format(n="Quadra Eva 1"), papel="authenticated", user=eva)
e1 = um("select id from public.academias where name = 'Quadra Eva 1'")
ok(certo and um(f"select status || '|' || confirmada || '|' || (revisar_desde is not null) || '|' || (publicada_em is not null) from public.academias where id = '{e1}'") == "published|true|true|true",
   "conta com e-mail confirmado: a academia nova vai ao ar na hora, confirmada e para o admin revisar" + ("" if certo else ": " + saida))
ok(um(f"select papel || '|' || (declarou_em is not null) from public.academia_vinculos where user_id = '{eva}' and academia_id = '{e1}'") == "principal|true"
   and um(f"select count(*) from public.pedidos_de_acesso where user_id = '{eva}'") == "0"
   and um(f"select academia_id from public.academia_acessos where user_id = '{eva}'") == e1,
   "a conta já administra a academia, como responsável, com a hora da declaração, sem pedido")
ok(um(f"select count(*) from public.emails_a_enviar where tipo = 'academia_no_ar' and chave = 'no-ar:{e1}' and assunto like 'Academia nova no ar: Quadra Eva 1'") == "1",
   "o admin recebe o e-mail \"Academia nova no ar\"")
admin_jwt = dict(papel="authenticated", user="00000000-0000-4000-8000-0000000000ad", email=ADMIN)
ok(um(f"select nome || '|' || quem || '|' || (declarou_em is not null) from public.academias_para_revisar_admin() where id = '{e1}'", **admin_jwt) == "Quadra Eva 1|Eva Nova|true",
   "o painel do admin lista a academia para revisar, com quem cadastrou")
ok(um("select count(*) from public.academias_para_revisar_admin()", papel="authenticated", user=eva) == "0", "quem não é admin não vê a lista")
certo, _ = sql(f"select public.marcar_academia_revisada('{e1}')", papel="authenticated", user=eva)
ok(not certo, "só o admin marca como revisada")
certo, _ = sql(f"select public.marcar_academia_revisada('{e1}')", **admin_jwt)
ok(certo and um(f"select revisar_desde is null from public.academias where id = '{e1}'") == "t", "admin marca como revisada e ela sai da lista")
certo, _ = sql(f"update public.academias set status = 'pending', revisar_desde = now() where id = '{e1}'", papel="authenticated", user=eva)
ok(um(f"select status || '|' || (revisar_desde is null) from public.academias where id = '{e1}'") == "published|true", "a academia continua sem mexer na situação nem na revisão da própria ficha")
for i in (2, 3):
    sql(nova_sql.format(n=f"Quadra Eva {i}"), papel="authenticated", user=eva)
certo, _ = sql(nova_sql.format(n="Quadra Eva 4"), papel="authenticated", user=eva)
e4 = um("select id from public.academias where name = 'Quadra Eva 4'")
# Sem o limite de 3 em 24 horas (SQL 20261007130000).
ok(certo and um(f"select status from public.academias where id = '{e4}'") == "published"
   and um(f"select count(*) from public.pedidos_de_acesso where user_id = '{eva}' and academia_id = '{e4}'") == "0",
   "a 4ª academia nova em 24 horas também vai ao ar (sem limite)")
semconf = parceiro("Ivo Sem Confirmar", f"ivo{sufixo}@exemplo.com", confirmado=False)
sql(f"update public.academia_acessos set dados_completos_em = now() where user_id = '{semconf}'")
sql(nova_sql.format(n="Quadra Ivo"), papel="authenticated", user=semconf)
ok(um("select status from public.academias where name = 'Quadra Ivo'") == "pending", "sem o e-mail confirmado, a academia nova espera o GuiaTennis")

# 14. O admin exclui a conta de quem descumprir os Termos (SQL 20261006150000) --
print("\n# Admin exclui conta")
zeca_email = f"zeca{sufixo}@exemplo.com"
zeca = jogador("Zeca Viola", zeca_email)
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{MOEMA}', 1, 'Ofensa')", papel="authenticated", user=zeca)
ok(certo, "o jogador avalia" + ("" if certo else ": " + saida))
certo, _ = sql(f"select public.excluir_conta_admin('{zeca}', 'Avaliação ofensiva', false)", papel="authenticated", user=hugo)
ok(not certo, "só o admin exclui conta")
certo, saida = sql(f"select public.excluir_conta_admin('{zeca}', 'x', false)", **admin_jwt)
ok(not certo and "motivo" in saida, "sem motivo, não exclui")
certo, saida = sql(f"select public.excluir_conta_admin('{zeca}', 'Avaliação ofensiva', false)", **admin_jwt)
ok(certo and um(f"select count(*) from auth.users where id = '{zeca}'") == "0" and um(f"select count(*) from public.jogadores where user_id = '{zeca}'") == "0",
   "admin exclui a conta do jogador" + ("" if certo else ": " + saida))
ok(um("select count(*) from public.avaliacoes where comment = 'Ofensa' and user_id is null") == "1", "sem marcar, a avaliação fica, com o nome e sem a ligação")
ok(um(f"select tipo || '|' || motivo from public.contas_excluidas_admin() where email = '{zeca_email}'", **admin_jwt) == "jogador|Avaliação ofensiva",
   "fica guardado o e-mail, o tipo e o motivo (só o admin vê)")
certo, saida = sql(f"select public.criar_conta_jogador('{zeca_email}', 'senha boa 123', 'Zeca de Novo', true)", papel="anon")
ok(not certo and "não pode criar conta" in saida, "o mesmo e-mail não cria outra conta" + ("" if not certo else ""))
certo, _ = sql(f"select public.liberar_email_admin('{zeca_email}')", **admin_jwt)
ok(certo and um(f"select count(*) from public.contas_excluidas where email = '{zeca_email}'") == "0", "admin libera o e-mail")
dono2 = parceiro("Rex Parceiro", f"rex{sufixo}@exemplo.com", academia=PINHEIROS)
sql(f"select public.ativar_conta_de_jogador()", papel="authenticated", user=dono2)
sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{MOEMA}', 1, 'Spam do Rex')", papel="authenticated", user=dono2)
certo, saida = sql(f"select public.excluir_conta_admin('{dono2}', 'Pediu academia que não representa', true)", **admin_jwt)
ok(certo and um("select count(*) from public.avaliacoes where comment = 'Spam do Rex'") == "0"
   and um(f"select count(*) from public.academia_acessos where user_id = '{dono2}'") == "0"
   and um(f"select status from public.academias where id = '{PINHEIROS}'") == "published",
   "conta do Parceiros: sai, com as avaliações (marcado), e a academia continua no guia" + ("" if certo else ": " + saida))
ok(um(f"select tipo from public.contas_excluidas where email = 'rex{sufixo}@exemplo.com'") == "jogador e GuiaTennis Parceiros", "o tipo diz que era jogador e Parceiros")

# 15. Conta de jogador vira conta do Parceiros (SQL 20261006160000) -------------
print("\n# Jogador vira Parceiros com o mesmo e-mail")
lia = jogador("Lia Jogadora", f"lia{sufixo}@exemplo.com")
certo, saida = sql("select public.ativar_conta_do_parceiros('Lia Jogadora', '11 98888-7777', false)", papel="authenticated", user=lia)
ok(not certo and "Termos" in saida, "sem o aceite dos Termos, não ativa")
certo, saida = sql("select public.ativar_conta_do_parceiros('Lia Jogadora', '11 98888-7777', true, 'Sra.', 'Dono(a)')", papel="authenticated", user=lia)
ok(certo and um(f"select usuario || '|' || email || '|' || whatsapp || '|' || (email_confirmado_em is not null) from public.academia_acessos where user_id = '{lia}'")
   == f"lia{sufixo}@exemplo.com|lia{sufixo}@exemplo.com|11988887777|true", "a conta de jogador passa a valer no Parceiros, com o e-mail confirmado" + ("" if certo else ": " + saida))
ok(um(f"select count(*) from public.jogadores where user_id = '{lia}'") == "1", "e continua jogadora")
certo, _ = sql("select public.ativar_conta_do_parceiros('Lia Jogadora', '11 98888-7777', true)", papel="authenticated", user=lia)
ok(certo and um(f"select count(*) from public.academia_acessos where user_id = '{lia}'") == "1", "ativar de novo não duplica")
certo, saida = sql("select public.ativar_conta_do_parceiros('Ninguém', '11 98888-7777', true)", papel="authenticated", user=str(uuid.uuid4()))
ok(not certo and "não é de jogador" in saida, "quem não tem conta de jogador não ativa")

# 16. "Atualizada há 4 dias" na ficha (SQL 20261007120000) ----------------------
print("\n# Quando a ficha foi atualizada")
velha = "2026-01-01 12:00:00+00"
def envelhecer(academia):
    sql(f"set local session_replication_role = replica; update public.academias set dados_atualizados_em = '{velha}' where id = '{academia}'")
def data_de(academia):
    return um(f"select dados_atualizados_em = '{velha}' from public.academias where id = '{academia}'")
envelhecer(MOEMA)
ok(um(f"select dados_atualizados_em is not null from public.academias where id = '{MOEMA}'", papel="anon") == "t", "o visitante lê a data")
sql(f"update public.academias set pausada = true, plano = 'completo', confirmada = true, lat = lat + 0.001 where id = '{MOEMA}'", **admin_jwt)
ok(data_de(MOEMA) == "t", "pausar, mudar o plano, o selo ou a coordenada não conta como atualizar")
sql(f"update public.academias set pausada = false, plano = 'basico' where id = '{MOEMA}'", **admin_jwt)
sql(f"update public.academias set price_locacao = '130-{sufixo}' where id = '{MOEMA}'", **admin_jwt)
ok(data_de(MOEMA) == "f", "mudar o preço atualiza a data")
envelhecer(MOEMA)
sql(f"update public.academias set price_locacao = '130-{sufixo}' where id = '{MOEMA}'", **admin_jwt)
ok(data_de(MOEMA) == "t", "o admin salvar sem mudar nada não atualiza")
dona3 = parceiro("Iris Dona", f"iris{sufixo}@exemplo.com", MOEMA)
certo, saida = sql(f"update public.academias set name = name where id = '{MOEMA}'", papel="authenticated", user=dona3)
ok(certo and data_de(MOEMA) == "f", "a academia salvar a ficha, mesmo sem mudar nada, confirma que está tudo certo" + ("" if certo else ": " + saida))
sql(f"update public.academias set dados_atualizados_em = '2020-01-01' where id = '{MOEMA}'", papel="authenticated", user=dona3)
ok(um(f"select dados_atualizados_em > now() - interval '1 minute' from public.academias where id = '{MOEMA}'") == "t", "a academia não escreve a data à mão")
envelhecer(MOEMA)
sql(f"update public.academias set dados_atualizados_em = now() where id = '{MOEMA}'", **admin_jwt)
ok(data_de(MOEMA) == "t", "nem o admin")
envelhecer(MOEMA)
certo, saida = sql(f"select public.pausar_minha_academia('{MOEMA}', true)", papel="authenticated", user=dona3)
ok(certo and data_de(MOEMA) == "t", "a academia pausar a ficha não conta como atualizar" + ("" if certo else ": " + saida))
sql(f"select public.pausar_minha_academia('{MOEMA}', false)", papel="authenticated", user=dona3)
certo, saida = sql("insert into public.academias (name, status) values ('Academia Recém Chegada', 'pending') returning dados_atualizados_em > now() - interval '1 minute'")
ok(certo and saida.splitlines()[-1] == "t", "academia nova entra com a data de hoje" + ("" if certo else ": " + saida))
sql("delete from public.academias where name = 'Academia Recém Chegada'")

# 17. O código só em disputa (SQL 20261007130000) --------------------------------
print("\n# Código só em disputa")
livre = um(f"insert into public.academias (name, cidade, bairro, phone, status, source, confirmada) values ('Quadra Livre {sufixo}', 'São Paulo', 'Lapa', '11977776666', 'published', 'custom', true) returning id")
envelhecer(livre)
fabio = parceiro("Fábio Primeiro", f"fabio{sufixo}@exemplo.com")
gil = parceiro("Gil Segundo", f"gil{sufixo}@exemplo.com")
sql(f"update public.academia_acessos set dados_completos_em = now() where user_id in ('{fabio}', '{gil}')")
certo, saida = sql(f"select public.pedir_para_administrar('{livre}', true)", papel="authenticated", user=fabio)
ok(certo and saida.splitlines()[-1] == "assumiu", "academia do guia sem responsável: a conta com e-mail confirmado assume na hora, sem código" + ("" if certo else ": " + saida))
ok(um(f"select papel || '|' || telefone_da_ficha || '|' || (declarou_em is not null) from public.academia_vinculos where user_id = '{fabio}' and academia_id = '{livre}'") == "principal|11977776666|true",
   "vira o responsável, com o WhatsApp que a ficha tinha e a hora da declaração")
ok(um(f"select (revisar_desde is not null) || '|' || (dados_atualizados_em = '{velha}') from public.academias where id = '{livre}'") == "true|true",
   "vai para o admin revisar, e a data da ficha não muda")
ok(um(f"select count(*) from public.emails_a_enviar where tipo = 'academia_assumida' and assunto = 'Academia assumida: Quadra Livre {sufixo}'") == "1", "o admin recebe o e-mail \"Academia assumida\"")
ok(um(f"select count(*) from public.academias_para_revisar_admin() where id = '{livre}'", **admin_jwt) == "1", "e a vê em Pendências")
certo, saida = sql(f"select public.pedir_para_administrar('{livre}', true)", papel="authenticated", user=gil)
ok(certo and saida.splitlines()[-1] == "pedido" and um(f"select destino from public.pedidos_de_acesso where user_id = '{gil}' and academia_id = '{livre}'") == "responsavel",
   "com responsável, o pedido vai para ele, como antes")
sql(f"update public.academias set phone = '11900001111' where id = '{livre}'", papel="authenticated", user=fabio)
certo, saida = sql(f"select public.contestar_academia('{livre}')", papel="authenticated", user=gil)
ok(certo and um(f"select destino from public.pedidos_de_acesso where user_id = '{gil}' and academia_id = '{livre}'") == "disputa", "quem pediu contesta: vira disputa" + ("" if certo else ": " + saida))
ok(um(f"select count(*) from public.emails_a_enviar where tipo = 'disputa' and assunto = 'Disputa: Quadra Livre {sufixo}'") == "1", "o admin recebe o e-mail da disputa")
ok(um(f"select count(*) from public.pedidos_para_minha_academia() where user_id = '{gil}'", papel="authenticated", user=fabio) == "0", "o responsável não vê a disputa")
certo, _ = sql(f"select public.responder_pedido_de_acesso('{gil}', false)", papel="authenticated", user=fabio)
ok(not certo and um(f"select count(*) from public.pedidos_de_acesso where user_id = '{gil}' and academia_id = '{livre}'") == "1", "nem recusa a disputa")
ok(um(f"select telefone_antes from public.pedidos_de_acesso_admin() where user_id = '{gil}' and academia_id = '{livre}'", **admin_jwt) == "11977776666",
   "o admin vê o WhatsApp que a ficha tinha antes (o número mudou depois)")
certo, saida = sql(f"select public.contestar_academia('{PINHEIROS}')", papel="authenticated", user=gil)
ok(not certo and "Peça para administrar" in saida, "sem pedido, não contesta")
codigo = um(f"select public.gerar_codigo_do_pedido('{gil}', '{livre}')", **admin_jwt)
ok(codigo and len(codigo) == 6, "na disputa, o admin gera o código mesmo com responsável")
certo, saida = sql(f"select public.confirmar_meu_codigo('{codigo}', '{livre}')", papel="authenticated", user=gil)
ok(certo and saida.splitlines()[-1] == "ok", "quem digita o código vence a disputa" + ("" if certo else ": " + saida))
ok(um(f"select string_agg(user_id::text || ':' || papel, ',') from public.academia_vinculos where academia_id = '{livre}'") == f"{gil}:principal",
   "e vira o responsável; quem administrava sai da academia")
ok(um(f"select count(*) from public.academia_acessos where user_id = '{fabio}'") == "1", "a conta de quem perdeu continua")
sql(f"select public.pedir_para_administrar('{livre}', true)", papel="authenticated", user=fabio)
sql(f"select public.contestar_academia('{livre}')", papel="authenticated", user=fabio)
certo, saida = sql(f"select public.aprovar_pedido_de_acesso('{fabio}', '{livre}')", **admin_jwt)
ok(certo and um(f"select string_agg(user_id::text || ':' || papel, ',') from public.academia_vinculos where academia_id = '{livre}'") == f"{fabio}:principal",
   "o admin também decide a disputa (por documento): quem pediu vira o responsável" + ("" if certo else ": " + saida))
# Sem o e-mail confirmado, o pedido espera; confirmou, vai em frente sozinho.
livre2 = um(f"insert into public.academias (name, cidade, bairro, phone, status, source) values ('Quadra Livre Dois {sufixo}', 'São Paulo', 'Lapa', '11966665555', 'published', 'custom') returning id")
jade = parceiro("Jade Espera", f"jade{sufixo}@exemplo.com", confirmado=False)
sql(f"update public.academia_acessos set dados_completos_em = now() where user_id = '{jade}'")
certo, saida = sql(f"select public.pedir_para_administrar('{livre2}', true)", papel="authenticated", user=jade)
ok(certo and saida.splitlines()[-1] == "pedido" and um(f"select destino from public.pedidos_de_acesso where user_id = '{jade}'") == "guiatennis",
   "sem o e-mail confirmado, vira pedido ao GuiaTennis")
sql(nova_sql.format(n=f"Quadra Jade {sufixo}"), papel="authenticated", user=jade)
certo, saida = sql("select public.confirmar_meu_email()", papel="authenticated", user=jade, amr="otp")
ok(certo and um(f"select papel from public.academia_vinculos where user_id = '{jade}' and academia_id = '{livre2}'") == "principal",
   "confirmou o e-mail: a academia do guia passa a ser dela" + ("" if certo else ": " + saida))
ok(um(f"select status from public.academias where name = 'Quadra Jade {sufixo}'") == "published"
   and um(f"select count(*) from public.academia_vinculos v join public.academias a on a.id = v.academia_id where v.user_id = '{jade}' and a.name = 'Quadra Jade {sufixo}'") == "1"
   and um(f"select count(*) from public.pedidos_de_acesso where user_id = '{jade}'") == "0",
   "e a academia nova dela vai ao ar, já administrada por ela")

# 18. O código da disputa sai sozinho pelo WhatsApp (SQL 20261007140000) -------
print("\n# Código da disputa pelo WhatsApp")
sql("truncate public.whatsapp_a_enviar; truncate net.pedidos;"
    "update public.whatsapp_configuracao set numero_id = null, real = false, numero_de_teste = null;")


def ultimo_whatsapp():
    linha = um("select url || '|' || body::text || '|' || headers::text from net.pedidos where url like '%graph.facebook.com%' order by id desc limit 1") or "||"
    url, corpo, cab = linha.split("|", 2)
    return url, json.loads(corpo or "{}"), json.loads(cab or "{}")


def codigo_de(corpo):
    return corpo["template"]["components"][0]["parameters"][0]["text"]


def contas_completas(*uids):
    sql(f"update public.academia_acessos set dados_completos_em = now() where user_id in ({', '.join(repr(u) for u in uids)})")


def resposta(texto, **kw):
    certo, saida = sql(texto, **kw)
    return saida.splitlines()[-1] if certo and saida else ("ERRO " + saida if not certo else "")


livre3 = um(f"insert into public.academias (name, cidade, bairro, phone, status, source, confirmada) values ('Quadra Zap {sufixo}', 'São Paulo', 'Lapa', '(11) 95555-4444', 'published', 'custom', true) returning id")
kaio = parceiro("Kaio Dono", f"kaio{sufixo}@exemplo.com")
luna = parceiro("Luna Contesta", f"luna{sufixo}@exemplo.com")
contas_completas(kaio, luna)
sql(f"select public.pedir_para_administrar('{livre3}', true)", papel="authenticated", user=kaio)
sql(f"update public.academias set phone = '11911112222' where id = '{livre3}'", papel="authenticated", user=kaio)
sql(f"select public.pedir_para_administrar('{livre3}', true)", papel="authenticated", user=luna)
saida = resposta(f"select public.contestar_academia('{livre3}')", papel="authenticated", user=luna)
ok(saida == "desligado", "sem o WhatsApp ligado, contestar continua como antes: " + saida)
ok(um(f"select position('mande o código' in texto) > 0 from public.emails_a_enviar where tipo = 'disputa' and texto like 'Luna Contesta%'") == "t",
   "e o e-mail da disputa pede ao admin para mandar o código")
ok(um(f"select public.mandar_codigo_admin('{luna}', '{livre3}')", **admin_jwt) == "desligado", "o admin também ouve \"desligado\" (o painel gera o código como antes)")
ok(um("select public.configurar_whatsapp('', '', null, false)") == "sem WhatsApp: o código da disputa continua pelo admin", "sem os segredos, o GitHub só avisa")
ok("não manda nada" in (um("select public.configurar_whatsapp('tok_teste', '1234567890', null, false)") or ""),
   "banco de teste sem o número de teste: guarda o token e avisa")
ok(resposta(f"select public.pedir_codigo_da_disputa('{livre3}')", papel="authenticated", user=luna) == "desligado",
   "e não manda para o WhatsApp das fichas de teste")
ok(um("select public.configurar_whatsapp('tok_teste', '123 456', '(11) 98888-7777', false)") == "token do WhatsApp guardado", "com o número de teste, liga")
ok(um("select count(*) from vault.secrets where name = 'whatsapp_token' and secret = 'tok_teste'") == "1", "o token fica no cofre, uma vez só")
saida = resposta(f"select public.pedir_codigo_da_disputa('{livre3}')", papel="authenticated", user=luna)
ok(saida == "mandado", "\"Mandar outro código\": sai na hora: " + saida)
url, corpo, cab = ultimo_whatsapp()
ok(url == "https://graph.facebook.com/v23.0/123456/messages" and cab.get("Authorization") == "Bearer tok_teste", "pela API oficial da Meta, com o token")
ok(corpo.get("to") == "5511988887777", "no banco de teste, vai só para o número de teste")
ok(corpo.get("template", {}).get("name") == "codigo_guiatennis" and corpo["template"]["language"]["code"] == "pt_BR", "no modelo de autenticação do GuiaTennis")
cod = codigo_de(corpo)
ok(len(cod) == 6 and cod.isdigit() and corpo["template"]["components"][1]["parameters"][0]["text"] == cod, "código de 6 números, também no botão \"Copiar código\"")
ok(um(f"select count(*) from public.codigos_de_verificacao where user_id = '{luna}' and academia_id = '{livre3}' and codigo_hash <> '{cod}'") == "1", "o banco guarda o código só cifrado")
ok(resposta(f"select public.pedir_codigo_da_disputa('{livre3}')", papel="authenticated", user=luna) == "espere", "outro código só depois de uma hora")
for _ in range(2):
    sql(f"update public.whatsapp_a_enviar set criado_em = criado_em - interval '2 hours' where user_id = '{luna}'")
    sql(f"select public.pedir_codigo_da_disputa('{livre3}')", papel="authenticated", user=luna)
sql(f"update public.whatsapp_a_enviar set criado_em = criado_em - interval '2 hours' where user_id = '{luna}'")
ok(resposta(f"select public.pedir_codigo_da_disputa('{livre3}')", papel="authenticated", user=luna) == "limite", "até 3 códigos em 3 dias")
sql("select public.enviar_whatsapps()")
ok(um("select count(*) from public.whatsapp_a_enviar where corpo is not null and criado_em < now() - interval '2 hours'") == "0",
   "código com mais de 2 horas não sai mais (e some da fila)")
ok(um(f"select public.mandar_codigo_admin('{luna}', '{livre3}')", **admin_jwt) == "mandado", "o admin manda mesmo depois do limite")
# A resposta da Meta, para três mensagens novas do admin.
for _ in range(2):
    sql(f"select public.mandar_codigo_admin('{luna}', '{livre3}')", **admin_jwt)
ids = (um("select string_agg(pedido_id::text, ',' order by pedido_id) from (select pedido_id from public.whatsapp_a_enviar where pedido_id is not null order by pedido_id desc limit 3) x") or "").split(",")
sql(f"insert into net._http_response (id, status_code, content) values ({ids[0]}, 200, '{{\"messages\":[{{\"id\":\"wamid.ABC\"}}]}}'), "
    f"({ids[1]}, 400, '{{\"error\":{{\"message\":\"Template name does not exist in the translation\",\"code\":132001}}}}'), ({ids[2]}, 503, 'fora do ar')")
sql("select public.enviar_whatsapps()")
ok(um("select mensagem_id || '|' || (corpo is null) from public.whatsapp_a_enviar where enviado_em is not null") == "wamid.ABC|true", "o que saiu fica como enviado, sem o código guardado")
ok(um("select (corpo is null) || '|' || erro from public.whatsapp_a_enviar where erro like '400%'") == "true|400 Template name does not exist in the translation",
   "erro da Meta (modelo errado): não tenta de novo e mostra o motivo")
ok(um("select (corpo is not null) || '|' || tentativas from public.whatsapp_a_enviar where erro like '503%'") == "true|2", "fora do ar: tenta de novo")
ok(um(f"select whatsapp_origem || '|' || (whatsapp_em is not null) from public.pedidos_de_acesso_admin() where user_id = '{luna}' and academia_id = '{livre3}'", **admin_jwt) == "admin|true",
   "o admin vê a última mensagem do pedido")
sit = json.loads(um("select public.situacao_do_whatsapp()::text", **admin_jwt) or "{}")
ok(sit.get("ligado") is True and sit.get("real") is False and sit.get("enviados_30_dias") == 1 and sit.get("ultimo_erro"), "situação do WhatsApp para o admin")
certo, _ = sql("select public.situacao_do_whatsapp()", papel="authenticated", user=luna)
ok(not certo, "só o admin vê a situação")
certo, _ = sql(f"select public.pedir_codigo_da_disputa('{livre3}')", papel="anon")
ok(not certo, "o visitante não pede código")
certo, _ = sql("select count(*) from public.whatsapp_a_enviar", papel="authenticated", user=luna)
ok(not certo, "ninguém de fora lê a fila do WhatsApp")
certo, _ = sql("select public.configurar_whatsapp('x', '1', null, true)", papel="authenticated", user=luna)
ok(not certo, "o site não mexe no token")
certo, _ = sql("select public.enviar_whatsapps()", papel="authenticated", user=luna)
ok(not certo, "nem dispara o envio")
certo, _ = sql(f"select public.mandar_codigo_admin('{luna}', '{livre3}')", papel="authenticated", user=luna)
ok(not certo, "só o admin usa o \"mandar o código\" do admin")
# Banco de verdade: vai para o WhatsApp que a ficha tinha quando o responsável
# assumiu (o número mudou depois).
sql("select public.configurar_whatsapp('tok_real', '123456', null, true)")
sql(f"select public.mandar_codigo_admin('{luna}', '{livre3}')", **admin_jwt)
ok(ultimo_whatsapp()[1].get("to") == "5511955554444", "no banco de verdade, vai para o WhatsApp de antes da academia")
# Quem contesta com o e-mail confirmado recebe o código na hora; digitou, vence.
mel = parceiro("Mel Na Hora", f"mel{sufixo}@exemplo.com")
contas_completas(mel)
sql(f"select public.pedir_para_administrar('{livre3}', true)", papel="authenticated", user=mel)
saida = resposta(f"select public.contestar_academia('{livre3}')", papel="authenticated", user=mel)
ok(saida == "mandado", "contestar manda o código na hora: " + saida)
ok(um(f"select position('saiu sozinho' in texto) > 0 from public.emails_a_enviar where tipo = 'disputa' and texto like 'Mel Na Hora%'") == "t",
   "o e-mail ao admin diz que o código já saiu")
cod_mel = codigo_de(ultimo_whatsapp()[1])
ok(um(f"select codigo_em is not null from public.meus_pedidos_de_acesso() where academia_id = '{livre3}'", papel="authenticated", user=mel) == "t",
   "o cartão de quem pediu sabe que o código saiu")
saida = resposta(f"select public.confirmar_meu_codigo('{cod_mel}', '{livre3}')", papel="authenticated", user=mel)
ok(saida == "ok" and um(f"select string_agg(user_id::text || ':' || papel, ',') from public.academia_vinculos where academia_id = '{livre3}'") == f"{mel}:principal",
   "quem digita o código do WhatsApp vence a disputa: " + saida)
# Sem o e-mail confirmado: espera; confirmou, o código sai sozinho.
nina = parceiro("Nina Depois", f"nina{sufixo}@exemplo.com", confirmado=False)
contas_completas(nina)
sql(f"select public.pedir_para_administrar('{livre3}', true)", papel="authenticated", user=nina)
ok(resposta(f"select public.contestar_academia('{livre3}')", papel="authenticated", user=nina) == "confirme_email", "sem o e-mail confirmado, o código espera")
sql("select public.confirmar_meu_email()", papel="authenticated", user=nina, amr="otp")
ok(um(f"select origem from public.whatsapp_a_enviar where user_id = '{nina}'") == "conta", "confirmou o e-mail: o código sai sozinho")
# Ficha sem WhatsApp.
sem_zap = um(f"insert into public.academias (name, cidade, bairro, status, source) values ('Quadra Sem Zap {sufixo}', 'São Paulo', 'Lapa', 'published', 'custom') returning id")
otto = parceiro("Otto Dono", f"otto{sufixo}@exemplo.com")
paula = parceiro("Paula Contesta", f"paula{sufixo}@exemplo.com")
contas_completas(otto, paula)
sql(f"select public.pedir_para_administrar('{sem_zap}', true)", papel="authenticated", user=otto)
sql(f"select public.pedir_para_administrar('{sem_zap}', true)", papel="authenticated", user=paula)
ok(resposta(f"select public.contestar_academia('{sem_zap}')", papel="authenticated", user=paula) == "sem_whatsapp", "ficha sem WhatsApp: avisa (o admin pede documento)")
ok(um("select public.numero_do_whatsapp('+55 (11) 98765-4321') || '|' || coalesce(public.numero_do_whatsapp('98765-4321'), 'nada')") == "5511987654321|nada",
   "número com ou sem 55 vira 55 + DDD; sem DDD, nada")
sql("delete from vault.secrets where name = 'whatsapp_token'; update public.whatsapp_configuracao set numero_id = null, real = false, numero_de_teste = null;")

# 19. A logo nos e-mails (SQL 20261007150000) -----------------------------------
print("\n# Logo nos e-mails")
html_logo = um("select html from public.emails_a_enviar where tipo = 'avaliacao' order by criado_em limit 1") or ""
ok('/email-logo.png"' in html_logo and ">GuiaTennis</td>" in html_logo, "todo aviso tem a logo no alto, ao lado do nome")
ok(um("select public.email_montado('t', '', null, null, '')").count(um("select public.site_dos_emails()") + '/email-logo.png') == 1,
   "o ícone do e-mail (com os riscos fortes) vem do site dos e-mails: a prévia no teste, o site de verdade no real")

# 20. Os acessos da ficha em todo plano (SQL 20261007160000) ---------------------
print("\n# Acessos em todo plano")
sql(f"delete from public.cliques where academia_id = '{PINHEIROS}';"
    f"insert into public.cliques (academia_id, tipo, created_at) values ('{PINHEIROS}', 'visualizacao', now()), ('{PINHEIROS}', 'visualizacao', now() - interval '3 days'),"
    f"('{PINHEIROS}', 'visualizacao', now() - interval '29 days'), ('{PINHEIROS}', 'visualizacao', now() - interval '40 days'), ('{PINHEIROS}', 'whatsapp', now());"
    f"update public.academias set plano = 'basico' where id = '{PINHEIROS}';")
plano_antes = "completo"  # o do seed.sql; volta no fim
num = json.loads(um("select public.numeros_da_academia(30)::text", papel="authenticated", user=dono) or "{}")
ok(num.get("trancado") is True and num.get("acessos") == 3 and num.get("dias") == 30, "Básico vê os acessos dos últimos 30 dias — " + json.dumps(num))
ok("contatos" not in num and "origens" not in num and "visitas" not in num, "e só isso: quem chamou e de onde vieram continuam no Premium")
sql(f"update public.academias set plano = 'premium' where id = '{PINHEIROS}'")
num = json.loads(um("select public.numeros_da_academia(30)::text", papel="authenticated", user=dono) or "{}")
ok(num.get("visitas") == 3 and num.get("contatos") == 1 and not num.get("trancado"), "Premium continua vendo tudo, com os mesmos acessos")
sql(f"update public.academias set plano = '{plano_antes}' where id = '{PINHEIROS}'; delete from public.cliques where academia_id = '{PINHEIROS}';")

# 21. O que a pessoa guarda fica na conta (SQL 20261008130000) -------------------
print("\n# Guardados na conta")
gui = jogador("Gui Guarda", f"gui{sufixo}@exemplo.com")
certo, saida = sql(f"select public.guardar_na_conta('favoritas', '[\"{PINHEIROS}\"]'::jsonb)", papel="authenticated", user=gui)
ok(certo and um(f"select guardados->'favoritas'->>0 from public.jogadores where user_id = '{gui}'") == PINHEIROS, "a favorita vai para a conta" + ("" if certo else ": " + saida))
sql("""select public.guardar_na_conta('preferencias', '{"uf": "SP", "cidade": "São Paulo"}'::jsonb)""", papel="authenticated", user=gui)
ok(um(f"select (guardados->'favoritas'->>0) || '|' || (guardados->'preferencias'->>'cidade') from public.jogadores where user_id = '{gui}'") == f"{PINHEIROS}|São Paulo",
   "guardar uma lista não apaga as outras")
ok(um(f"select guardados->'preferencias'->>'cidade' from public.jogadores where user_id = '{gui}'", papel="authenticated", user=gui) == "São Paulo", "a conta lê o que guardou")
certo, saida = sql("select public.guardar_na_conta('senha', '[]'::jsonb)", papel="authenticated", user=gui)
ok(not certo and "Não sei guardar" in saida, "só as listas conhecidas")
certo, saida = sql("""select public.guardar_na_conta('favoritas', '{"a": 1}'::jsonb)""", papel="authenticated", user=gui)
ok(not certo and "Formato" in saida, "cada lista no formato dela")
certo, saida = sql(f"select public.guardar_na_conta('chamadas', (select jsonb_agg(repeat('x', 100)) from generate_series(1, 300)))", papel="authenticated", user=gui)
ok(not certo and "Grande demais" in saida, "nada grande demais")
certo, _ = sql("select public.guardar_na_conta('favoritas', '[]'::jsonb)", papel="anon")
ok(not certo, "o visitante não guarda nada no banco")
certo, saida = sql(f"select public.guardar_na_conta('favoritas', '[]'::jsonb)", papel="authenticated", user=hugo)
ok(um(f"select guardados->'favoritas'->>0 from public.jogadores where user_id = '{gui}'") == PINHEIROS, "cada um guarda só na própria conta")
certo, _ = sql(f"update public.jogadores set guardados = '{{}}'::jsonb where user_id = '{gui}'", papel="authenticated", user=gui)
ok(not certo or um(f"select guardados->'favoritas'->>0 from public.jogadores where user_id = '{gui}'") == PINHEIROS, "a coluna não se troca direto, só pela função")

# Excluir a conta apaga as buscas.
sql(f"delete from auth.users where id = '{hugo}'")
ok(um(f"select count(*) from public.buscas_salvas where user_id = '{hugo}'") == "0", "excluir a conta apaga as buscas salvas")

# 22. Promoções das academias Premium (SQL 20261008140000) -----------------------
print("\n# Promoções")
sql(f"delete from public.promocoes where academia_id in ('{PINHEIROS}', '{MOEMA}'); delete from public.emails_a_enviar where tipo = 'promocao';"
    f"update public.academias set plano = 'completo' where id = '{PINHEIROS}';")
ate = um("select (public.hoje_em_brasilia() + 10)::text")
salvar = lambda titulo, user=dono, academia=PINHEIROS, pid="null", detalhes="Na primeira aula, sem custo.", validade=None: sql(
    f"select public.salvar_promocao('{academia}', {pid}, '{titulo}', '{detalhes}', '{validade or ate}')::text", papel="authenticated", user=user)
certo, saida = salvar("Primeira aula grátis")
ok(not certo and "plano Premium" in saida, "fora do Premium, não cria promoção")
sql(f"update public.academias set plano = 'premium' where id = '{PINHEIROS}'")
fa = jogador("Fabi Fã", f"fabi{sufixo}@exemplo.com", promocoes="true")
sem_promo = jogador("Gil Sem Promo", f"gil{sufixo}@exemplo.com")
nao_conf = jogador("Ivo Não Confirmou", f"ivo{sufixo}@exemplo.com", confirmado=False, promocoes="true")
outra_fav = jogador("Juli Outra", f"juli{sufixo}@exemplo.com", promocoes="true")
for uid, fav in ((fa, PINHEIROS), (sem_promo, PINHEIROS), (nao_conf, PINHEIROS), (outra_fav, MOEMA)):
    sql(f"select public.guardar_na_conta('favoritas', '[\"{fav}\"]'::jsonb)", papel="authenticated", user=uid)
# Quem administra a academia e também favoritou não recebe.
sql(f"insert into public.jogadores (user_id, nome, email, email_confirmado_em, promocoes, guardados) values "
    f"('{dono}', 'Ana Dona', 'ana{sufixo}@exemplo.com', now(), true, jsonb_build_object('favoritas', jsonb_build_array('{PINHEIROS}'))) on conflict (user_id) do update set promocoes = true, guardados = excluded.guardados")
certo, saida = salvar("Primeira aula grátis")
r = json.loads(saida.splitlines()[-1]) if certo else {}
ok(certo and r.get("aviso") == "enviado" and r.get("avisados") == 1, "Premium cria a promoção e avisa quem favoritou e quer promoções — " + saida)
ok(um("select string_agg(para, ',') from public.emails_a_enviar where tipo = 'promocao'") == f"fabi{sufixo}@exemplo.com",
   "só quem favoritou, ligou promoções e confirmou o e-mail; nunca quem administra a academia")
html = um("select html from public.emails_a_enviar where tipo = 'promocao'") or ""
ok(um("select assunto from public.emails_a_enviar where tipo = 'promocao'") == "Promoção na Academia Exemplo Pinheiros: Primeira aula grátis"
   and "Primeira aula grátis" in html and "Válida até" in html and "utm_source=Email-promocao" in html and "aviso=promocoes" in html,
   "o e-mail traz a promoção, a validade, o link da ficha e o link para parar")
pid = r.get("id")
ok(um(f"select count(*) from public.promocoes where id = '{pid}'", papel="anon") == "1", "o visitante vê a promoção valendo")
ok(um(f"select count(*) from public.promocoes", papel="anon") == "1", "e só as valendo, de academia Premium no ar")
certo, _ = sql(f"select avisados from public.promocoes", papel="anon")
ok(not certo, "o visitante não vê quantas pessoas foram avisadas")
certo, saida = salvar("Aula dupla com desconto")
r2 = json.loads(saida.splitlines()[-1]) if certo else {}
ok(certo and r2.get("aviso") == "semana" and fila("tipo = 'promocao'") == "1", "a segunda promoção da semana aparece na ficha, sem novo e-mail")
salvar("Terceira")
certo, saida = salvar("Quarta")
ok(not certo and "3 promoções" in saida, "até 3 promoções valendo")
certo, saida = salvar("Primeira aula grátis (mudou)", pid=f"'{pid}'")
ok(certo and um(f"select titulo from public.promocoes where id = '{pid}'") == "Primeira aula grátis (mudou)" and fila("tipo = 'promocao'") == "1",
   "mudar a promoção não manda e-mail de novo")
velha = um(f"insert into public.promocoes (academia_id, titulo, valida_ate) values ('{PINHEIROS}', 'Velha', public.hoje_em_brasilia() - 5) returning id")
certo, saida = salvar("Velha de volta", pid=f"'{velha}'")
ok(not certo and "3 promoções" in saida, "trazer de volta uma vencida também respeita as 3 valendo")
sql(f"delete from public.promocoes where id = '{velha}'")
certo, saida = salvar("Longa demais", validade=um("select (public.hoje_em_brasilia() + 91)::text"))
ok(not certo and "90 dias" in saida, "vale no máximo 90 dias")
certo, saida = salvar("x", pid=f"'{pid}'")
ok(not certo and "60 letras" in saida, "título curto demais é recusado")
certo, saida = salvar("De outra academia", user=carla)
ok(not certo and "não administra" in saida, "quem não administra a academia não cria promoção")
lista = um(f"select count(*) || '|' || sum(avisados) from public.promocoes_da_minha_academia('{PINHEIROS}')", papel="authenticated", user=dono)
ok(lista == "3|1", "a academia vê as suas promoções e quantos o e-mail avisou — " + str(lista))
ok(um(f"select count(*) from public.promocoes_da_minha_academia('{PINHEIROS}')", papel="authenticated", user=carla) == "0", "outra conta não vê as promoções da academia")
sql(f"update public.promocoes set valida_ate = public.hoje_em_brasilia() - 1 where id = '{pid}'")
ok(um(f"select count(*) from public.promocoes where id = '{pid}'", papel="anon") == "0", "promoção vencida sai do site")
ok(um(f"select valendo::text from public.promocoes_da_minha_academia('{PINHEIROS}') where id = '{pid}'", papel="authenticated", user=dono) == "false",
   "e continua na lista da academia, como encerrada")
sql(f"update public.academias set plano = 'completo' where id = '{PINHEIROS}'")
ok(um("select count(*) from public.promocoes", papel="anon") == "0", "academia que sai do Premium: as promoções somem do site")
sql(f"update public.academias set plano = 'premium' where id = '{PINHEIROS}'")
certo, _ = sql(f"select public.apagar_promocao('{pid}')", papel="authenticated", user=carla)
ok(not certo, "outra conta não apaga a promoção")
certo, saida = sql(f"select public.apagar_promocao('{pid}')", papel="authenticated", user=dono)
ok(certo and um(f"select count(*) from public.promocoes where id = '{pid}'") == "0", "a academia encerra a promoção")
token = um(f"select token_avisos from public.jogadores where user_id = '{fa}'")
ok(um(f"select public.parar_avisos('{token}', 'promocoes')", papel="anon") == "promocoes"
   and um(f"select promocoes::text || avisos_academias::text from public.jogadores where user_id = '{fa}'") == "falsefalse",
   "o link do e-mail desliga só as promoções")
sql(f"delete from public.promocoes where academia_id = '{PINHEIROS}'; update public.academias set plano = '{plano_antes}' where id = '{PINHEIROS}';")

print(f"\n{'Tudo certo' if not falhas else str(falhas) + ' falha(s)'}")
sys.exit(1 if falhas else 0)
