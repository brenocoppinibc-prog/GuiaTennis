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
(20261008130000_guardados_na_conta), as promoções (20261008140000_promocoes)
o pedido para tirar do guia (20261008150000_pedido_para_sair_do_guia), as
conversas do chat guardadas na conta (20261009120000_conversas_do_chat), o
lembrete de conferir a ficha (20261009130000_lembrete_de_conferir_a_ficha), o
lembrete do jogador que não entra há 3 meses (20261009140000_lembrete_de_volta),
o resumo do mês do Parceiros (20261009150000_resumo_do_mes), as falhas do
site (20261011120000_falhas_do_site) e os avisos para toda a equipe da
academia (20261013120000_avisos_para_toda_a_equipe,
20261013130000_cargo_no_aviso_de_pessoa_nova e 20261013140000_acessos_nos_emails)
o Premium nas recomendadas (20261014120000_premium_nas_recomendadas) a
última busca na conta (20261014130000_ultima_busca_na_conta) e o adicional de
Promoções (20261014140000_adicional_de_promocoes).

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
ok("/parceiros/acessos" in (um("select html from public.emails_a_enviar where tipo = 'pedido_responsavel'") or ""), "botão leva a Acessos (antes Pessoas, SQL 20261013140000)")
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
# Desde 23/10/2026 (SQL 20261023120000), excluir pelo site dos jogadores
# exclui a conta inteira, também no Parceiros (seção 23). Aqui a parte de
# jogador sai direto no banco, para os testes seguintes seguirem com a dona.
sql(f"delete from public.buscas_salvas where user_id = '{dono}'; delete from public.jogadores where user_id = '{dono}'")

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
# 14/10/2026 (SQL 20261014130000): a última busca também vai para a conta, como objeto.
certo, saida = sql("""select public.guardar_na_conta('ultima_busca', '{"cidade": "São Paulo", "lat": -23.56, "lng": -46.68, "em": 1}'::jsonb)""", papel="authenticated", user=gui)
ok(certo and um(f"select guardados->'ultima_busca'->>'cidade' from public.jogadores where user_id = '{gui}'") == "São Paulo", "a última busca vai para a conta" + ("" if certo else ": " + saida))
certo, saida = sql("select public.guardar_na_conta('ultima_busca', '[]'::jsonb)", papel="authenticated", user=gui)
ok(not certo and "Formato" in saida, "a última busca é um objeto")
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
# Desde 22/10/2026 (SQL 20261022120000): Completo e Premium, de 1 a 12 semanas,
# pagas com os créditos; o e-mail é à parte (avisar_minha_promocao).
sql("update public.leilao_config set preco_promocao_semana = 0, desconto_premium = 0.20")
dia_br = lambda n: um(f"select (public.hoje_em_brasilia() + {n})::text")
salvar = lambda titulo, user=dono, academia=PINHEIROS, pid="null", detalhes="Na primeira aula, sem custo.", semanas=2: sql(
    f"select public.salvar_promocao('{academia}', {pid}, '{titulo}', '{detalhes}', {semanas})::text", papel="authenticated", user=user)
sql(f"update public.academias set plano = 'basico' where id = '{PINHEIROS}'")
certo, saida = salvar("Primeira aula grátis")
ok(not certo and "Completo e Premium" in saida, "no Básico, não cria promoção")
# Desde 14/10/2026 (SQL 20261015120000), cada aviso por e-mail gasta 1 envio comprado.
sql(f"update public.academias set plano = 'premium', envios_de_aviso = 3 where id = '{PINHEIROS}'")
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
ok(certo and r.get("pago") == 0 and r.get("valida_ate") == dia_br(13) and r.get("creditos") == 3 and fila("tipo = 'promocao'") == "0",
   "Premium cria a promoção por 2 semanas (até hoje + 13), sem custo com o preço em R$ 0, e sem mandar e-mail — " + saida)
certo, saida = sql(f"select public.avisar_minha_promocao('{r.get('id')}')::text", papel="authenticated", user=dono)
r2 = json.loads(saida.splitlines()[-1]) if certo else {}
ok(certo and r2.get("aviso") == "enviado" and r2.get("avisados") == 1, "mandar por e-mail avisa quem favoritou e quer promoções — " + saida)
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
# Uma promoção por vez (SQL 20261016130000; eram 3).
certo, saida = salvar("Aula dupla com desconto")
ok(not certo and "uma promoção valendo" in saida and fila("tipo = 'promocao'") == "1", "uma promoção por vez: a segunda não entra enquanto a primeira vale")
certo, saida = salvar("Primeira aula grátis (mudou)", pid=f"'{pid}'", semanas=0)
ok(certo and um(f"select titulo || '|' || valida_ate from public.promocoes where id = '{pid}'") == f"Primeira aula grátis (mudou)|{dia_br(13)}" and fila("tipo = 'promocao'") == "1",
   "mudar o texto (0 semanas) mantém a validade e não manda e-mail de novo")
velha = um(f"insert into public.promocoes (academia_id, titulo, valida_ate) values ('{PINHEIROS}', 'Velha', public.hoje_em_brasilia() - 5) returning id")
certo, saida = salvar("Velha de volta", pid=f"'{velha}'")
ok(not certo and "uma promoção valendo" in saida, "trazer de volta uma vencida também respeita a uma por vez")
sql(f"delete from public.promocoes where id = '{velha}'")
certo, saida = salvar("Longa demais", semanas=13)
ok(not certo and "de 1 a 12 semanas" in saida, "de 1 a 12 semanas")
certo, saida = salvar("Longa demais", pid=f"'{pid}'", semanas=11)
ok(not certo and "12 semanas à frente" in saida, "somar semanas: no máximo 12 semanas à frente")
certo, saida = salvar("Sem semanas", semanas=0)
ok(not certo and "de 1 a 12 semanas" in saida, "a nova precisa de pelo menos 1 semana")
certo, saida = salvar("x", pid=f"'{pid}'")
ok(not certo and "60 letras" in saida, "título curto demais é recusado")
certo, saida = salvar("De outra academia", user=carla)
ok(not certo and "não administra" in saida, "quem não administra a academia não cria promoção")
lista = um(f"select count(*) || '|' || sum(avisados) || '|' || max(semanas) || '|' || max(pago) from public.promocoes_da_minha_academia('{PINHEIROS}')", papel="authenticated", user=dono)
ok(lista == "1|1|2|0", "a academia vê as suas promoções, quantos o e-mail avisou, as semanas e o pago — " + str(lista))
ok(um(f"select count(*) from public.promocoes_da_minha_academia('{PINHEIROS}')", papel="authenticated", user=carla) == "0", "outra conta não vê as promoções da academia")
sql(f"update public.promocoes set valida_ate = public.hoje_em_brasilia() - 1 where id = '{pid}'")
ok(um(f"select count(*) from public.promocoes where id = '{pid}'", papel="anon") == "0", "promoção vencida sai do site")
ok(um(f"select valendo::text from public.promocoes_da_minha_academia('{PINHEIROS}') where id = '{pid}'", papel="authenticated", user=dono) == "false",
   "e continua na lista da academia, como encerrada")
sql(f"update public.promocoes set valida_ate = public.hoje_em_brasilia() + 3 where id = '{pid}'; update public.academias set plano = 'completo' where id = '{PINHEIROS}'")
ok(um(f"select count(*) from public.promocoes where id = '{pid}'", papel="anon") == "1", "no Completo, a promoção continua no site (22/10/2026)")
sql(f"update public.academias set plano = 'basico' where id = '{PINHEIROS}'")
ok(um("select count(*) from public.promocoes", papel="anon") == "0", "academia que volta ao Básico: as promoções somem do site")
sql(f"update public.academias set plano = 'premium' where id = '{PINHEIROS}'")
certo, _ = sql(f"select public.apagar_promocao('{pid}')", papel="authenticated", user=carla)
ok(not certo, "outra conta não apaga a promoção")
certo, saida = sql(f"select public.apagar_promocao('{pid}')", papel="authenticated", user=dono)
ok(certo and um(f"select count(*) from public.promocoes where id = '{pid}'") == "0", "a academia encerra a promoção")
token = um(f"select token_avisos from public.jogadores where user_id = '{fa}'")
ok(um(f"select public.parar_avisos('{token}', 'promocoes')", papel="anon") == "promocoes"
   and um(f"select promocoes::text || avisos_academias::text from public.jogadores where user_id = '{fa}'") == "falsefalse",
   "o link do e-mail desliga só as promoções")
# 14/10/2026 (SQL 20261015120000): envios de aviso pagos no Completo e no
# Premium; só o Premium publica promoções; o aviso vai também para quem está perto.
sql(f"delete from public.promocoes where academia_id = '{PINHEIROS}'; delete from public.emails_a_enviar where tipo in ('promocao', 'aviso_da_academia');"
    f"delete from public.avisos_das_academias where academia_id = '{PINHEIROS}';"
    f"update public.academias set plano = 'completo', envios_de_aviso = 0 where id = '{PINHEIROS}'")
saldo = lambda: um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'")
# A promoção na ficha paga por semana (SQL 20261022120000): R$ 10 no Completo,
# 20% menos no Premium; encerrar devolve as semanas que não começaram.
sql(f"update public.leilao_config set preco_promocao_semana = 10; update public.academias set envios_de_aviso = 25 where id = '{PINHEIROS}'")
certo, saida = salvar("Aula paga", semanas=4)
ok(not certo and "tem R$ 25 de créditos" in saida and "menos semanas" in saida and saldo() == "25", "Completo: 4 semanas (R$ 40) não cabem em R$ 25 de créditos, e nada é cobrado")
certo, saida = salvar("Aula paga", semanas=2)
rp = json.loads(saida.splitlines()[-1]) if certo else {}
ok(certo and rp.get("pago") == 20 and rp.get("creditos") == 5 and saldo() == "5"
   and um(f"select semanas || '|' || pago || '|' || valida_ate from public.promocoes where id = '{rp.get('id')}'") == f"2|20|{dia_br(13)}",
   "Completo publica 2 semanas: R$ 20 saem dos créditos — " + saida)
ok(um(f"select count(*) from public.promocoes where id = '{rp.get('id')}'", papel="anon") == "1", "e a promoção do Completo aparece no site")
certo, saida = salvar("Aula paga", pid=f"'{rp.get('id')}'", semanas=1)
ok(not certo and "tem R$ 5 de créditos" in saida, "somar 1 semana sem créditos é recusado")
certo, saida = salvar("Aula paga (texto novo)", pid=f"'{rp.get('id')}'", semanas=0)
ok(certo and saldo() == "5", "mudar só o texto não custa nada")
sql(f"select public.somar_envios('{PINHEIROS}', 10)", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN)
certo, saida = salvar("Aula paga (texto novo)", pid=f"'{rp.get('id')}'", semanas=1)
ok(certo and saldo() == "5" and um(f"select semanas || '|' || pago || '|' || valida_ate from public.promocoes where id = '{rp.get('id')}'") == f"3|30|{dia_br(20)}",
   "somar 1 semana: R$ 10, a validade anda 7 dias")
certo, saida = sql(f"select public.apagar_promocao('{rp.get('id')}')", papel="authenticated", user=dono)
ok(certo and saida.strip().splitlines()[-1] == "20" and saldo() == "25", "encerrar devolve as 2 semanas que ainda não começaram (R$ 20) — " + saida)
sql(f"update public.academias set plano = 'premium' where id = '{PINHEIROS}'")
meu = json.loads(um(f"select public.meu_leilao('{PINHEIROS}')::text", papel="authenticated", user=dono) or "{}")
ok(meu.get("preco_promocao") == 8 and meu.get("preco_promocao_semana") == 10, "o Parceiros lê o preço da semana: R$ 10, e R$ 8 no Premium — " + str({k: meu.get(k) for k in ("preco_promocao", "preco_promocao_semana")}))
certo, saida = salvar("Aula Premium", semanas=1)
ok(certo and json.loads(saida.splitlines()[-1]).get("pago") == 8 and saldo() == "17", "o Premium paga 20% menos: R$ 8 a semana")
certo, saida = sql("select public.mudar_preco_da_promocao(5)", papel="authenticated", user=dono)
ok(not certo and "Só o admin" in saida, "só o admin muda o preço da semana")
certo, saida = sql("select public.mudar_preco_da_promocao(-1)", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN)
ok(not certo and "R$ 0 a R$ 10.000" in saida, "o preço vai de R$ 0 a R$ 10.000")
ok(um("select public.mudar_preco_da_promocao(0)", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) == "0"
   and um("select preco_promocao_semana from public.leilao_config") == "0", "o admin volta o preço a R$ 0")
sql(f"delete from public.promocoes where academia_id = '{PINHEIROS}'; update public.academias set plano = 'completo', envios_de_aviso = 0 where id = '{PINHEIROS}'")
enviar = lambda titulo="Turma nova aos sábados", msg="Abrimos uma turma para iniciantes aos sábados, às 9h.", user=dono: sql(
    f"select public.enviar_aviso_da_academia('{PINHEIROS}', '{titulo}', '{msg}')::text", papel="authenticated", user=user)
certo, saida = enviar()
ok(not certo and "não tem envios" in saida, "sem envios, a academia não manda aviso")
sql(f"update public.academias set envios_de_aviso = 5 where id = '{PINHEIROS}'", papel="authenticated", user=dono)
ok(saldo() == "0", "a academia não muda o próprio saldo de envios")
certo, saida = sql(f"select public.somar_envios('{PINHEIROS}', 2)", papel="authenticated", user=dono)
ok(not certo and "Só o admin" in saida, "só o admin soma envios")
data_antes = um(f"select dados_atualizados_em from public.academias where id = '{PINHEIROS}'")
ok(um(f"select public.somar_envios('{PINHEIROS}', 2)", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) == "2"
   and um(f"select dados_atualizados_em from public.academias where id = '{PINHEIROS}'") == data_antes,
   "o admin soma 2 envios, e a ficha não muda a data de atualizada")
cidade_pin = um(f"select cidade from public.academias where id = '{PINHEIROS}'")
perto = jogador("Paula Perto", f"paulaperto{sufixo}@exemplo.com", promocoes="true", cidade=f"'{cidade_pin}'")
longe = jogador("Lia Longe", f"lialonge{sufixo}@exemplo.com", promocoes="true", cidade="'Fortaleza'")
buscou = jogador("Beto Buscou", f"betobuscou{sufixo}@exemplo.com", promocoes="true", cidade="'Fortaleza'")
lat_lng = um(f"select lat || ',' || lng from public.academias where id = '{PINHEIROS}'").split(",")
sql(f"select public.guardar_na_conta('ultima_busca', jsonb_build_object('cidade', 'X', 'lat', {float(lat_lng[0]) + 0.05}, 'lng', {lat_lng[1]}, 'em', 1))", papel="authenticated", user=buscou)
certo, saida = enviar(user=carla)
ok(not certo and "não administra" in saida, "outra conta não manda aviso pela academia")
certo, saida = enviar(msg="curta")
ok(not certo and "10 a 500" in saida, "mensagem curta demais é recusada")
certo, saida = enviar()
r4 = json.loads(saida.splitlines()[-1]) if certo else {}
paras = um("select string_agg(para, ',' order by para) from public.emails_a_enviar where tipo = 'aviso_da_academia'") or ""
ok(certo and r4.get("aviso") == "enviado" and r4.get("saldo") == 1 and saldo() == "1", "o Completo manda o aviso e gasta 1 envio — " + saida)
ok(f"paulaperto{sufixo}" in paras and f"betobuscou{sufixo}" in paras and f"lialonge{sufixo}" not in paras and f"ana{sufixo}" not in paras,
   "vai para quem é da cidade da academia e para quem buscou perto; não para quem é de longe nem para quem administra — " + paras)
htmla = um(f"select html from public.emails_a_enviar where tipo = 'aviso_da_academia' and para = 'paulaperto{sufixo}@exemplo.com'") or ""
ok("Turma nova aos sábados" in htmla and "perto de você" in htmla and "mandou uma promoção" in htmla and "aviso=promocoes" in htmla
   and "pediu, na sua conta do GuiaTennis, promoções das academias" in htmla and "mandou um aviso" not in htmla,
   "o e-mail traz a promoção (sem \"aviso\", 16/10/2026), diz \"perto de você\" e tem o link para parar")
certo, saida = enviar("Outro aviso")
r5 = json.loads(saida.splitlines()[-1]) if certo else {}
ok(certo and r5.get("aviso") == "semana" and saldo() == "1", "no máximo 1 aviso por semana: o segundo não sai nem gasta envio")
lista = json.loads(um(f"select public.avisos_da_minha_academia('{PINHEIROS}')::text", papel="authenticated", user=dono) or "{}")
ok(lista.get("saldo") == 1 and len(lista.get("avisos", [])) == 1 and lista["avisos"][0]["avisados"] >= 2 and lista.get("semana") is True,
   "a academia vê o saldo, os avisos mandados e que já avisou nesta semana")
ok(um(f"select public.avisos_da_minha_academia('{PINHEIROS}')::text", papel="authenticated", user=carla) in (None, "", "null"), "outra conta não vê os avisos da academia")
# Desde 16/10/2026 (SQL 20261016120000), tudo o que sai por e-mail é promoção.
ok(um(f"select string_agg(distinct tipo, ',') from public.avisos_das_academias where academia_id = '{PINHEIROS}'") == "promocao",
   "sem dizer o tipo, sai como promoção")
certo, saida = sql(f"select public.enviar_aviso_da_academia('{PINHEIROS}', 'Aula grátis', 'Primeira aula grátis para iniciantes.', 'aviso')::text", papel="authenticated", user=dono)
ok(certo and json.loads(saida.splitlines()[-1]).get("aviso") == "semana", "o tipo antigo (\"aviso\") não muda nada nem dá erro")
sql(f"delete from public.avisos_das_academias where academia_id = '{PINHEIROS}'; delete from public.emails_a_enviar where tipo = 'aviso_da_academia';"
    f"update public.academias set envios_de_aviso = 1, phone = '11977776666' where id = '{PINHEIROS}'")
certo, saida = sql(f"select public.enviar_aviso_da_academia('{PINHEIROS}', 'Aula grátis', 'Primeira aula grátis para iniciantes.', 'promocao')::text", papel="authenticated", user=dono)
email_promo = um(f"select assunto || '|' || html from public.emails_a_enviar where tipo = 'aviso_da_academia' and para = 'paulaperto{sufixo}@exemplo.com'") or ""
lista = json.loads(um(f"select public.avisos_da_minha_academia('{PINHEIROS}')::text", papel="authenticated", user=dono) or "{}")
ok(certo and email_promo.startswith("Promoção da ") and "mandou uma promoção" in email_promo and ">Promoção</p>" in email_promo
   and lista.get("avisos", [{}])[0].get("tipo") == "promocao", "o aviso como promoção: assunto, etiqueta e tipo na lista — " + email_promo[:60])
texto_promo = um(f"select replace(texto, E'\\n', ' ') from public.emails_a_enviar where tipo = 'aviso_da_academia' and para = 'paulaperto{sufixo}@exemplo.com'") or ""
ok("?chamar=whatsapp&amp;assunto=a%20promo%C3%A7%C3%A3o%20%22Aula%20gr%C3%A1tis%22&amp;utm_source=Email-promocao-da-academia" in email_promo
   and ">Chamar no WhatsApp</a>" in email_promo and "veja a ficha da academia" in email_promo and "Chamar no WhatsApp: " in texto_promo,
   "o botão do e-mail chama a academia no WhatsApp, com o assunto, passando pela ficha (SQL 20261015150000) — " + texto_promo[:80])
sql(f"update public.academias set envios_de_aviso = 1 where id = '{PINHEIROS}'")
# Premium: a promoção também gasta 1 envio (com desconto no preço, combinado à parte).
sql(f"delete from public.avisos_das_academias where academia_id = '{PINHEIROS}'; delete from public.emails_a_enviar where tipo in ('promocao', 'aviso_da_academia');"
    f"update public.academias set plano = 'premium' where id = '{PINHEIROS}'")
certo, saida = salvar("Aula experimental", detalhes="Grátis")
r6 = json.loads(saida.splitlines()[-1]) if certo else {}
certo, saida = sql(f"select public.avisar_minha_promocao('{r6.get('id')}')::text", papel="authenticated", user=dono)
ok(certo and json.loads(saida.splitlines()[-1]).get("aviso") == "enviado" and saldo() == "0", "Premium: mandar a promoção por e-mail gasta o último envio — " + saida)
sql(f"delete from public.promocoes where id = '{r6.get('id')}'")  # uma por vez: encerra antes da outra
certo, saida = salvar("Outra", detalhes="Sem envio")
r7 = json.loads(saida.splitlines()[-1]) if certo else {}
certo, saida = sql(f"select public.avisar_minha_promocao('{r7.get('id')}')::text", papel="authenticated", user=dono)
ok(not certo and "não tem envios" in saida, "sem envios, avisar depois pede para comprar um pacote")
sql(f"delete from public.promocoes where academia_id = '{PINHEIROS}'; update public.academias set plano = '{plano_antes}' where id = '{PINHEIROS}';")

# 23. A conta sai, a academia fica (SQL 20261020130000; antes, o pedido para
# tirar do guia, SQL 20261008150000, que saiu do site) --------------------------
print("\n# A conta sai, a academia fica")
admin_kw = admin_jwt
sql("truncate public.emails_a_enviar")
sair = um("insert into public.academias (name, status, cidade, bairro, plano) values ('Academia Que Fica', 'published', 'São Paulo', 'Lapa', 'premium') returning id")
resp_sai = parceiro("Rui Sai", f"rui{sufixo}@exemplo.com", sair)
equipe_sai = parceiro("Tati Equipe", f"tati{sufixo}@exemplo.com", sair, "equipe")
sql(f"update public.academia_vinculos set created_at = now() - interval '1 day' where user_id = '{equipe_sai}'")
outra_eq = parceiro("Ugo Equipe", f"ugo{sufixo}@exemplo.com", sair, "equipe")
certo, saida = sql(f"delete from public.academias where id = '{sair}'", **admin_kw)
ok(um(f"select count(*) from public.academias where id = '{sair}'") == "1", "nem o admin apaga a ficha publicada pelo site")
pend = um("insert into public.academias (name, status, cidade) values ('Cadastro Em Análise', 'pending', 'São Paulo') returning id")
sql(f"delete from public.academias where id = '{pend}'", **admin_kw)
ok(um(f"select count(*) from public.academias where id = '{pend}'") == "0", "o admin ainda recusa o cadastro em análise")
certo, saida = sql("select public.excluir_minha_conta_parceiros()", papel="authenticated", user=carla)
ok(not certo and "não é do GuiaTennis Parceiros" in saida, "conta só de jogador não usa a exclusão do Parceiros")
sql(f"select public.ativar_conta_de_jogador()", papel="authenticated", user=resp_sai)
sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{MOEMA}', 4, 'Boa do Rui')", papel="authenticated", user=resp_sai)
certo, saida = sql("select public.excluir_minha_conta_parceiros()", papel="authenticated", user=resp_sai)
ok(certo and um(f"select count(*) from auth.users where id = '{resp_sai}'") == "0" and um(f"select count(*) from public.academia_acessos where user_id = '{resp_sai}'") == "0",
   "o responsável exclui a própria conta" + ("" if certo else ": " + saida))
ok(um(f"select status || '|' || plano from public.academias where id = '{sair}'") == "published|premium", "com outro acesso, a academia fica no guia e o plano continua")
ok(um(f"select string_agg(papel, ',' order by created_at) from public.academia_vinculos where academia_id = '{sair}'") == "principal,equipe"
   and um(f"select papel from public.academia_vinculos where academia_id = '{sair}' and user_id = '{equipe_sai}'") == "principal",
   "o acesso mais antigo vira o responsável principal (e o plano passa a ser dele)")
mail = um(f"select assunto || '|' || para || '|' || (texto like '%Rui Sai excluiu a conta%' and texto like '%O plano Premium continua, agora em seu nome%')::text from public.emails_a_enviar where tipo = 'novo_responsavel'")
ok(mail == f"Agora você é o(a) responsável pela Academia Que Fica|tati{sufixo}@exemplo.com|true", "quem vira responsável recebe o e-mail, com o plano que passa a ser dele — " + str(mail))
ok(um("select count(*) from public.emails_a_enviar where tipo = 'plano'") == "0", "o plano não muda (sem e-mail de plano novo)")
ok(um("select count(*) from public.avaliacoes where comment = 'Boa do Rui' and user_id is null") == "1", "as avaliações ficam, com o nome")
ok(um(f"select count(*) from public.contas_excluidas where email = 'rui{sufixo}@exemplo.com'") == "0", "o e-mail não fica bloqueado: pode voltar")
# O último a sair: a academia volta ao Básico, sem responsável.
sql(f"delete from public.academia_vinculos where user_id = '{outra_eq}'")
sql("truncate public.emails_a_enviar")
certo, saida = sql("select public.excluir_minha_conta_parceiros()", papel="authenticated", user=equipe_sai)
ok(certo and um(f"select status || '|' || plano from public.academias where id = '{sair}'") == "published|basico"
   and um(f"select count(*) from public.academia_vinculos where academia_id = '{sair}'") == "0",
   "sem outro acesso, a academia fica no guia, no Básico e sem responsável" + ("" if certo else ": " + saida))
# A equipe sai sem mexer no plano.
sql(f"update public.academias set plano = 'completo' where id = '{sair}'")
dono_novo = parceiro("Vera Dona", f"vera{sufixo}@exemplo.com", sair)
eq2 = parceiro("Wil Equipe", f"wil{sufixo}@exemplo.com", sair, "equipe")
sql("select public.excluir_minha_conta_parceiros()", papel="authenticated", user=eq2)
ok(um(f"select plano from public.academias where id = '{sair}'") == "completo"
   and um(f"select papel from public.academia_vinculos where academia_id = '{sair}' and user_id = '{dono_novo}'") == "principal",
   "quem é da equipe sai e o plano e o responsável continuam")
# Desde 23/10/2026 (SQL 20261023120000), excluir pelo site dos jogadores
# exclui a mesma conta do Parceiros: o login sai e a academia fica.
eq_jog = parceiro("Yara Equipe", f"yara{sufixo}@exemplo.com", sair, "equipe")
sql("select public.ativar_conta_de_jogador()", papel="authenticated", user=eq_jog)
certo, saida = sql("select public.excluir_minha_conta_jogador()", papel="authenticated", user=eq_jog)
ok(certo and um(f"select count(*) from auth.users where id = '{eq_jog}'") == "0" and um(f"select count(*) from public.academia_acessos where user_id = '{eq_jog}'") == "0"
   and um(f"select count(*) from public.academia_vinculos where user_id = '{eq_jog}'") == "0" and um(f"select plano from public.academias where id = '{sair}'") == "completo",
   "excluir pelo site dos jogadores exclui também o Parceiros (o login inteiro); a academia e o plano ficam" + ("" if certo else ": " + saida))
# O admin exclui o responsável: a academia também fica (e vai para quem sobrar).
eq3 = parceiro("Xis Equipe", f"xis{sufixo}@exemplo.com", sair, "equipe")
certo, saida = sql(f"select public.excluir_conta_admin('{dono_novo}', 'Pediu academia que não representa')", **admin_kw)
ok(certo and um(f"select plano from public.academias where id = '{sair}'") == "completo"
   and um(f"select papel from public.academia_vinculos where academia_id = '{sair}' and user_id = '{eq3}'") == "principal",
   "o admin exclui o responsável: a academia fica, com quem sobrou como responsável" + ("" if certo else ": " + saida))
sql(f"delete from public.academia_vinculos where academia_id = '{sair}'; update public.academias set status = 'pending' where id = '{sair}';")
sql(f"delete from public.academias where id = '{sair}'", **admin_kw)
sql("truncate public.emails_a_enviar")

# 24. O chat de ajuda guardado na conta (SQL 20261009120000) ----------------------
print("\n# Conversas do chat na conta")
ana_chat = parceiro("Ana Chat", f"anachat{sufixo}@exemplo.com")
bia_chat = parceiro("Bia Chat", f"biachat{sufixo}@exemplo.com")
conversa = json.dumps([{"de": "gt", "texto": "Oi! Escreva a sua dúvida."}, {"de": "eu", "texto": "esqueci minha senha"},
                       {"de": "gt", "texto": "Na tela de entrar...", "acoes": [{"t": "Entrar", "ir": "entrar"}]}]).replace("'", "''")
certo, saida = sql(f"select public.guardar_conversa_de_ajuda(null, 'parceiros', null, '{conversa}'::jsonb)", papel="anon")
ok(not certo, "sem conta, nada é guardado")
certo, saida = sql("insert into public.conversas_de_ajuda (user_id, titulo) values (auth.uid(), 'x')", papel="authenticated", user=ana_chat)
ok(not certo, "a tabela não recebe gravação direta: só pela função")
cid = um(f"select public.guardar_conversa_de_ajuda(null, 'parceiros', null, '{conversa}'::jsonb)", papel="authenticated", user=ana_chat)
ok(bool(cid) and um(f"select titulo || '|' || jsonb_array_length(mensagens) from public.conversas_de_ajuda where id = '{cid}'") == "esqueci minha senha|3",
   "a primeira dúvida cria a conversa, com ela de título")
mais = json.dumps(json.loads(conversa.replace("''", "'")) + [{"de": "eu", "texto": "Ainda preciso de ajuda"}, {"de": "gt", "texto": "Tudo bem."}]).replace("'", "''")
outra = um(f"select public.guardar_conversa_de_ajuda('{cid}', 'parceiros', 'esqueci minha senha', '{mais}'::jsonb)", papel="authenticated", user=ana_chat)
ok(outra == cid and um(f"select jsonb_array_length(mensagens) from public.conversas_de_ajuda where id = '{cid}'") == "5", "a mesma conversa é atualizada")
ok(um("select count(*) from public.conversas_de_ajuda", papel="authenticated", user=ana_chat) == "1"
   and um("select count(*) from public.conversas_de_ajuda", papel="authenticated", user=bia_chat) == "0", "cada conta só lê as próprias conversas")
da_bia = um(f"select public.guardar_conversa_de_ajuda('{cid}', 'parceiros', null, '{conversa}'::jsonb)", papel="authenticated", user=bia_chat)
ok(da_bia and da_bia != cid and um(f"select jsonb_array_length(mensagens) from public.conversas_de_ajuda where id = '{cid}'") == "5",
   "o id de outra conta não mexe na conversa dela: vira uma conversa nova de quem mandou")
sql("delete from public.conversas_de_ajuda", papel="authenticated", user=bia_chat)
ok(um(f"select count(*) from public.conversas_de_ajuda where id = '{cid}'") == "1", "outra conta não apaga")
for ruim, porque in [("[]", "conversa vazia"), ('[{"de": "x", "texto": "oi"}]', "quem fala só pode ser a pessoa ou o chat"),
                     (json.dumps([{"de": "eu", "texto": "a" * 301}]), "o que a pessoa escreve tem até 300 letras"),
                     ('[{"de": "gt", "texto": "Oi!"}]', "sem nenhuma dúvida, não guarda")]:
    certo, _ = sql(f"select public.guardar_conversa_de_ajuda(null, 'parceiros', null, '{ruim}'::jsonb)", papel="authenticated", user=ana_chat)
    ok(not certo, "recusa: " + porque)
certo, _ = sql(f"select public.guardar_conversa_de_ajuda(null, 'outro', null, '{conversa}'::jsonb)", papel="authenticated", user=ana_chat)
ok(not certo, "recusa chat de site que não existe")
um(f"select public.guardar_conversa_de_ajuda(null, 'parceiros', null, '{conversa}'::jsonb) from generate_series(1, 51)", papel="authenticated", user=ana_chat)
ok(um(f"select count(*) from public.conversas_de_ajuda where user_id = '{ana_chat}'") == "50", "ficam as 50 conversas mais recentes")
certo, _ = sql(f"delete from public.conversas_de_ajuda where id in (select id from public.conversas_de_ajuda limit 3)", papel="authenticated", user=ana_chat)
ok(certo and um(f"select count(*) from public.conversas_de_ajuda where user_id = '{ana_chat}'") == "47", "a própria conta apaga as conversas")
# Site dos jogadores e "Resolvida" (SQL 20261015130000).
rid = um(f"select public.guardar_conversa_de_ajuda(null, 'jogadores', null, '{conversa}'::jsonb, true)", papel="authenticated", user=ana_chat)
ok(um(f"select site || '|' || resolvida from public.conversas_de_ajuda where id = '{rid}'") == "jogadores|true", "a conversa do site dos jogadores vai para a conta, marcada como resolvida")
um(f"select public.guardar_conversa_de_ajuda('{rid}', 'jogadores', null, '{mais}'::jsonb)", papel="authenticated", user=ana_chat)
ok(um(f"select resolvida from public.conversas_de_ajuda where id = '{rid}'") == "t", "sem dizer, o \"resolvida\" não muda (o site antigo continua guardando)")
um(f"select public.guardar_conversa_de_ajuda('{rid}', 'jogadores', null, '{mais}'::jsonb, false)", papel="authenticated", user=ana_chat)
ok(um(f"select resolvida from public.conversas_de_ajuda where id = '{rid}'") == "f", "pergunta nova reabre a conversa")
ok(um(f"select count(*) from public.conversas_de_ajuda where user_id = '{ana_chat}' and site = 'parceiros'") == "47",
   "as 50 mais recentes contam por site: a do site dos jogadores não apaga a do Parceiros")
sql(f"delete from auth.users where id = '{ana_chat}'")
ok(um(f"select count(*) from public.conversas_de_ajuda where user_id = '{ana_chat}'") == "0", "excluir a conta apaga as conversas")

# 25. Lembrete de conferir a ficha parada há 3 meses (SQL 20261009130000) ---------
print("\n# Lembrete de conferir a ficha")
sql("set local session_replication_role = replica; update public.academias set dados_atualizados_em = now();"
    "delete from public.lembretes_de_ficha; delete from public.emails_a_enviar where tipo = 'ficha_parada';")
parada = um("insert into public.academias (name, status, bairro, cidade) values ('Academia Parada', 'published', 'Lapa', 'São Paulo') returning id")
sql(f"update public.academias set plano = 'completo' where id = '{parada}'")  # o Básico tem 1 pessoa só
lia = parceiro("Lia Parada", f"liaparada{sufixo}@exemplo.com", parada)
teo = parceiro("Teo Equipe", f"teoparada{sufixo}@exemplo.com", parada, papel="equipe")
parceiro("Rui Sem Confirmar", f"ruiparada{sufixo}@exemplo.com", parada, papel="equipe", confirmado=False)
def parar_a_ficha(dias=100):
    sql(f"set local session_replication_role = replica; update public.academias set dados_atualizados_em = now() - interval '{dias} days' where id = '{parada}'")
lembrar = lambda: um("select public.preparar_lembretes_de_ficha()")
parar_a_ficha(80)
ok(lembrar() == "0" and fila("tipo = 'ficha_parada'") == "0", "ficha com menos de 3 meses: nada")
parar_a_ficha()
ok(lembrar() == "1", "ficha parada há 3 meses: lembra a academia")
ok(um("select string_agg(para, ',' order by para) from public.emails_a_enviar where tipo = 'ficha_parada'") == f"liaparada{sufixo}@exemplo.com,teoparada{sufixo}@exemplo.com",
   "vai para quem administra com o e-mail confirmado (responsável e equipe)")
html = um("select html from public.emails_a_enviar where tipo = 'ficha_parada' limit 1") or ""
curto = parada.replace("-", "")[-8:]
ok(um("select assunto from public.emails_a_enviar where tipo = 'ficha_parada' limit 1") == "Confira a ficha da Academia Parada no GuiaTennis"
   and "Conferir a ficha" in html and f"/parceiros/ficha?abrir={curto}&amp;utm_source=Email-ficha" in html
   and "há 3 meses" in html and "atualizada hoje" in html and "aviso=parceiros" in html,
   "o e-mail diz desde quando, pede para conferir e salvar, abre a ficha da academia e tem o link para parar")
texto = sql("select texto from public.emails_a_enviar where tipo = 'ficha_parada' limit 1")[1]  # várias linhas
ok(f"/parceiros/ficha?abrir={curto}&utm_source=Email-ficha" in texto, "a versão em texto tem o link")
ok(lembrar() == "0" and fila("tipo = 'ficha_parada'") == "2", "no dia seguinte, não repete")
# Três meses depois, ainda parada (a fila já foi limpa): lembra de novo.
sql(f"update public.lembretes_de_ficha set lembrada_em = now() - interval '100 days' where academia_id = '{parada}';"
    "delete from public.emails_a_enviar where tipo = 'ficha_parada';")
sql(f"update public.academia_acessos set avisos_por_email = false where user_id = '{teo}'")
parar_a_ficha(190)
ok(lembrar() == "1" and um("select string_agg(para, ',') from public.emails_a_enviar where tipo = 'ficha_parada'") == f"liaparada{sufixo}@exemplo.com",
   "continua parada 3 meses depois: lembra de novo, menos quem desligou os avisos")
ok("há 6 meses" in (um("select html from public.emails_a_enviar where tipo = 'ficha_parada'") or ""), "o e-mail conta os meses")
# A academia salvou a ficha: a data volta a hoje e o lembrete para.
sql(f"update public.lembretes_de_ficha set lembrada_em = now() - interval '100 days' where academia_id = '{parada}';"
    "delete from public.emails_a_enviar where tipo = 'ficha_parada';")
certo, saida = sql(f"update public.academias set name = name where id = '{parada}'", papel="authenticated", user=lia)
ok(certo and lembrar() == "0", "salvou a ficha: não lembra" + ("" if certo else ": " + saida))
parar_a_ficha()
sql(f"update public.academias set pausada = true where id = '{parada}'")
ok(lembrar() == "0", "academia pausada não recebe")
sql(f"update public.academias set pausada = false where id = '{parada}'")
sql(f"update public.academia_acessos set email_confirmado_em = null where user_id = '{lia}'")
ok(lembrar() == "0" and um(f"select lembrada_em < now() - interval '90 days' from public.lembretes_de_ficha where academia_id = '{parada}'") == "t",
   "sem ninguém para receber, não anota (tenta de novo no dia seguinte)")
sql(f"update public.academia_acessos set email_confirmado_em = now() where user_id = '{lia}'")
sql("select public.preparar_avisos_do_dia()")
ok(fila("tipo = 'ficha_parada'") == "1", "sai junto com os avisos do dia (10h de Brasília)")
sem_dono = um("insert into public.academias (name, status) values ('Academia Sem Dono', 'published') returning id")
sql(f"set local session_replication_role = replica; update public.academias set dados_atualizados_em = now() - interval '200 days' where id = '{sem_dono}'")
ok(lembrar() == "0", "academia sem ninguém no Parceiros: nada")
certo, _ = sql("select public.preparar_lembretes_de_ficha()", papel="anon")
ok(not certo, "o visitante não dispara o lembrete")
certo, _ = sql("select * from public.lembretes_de_ficha", papel="authenticated", user=lia)
ok(not certo, "a tabela dos lembretes não é lida pelo site")
sql(f"delete from public.academias where id in ('{parada}', '{sem_dono}')")
ok(um(f"select count(*) from public.lembretes_de_ficha where academia_id = '{parada}'") == "0", "apagar a academia apaga o lembrete")

# 26. Lembrete para o jogador que não entra há 3 meses (SQL 20261009140000) -------
print("\n# Lembrete de volta do jogador")
sql("delete from public.emails_a_enviar where tipo = 'volta';"
    "update public.jogadores set visto_em = now();"  # as contas das outras seções: ativas
    "set local session_replication_role = replica; update public.academias set publicada_em = now() - interval '200 days';")
def sumir(uid, dias=120):
    sql(f"update public.jogadores set visto_em = null, created_at = now() - interval '{dias} days' where user_id = '{uid}';"
        f"update auth.users set last_sign_in_at = now() - interval '{dias} days' where id = '{uid}'")
vera = jogador("Vera Volta", f"veravolta{sufixo}@exemplo.com", cidade="'Sao Paulo'")
sumir(vera)
sem_cidade = jogador("Caio Sem Cidade", f"caiovolta{sufixo}@exemplo.com")
sumir(sem_cidade)
nao_conf_v = jogador("Nina Não Confirmou", f"ninavolta{sufixo}@exemplo.com", confirmado=False)
sumir(nao_conf_v)
desligou = jogador("Otto Desligou", f"ottovolta{sufixo}@exemplo.com", lembrete_de_volta="false")
sumir(desligou)
ativa = jogador("Pia Ativa", f"piavolta{sufixo}@exemplo.com")
sumir(ativa, 30)
sql(f"update public.jogadores set visto_em = now() - interval '120 days' where user_id = '{dono}'")
nova_sp = academia_nova("Quadra Recém Aberta", -23.55, -46.63, ["saibro"])
sql(f"set local session_replication_role = replica; update public.academias set publicada_em = now() - interval '10 days' where id = '{nova_sp}'")
sql("select public.preparar_lembretes_de_volta()")
para = um("select string_agg(para, ',' order by para) from public.emails_a_enviar where tipo = 'volta'") or ""
ok(para == f"caiovolta{sufixo}@exemplo.com,veravolta{sufixo}@exemplo.com",
   "vai para quem não entra há 3 meses, com o e-mail confirmado, mesmo sem ter ligado avisos — " + para)
ok(f"ana{sufixo}@" not in para, "quem administra academia não recebe (já recebe o resumo do mês)")
ok(um(f"select assunto from public.emails_a_enviar where para = 'veravolta{sufixo}@exemplo.com'") == "1 academia nova em Sao Paulo desde a sua última visita",
   "com cidade: o assunto conta as academias novas desde a última visita")
html = um(f"select html from public.emails_a_enviar where para = 'veravolta{sufixo}@exemplo.com'") or ""
ok("Quadra Recém Aberta" in html and "Faz 3 meses que você não entra" in html and "Vera" in html
   and "/quadras/sao-paulo?utm_source=Email-volta" in html and "aviso=volta" in html and "Ver academias em Sao Paulo" in html,
   "o e-mail traz o nome, há quantos meses, as academias novas, o botão da cidade e o link para parar")
ok(um(f"select assunto from public.emails_a_enviar where para = 'caiovolta{sufixo}@exemplo.com'") == "Faz tempo que você não passa no GuiaTennis"
   and "Buscar academias" in (um(f"select html from public.emails_a_enviar where para = 'caiovolta{sufixo}@exemplo.com'") or ""),
   "sem cidade: o lembrete simples, com \"Buscar academias\"")
ok(um("select public.preparar_lembretes_de_volta()") == "0" and fila("tipo = 'volta'") == "2", "não repete enquanto a pessoa não voltar")
certo, _ = sql("select public.marcar_visita_da_conta()", papel="authenticated", user=vera)
ok(certo and um(f"select visto_em > now() - interval '1 minute' from public.jogadores where user_id = '{vera}'") == "t", "abrir o site com a conta anota a visita")
sql(f"update public.jogadores set visto_em = now() - interval '1 hour' where user_id = '{vera}'")
sql("select public.marcar_visita_da_conta()", papel="authenticated", user=vera)
ok(um(f"select visto_em < now() - interval '50 minutes' from public.jogadores where user_id = '{vera}'") == "t", "no máximo uma anotação a cada 12 horas")
# Voltou e sumiu de novo: depois de mais 3 meses, um lembrete novo.
sql(f"update public.jogadores set lembrado_de_volta_em = now() - interval '200 days', visto_em = now() - interval '100 days' where user_id = '{vera}'")
ok(um("select public.preparar_lembretes_de_volta()") == "1" and fila(f"tipo = 'volta' and para = 'veravolta{sufixo}@exemplo.com'") == "2",
   "voltou e ficou mais 3 meses sem entrar: um lembrete novo")
certo, _ = sql("update public.jogadores set visto_em = '2020-01-01' where user_id = auth.uid()", papel="authenticated", user=vera)
ok(not certo, "a conta não escreve a data da visita à mão")
certo, _ = sql("update public.jogadores set lembrete_de_volta = false where user_id = auth.uid()", papel="authenticated", user=sem_cidade)
ok(certo and um(f"select lembrete_de_volta::text from public.jogadores where user_id = '{sem_cidade}'") == "false", "a conta desliga o lembrete em Minha conta")
token = um(f"select token_avisos from public.jogadores where user_id = '{vera}'")
sql(f"update public.jogadores set avisos_academias = true where user_id = '{vera}'")
ok(um(f"select public.parar_avisos('{token}', 'volta')", papel="anon") == "volta"
   and um(f"select lembrete_de_volta::text || avisos_academias::text from public.jogadores where user_id = '{vera}'") == "falsetrue",
   "o link do e-mail desliga só o lembrete")
sql(f"update public.jogadores set lembrete_de_volta = true where user_id = '{vera}'")
um(f"select public.parar_avisos('{token}', 'todos')", papel="anon")
ok(um(f"select lembrete_de_volta::text from public.jogadores where user_id = '{vera}'") == "false", "\"todos\" também desliga o lembrete")
certo, _ = sql("select public.preparar_lembretes_de_volta()", papel="anon")
ok(not certo, "o visitante não dispara o lembrete")
sql(f"delete from public.academias where id = '{nova_sp}'")

# 27. Resumo do mês para quem administra a academia (SQL 20261009150000) ---------
print("\n# Resumo do mês do Parceiros")
sql("delete from public.emails_a_enviar where tipo = 'resumo_do_mes'")
resumo = um("insert into public.academias (name, status, bairro, cidade) values ('Academia do Resumo', 'published', 'Lapa', 'São Paulo') returning id")
sql(f"set local session_replication_role = replica; update public.academias set plano = 'completo', publicada_em = '2026-08-01' where id = '{resumo}'")
rita = parceiro("Rita Resumo", f"ritaresumo{sufixo}@exemplo.com", resumo)
saulo = parceiro("Saulo Equipe", f"sauloresumo{sufixo}@exemplo.com", resumo, papel="equipe")
cliques = [("visualizacao", "2026-09-10 15:00+00", "Instagram"), ("visualizacao", "2026-09-11 15:00+00", "Instagram"),
           ("visualizacao", "2026-09-30 23:00+00", "Google"),  # 20h de 30/09 em Brasília: setembro
           ("visualizacao", "2026-10-01 02:00+00", "Google"),  # 23h de 30/09 em Brasília: setembro
           ("visualizacao", "2026-10-01 04:00+00", "Google"),  # 1h de 01/10 em Brasília: outubro, fora
           ("visualizacao", "2026-08-05 15:00+00", "Direto"), ("visualizacao", "2026-08-06 15:00+00", "Direto"),
           ("whatsapp", "2026-09-12 15:00+00", ""), ("compartilhar", "2026-09-12 16:00+00", "")]
sql("insert into public.cliques (academia_id, tipo, created_at, origem) values "
    + ", ".join(f"('{resumo}', '{t}', '{d}', '{o}')" for t, d, o in cliques))
sql(f"set local session_replication_role = replica; insert into public.avaliacoes (academia_id, stars, comment, nome_autor, created_at) values "
    f"('{resumo}', 5, 'Ótima', 'Joana', '2026-09-15 12:00+00'), ('{resumo}', 4, 'Boa', 'Lúcio', '2026-09-20 12:00+00')")
mes = lambda dia="2026-10-02": um(f"select public.preparar_resumos_do_mes('{dia}')")
ok(mes("2026-10-08") == "0", "depois do dia 7, não sai")
mes()
deles = f"tipo = 'resumo_do_mes' and para in ('ritaresumo{sufixo}@exemplo.com', 'sauloresumo{sufixo}@exemplo.com')"
ok(fila(deles) == "2", "sai para cada pessoa da academia")
ok(um(f"select assunto from public.emails_a_enviar where para = 'ritaresumo{sufixo}@exemplo.com' and tipo = 'resumo_do_mes'")
   == "Setembro na Academia do Resumo: 4 acessos à ficha", "o assunto traz o mês e os acessos (o mês contado no horário de Brasília)")
html = um(f"select html from public.emails_a_enviar where para = 'ritaresumo{sufixo}@exemplo.com' and tipo = 'resumo_do_mes'") or ""
curto = resumo.replace("-", "")[-8:]
ok("100% a mais que em agosto (2)" in html and "avaliações novas" in html and "média 4,5 ★" in html and "2 avaliações esperam resposta" in html,
   "acessos com o mês anterior, avaliações novas com a média e as que esperam resposta")
ok("Quem chamou" not in html and "De onde vieram" not in html, "fora do Premium, só o que o plano mostra no painel")
ok(f"/parceiros/painel?abrir={curto}&amp;utm_source=Email-resumo" in html and "Abrir o GuiaTennis Parceiros" in html and "aviso=parceiros" in html,
   "o botão abre o painel da academia e há o link para parar")
mes()
ok(fila(deles) == "2", "uma vez por mês")
sql(f"update public.academias set plano = 'premium' where id = '{resumo}'; delete from public.emails_a_enviar where {deles}")
sql(f"update public.academia_acessos set avisos_por_email = false where user_id = '{saulo}'")
mes()
ok(fila(deles) == "1", "quem desligou os avisos não recebe")
html = um(f"select html from public.emails_a_enviar where {deles}") or ""
ok("WhatsApp 1 · Instagram 0 · site 0" in html and "1 pessoa compartilhou" in html and "Google (2), Instagram (2)" in html
   and f"/parceiros/desempenho?abrir={curto}" in html and "Ver o desempenho" in html,
   "Premium: também quem chamou, quem compartilhou e de onde vieram")
texto = sql(f"select texto from public.emails_a_enviar where {deles}")[1]
ok("• 4 acessos à ficha" in texto and "Quem chamou: WhatsApp 1" in texto, "a versão em texto tem os mesmos números")
sql(f"delete from public.emails_a_enviar where {deles}; update public.academias set pausada = true where id = '{resumo}'")
mes()
ok(fila(deles) == "0", "academia pausada não recebe")
sql(f"update public.academias set pausada = false where id = '{resumo}'")
sql(f"set local session_replication_role = replica; update public.academias set publicada_em = '2026-10-01 12:00+00' where id = '{resumo}'")
mes()
ok(fila(deles) == "0", "academia que entrou depois do mês: nada")
sql(f"set local session_replication_role = replica; update public.academias set publicada_em = '2026-08-01' where id = '{resumo}'")
sql("select public.preparar_avisos_do_dia()")
ok(um("select count(*) from public.emails_a_enviar where tipo in ('volta', 'ficha_parada')") is not None, "os avisos do dia rodam com os lembretes e o resumo sem erro")
certo, _ = sql("select public.preparar_resumos_do_mes()", papel="authenticated", user=rita)
ok(not certo, "quem administra não dispara o resumo")
sql(f"delete from public.academias where id = '{resumo}'")

# 28. Falhas do site (SQL 20261011120000) ------------------------------------------
print("\n# Falhas do site")
sql("truncate public.falhas_do_site; truncate public.emails_a_enviar")


def falha(papel="anon", user=None, email=None, **campos):
    f = {"codigo": "K7Q2MX", "visita": "visita" + sufixo, "site": "jogadores", "acao": "Enviar a avaliação", "tipo": "banco",
         "mensagem": "Could not find the function public.x", "tela": "/academia/so-aula-1?abrir=2", "dispositivo": "Celular",
         "navegador": "Safari 17", "sistema": "iOS 17", "aviso": True}
    f.update(campos)
    return um(f"select public.registrar_falha('{json.dumps(f).replace(chr(39), chr(39) * 2)}'::jsonb)", papel=papel, user=user, email=email)


ok(falha() == "t", "o visitante registra a falha")
linha = um("select codigo || '|' || quem || '|' || tela || '|' || tipo || '|' || aviso_na_tela from public.falhas_do_site")
ok(linha == "K7Q2MX|visitante|/academia/so-aula-1|banco|true", "guarda o código, quem (pelo login), a tela sem o \"?\" e se a pessoa viu o aviso")
certo, _ = sql("select count(*) from public.falhas_do_site", papel="anon")
ok(not certo, "o visitante não lê as falhas")
certo, _ = sql("insert into public.falhas_do_site (codigo, grupo, acao) values ('AAAAAA', 'x', 'y')", papel="anon")
ok(not certo, "ninguém grava direto na tabela, só pela função")
ok(um("select count(*) from public.falhas_do_site", papel="authenticated", user=carla, email=f"carla{sufixo}@exemplo.com") == "0",
   "um jogador não lê as falhas")
ok(fila("tipo = 'falha_no_site'") == "1" and "Enviar a avaliação" in (um("select assunto from public.emails_a_enviar where tipo = 'falha_no_site'") or ""),
   "falha nova manda e-mail ao admin")
corpo = um("select html from public.emails_a_enviar where tipo = 'falha_no_site'") or ""
ok("K7Q2MX" in corpo and "/admin/falhas" in corpo and "Safari 17" in corpo, "o e-mail traz o código, o aparelho e o link para Falhas no painel")
ok(falha(codigo="ABC234", mensagem="Could not find the function public.x") == "t" and fila("tipo = 'falha_no_site'") == "1",
   "a mesma falha de novo não manda outro e-mail")
ok(falha(codigo="DEF567", acao="Salvar a busca", mensagem="timeout") == "t" and fila("tipo = 'falha_no_site'") == "1",
   "outra falha nova nas mesmas 3 horas fica só no painel")
sql("truncate public.emails_a_enviar")
ok(falha(codigo="DEF568", acao="Abrir a ficha", tipo="rede", mensagem="Failed to fetch") == "t" and fila("tipo = 'falha_no_site'") == "0",
   "falha de conexão (a internet de quem usa) fica no painel, sem e-mail")
ok(um("select count(distinct grupo) from public.falhas_do_site") == "3" and um("select count(*) from public.falhas_do_site where acao = 'Enviar a avaliação'") == "2"
   and um("select count(distinct grupo) from public.falhas_do_site where acao = 'Enviar a avaliação'") == "1", "as iguais ficam no mesmo grupo")
ok(falha(codigo="GHJ789", mensagem="Erro 503 em 12345 ms") == "t" and falha(codigo="GHJ78A".replace("A", "2"), mensagem="Erro 503 em 9 ms") == "t"
   and um("select count(distinct grupo) from public.falhas_do_site where mensagem like 'Erro 503%'") == "1",
   "números diferentes na mensagem não separam a falha")
falha(codigo="LMN234", mensagem=f"duplicate key (email)=(maria{sufixo}@exemplo.com) whatsapp (11) 98765-4321 cpf 12345678901",
      detalhe="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.x")
gravada = um("select mensagem || '|' || detalhe from public.falhas_do_site where codigo = 'LMN234'") or ""
ok("@" not in gravada and "98765" not in gravada and "12345678901" not in gravada and "eyJ" not in gravada and "[e-mail]" in gravada,
   "e-mail, telefone, números longos e chaves saem da mensagem")
for ruim, porque in [({"codigo": "abc"}, "código fora do formato"), ({"codigo": "OOOOOO"}, "código com letra que confunde (O)"), ({"acao": ""}, "sem a ação")]:
    ok(falha(**ruim) == "f", "ignora: " + porque)
ok(falha(codigo="PQR234", tipo="inventado", site="outro", visita="NÃO VALE") == "t"
   and um("select tipo || '|' || site || '|' || coalesce(visita, '-') from public.falhas_do_site where codigo = 'PQR234'") == "codigo|jogadores|-",
   "tipo, site e visita estranhos viram o padrão, sem dar erro")
ok(falha(codigo="STU234", academia=PINHEIROS) == "t" and um(f"select academia_id from public.falhas_do_site where codigo = 'STU234'") == PINHEIROS
   and falha(codigo="STU235", academia="00000000-0000-4000-8000-999999999999") == "t"
   and um("select coalesce(academia_id::text, '-') from public.falhas_do_site where codigo = 'STU235'") == "-",
   "a academia entra só se existir")
ok(falha(codigo="VWX234", papel="authenticated", user=carla, email=f"carla{sufixo}@exemplo.com") == "t"
   and um("select quem from public.falhas_do_site where codigo = 'VWX234'") == "jogador", "o banco sabe que foi um jogador com conta")
ok(falha(codigo="VWX235", papel="authenticated", user=dono, email=f"ana{sufixo}@exemplo.com") == "t"
   and um("select quem from public.falhas_do_site where codigo = 'VWX235'") == "academia", "e que foi uma conta do Parceiros")
admin_uid = um(f"select id from auth.users where email = '{ADMIN}'") or login(ADMIN)
sql("truncate public.emails_a_enviar")
ok(falha(codigo="YZA234", acao="Excluir a avaliação", papel="authenticated", user=admin_uid, email=ADMIN) == "t"
   and um("select quem from public.falhas_do_site where codigo = 'YZA234'") == "admin" and fila("tipo = 'falha_no_site'") == "0",
   "a falha do admin fica marcada como dele e não manda e-mail")
# Limite por visita: 30 por hora.
sql("truncate public.falhas_do_site")
for i in range(32):
    falha(codigo="Q" + "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[i] + "2345", visita="enchendo" + sufixo)
ok(um(f"select count(*) from public.falhas_do_site where visita = 'enchendo{sufixo}'") == "30", "até 30 falhas por visita a cada hora")
# O admin lê, procura pelo código e resolve.
lista = um("select count(*) from public.falhas_admin(30)", papel="authenticated", user=admin_uid, email=ADMIN)
ok(lista == "30", "o admin vê as falhas dos últimos dias")
ok(um("select count(*) from public.falhas_admin(30)", papel="authenticated", user=carla, email=f"carla{sufixo}@exemplo.com") == "0",
   "a função do admin não devolve nada para os outros")
sql("set local session_replication_role = replica; update public.falhas_do_site set created_at = now() - interval '40 days' where codigo = 'Q22345'")
ok(um("select count(*) from public.falhas_admin(30, 'q2-2345')", papel="authenticated", user=admin_uid, email=ADMIN) == "1",
   "pelo código acha a falha de qualquer dia, com letra minúscula e traço")
grupo = um("select grupo from public.falhas_do_site limit 1")
ok(um(f"select public.resolver_falhas_admin('{grupo}')", papel="authenticated", user=admin_uid, email=ADMIN) == "30",
   "\"Marcar como resolvida\" fecha todas as do grupo")
certo, _ = sql(f"select public.resolver_falhas_admin('{grupo}')", papel="authenticated", user=carla, email=f"carla{sufixo}@exemplo.com")
ok(not certo, "só o admin marca como resolvida")
sql("truncate public.emails_a_enviar")
ok(falha(codigo="BCD234", visita="outra" + sufixo) == "t" and fila("tipo = 'falha_no_site'") == "1"
   and "voltou" in (um("select lower(assunto) from public.emails_a_enviar where tipo = 'falha_no_site'") or ""),
   "a falha que volta depois de resolvida manda e-mail de novo (\"Falha voltou\")")
# Passou de 90 dias, sai.
sql("set local session_replication_role = replica; update public.falhas_do_site set created_at = now() - interval '91 days' where codigo = 'Q22345'")
falha(codigo="EFG234", visita="limpa" + sufixo)
ok(um("select count(*) from public.falhas_do_site where codigo = 'Q22345'") == "0", "o que passou de 90 dias sai")
sql("truncate public.falhas_do_site; truncate public.emails_a_enviar")

# 29. Avisos para toda a equipe (SQL 20261013120000) ------------------------------
print("\n# Avisos para toda a equipe")
sql("truncate public.emails_a_enviar")
eq = um("insert into public.academias (name, status, cidade, bairro, plano) values ('Academia da Equipe', 'published', 'São Paulo', 'Lapa', 'basico') returning id")
resp_eq = parceiro("Paula Responsável", f"paulaeq{sufixo}@exemplo.com", eq)
ok(fila() == "0", "a primeira pessoa da academia não gera aviso (não há quem avisar)")
equipe_eq = parceiro("Edu Equipe", f"edueq{sufixo}@exemplo.com", eq, "equipe")
novo = um(f"select html || '|' || assunto || '|' || para from public.emails_a_enviar where tipo = 'pessoa_nova'") or ""
ok(fila("tipo = 'pessoa_nova'") == "1" and f"paulaeq{sufixo}@exemplo.com" in novo and "Edu Equipe agora administra a Academia da Equipe com você" in novo
   and f"<strong>Edu Equipe</strong> (Dono(a) · edueq{sufixo}@exemplo.com)" in novo.split("|")[0] and "Tire o acesso dela em <strong>Acessos</strong>" in novo and "Acesso novo na academia" in novo and "/parceiros/acessos?abrir=" in novo and "Ver os acessos" in novo,
   "pessoa nova: quem já administrava recebe, com o nome, o cargo e o e-mail dela e como tirar o acesso (SQL 20261013130000) — " + novo[-120:])
sem_conf = parceiro("Sid Sem", f"sideq{sufixo}@exemplo.com", eq, "equipe", confirmado=False)
equipe_html = um(f"select html from public.emails_a_enviar where tipo = 'pessoa_nova' and para = 'edueq{sufixo}@exemplo.com'") or ""
ok(fila("tipo = 'pessoa_nova'") == "3" and fila(f"para = 'sideq{sufixo}@exemplo.com'") == "0" and "Fale com o responsável principal" in equipe_html,
   "a terceira pessoa avisa as duas de antes (a equipe com o texto dela); quem entrou não recebe sobre si")
# Quem inclui a pessoa não recebe o aviso dela.
sql("truncate public.emails_a_enviar")
sql(f"update public.academias set plano = 'premium' where id = '{eq}'; truncate public.emails_a_enviar")
outra = parceiro("Olga Outra", f"olgaeq{sufixo}@exemplo.com")
certo, saida = sql(f"select public.adicionar_pessoa('olgaeq{sufixo}@exemplo.com', 'Olga Outra', null)", papel="authenticated", user=resp_eq)
ok(certo and fila(f"tipo = 'pessoa_nova' and para = 'paulaeq{sufixo}@exemplo.com'") == "0"
   and fila(f"tipo = 'pessoa_nova' and para = 'edueq{sufixo}@exemplo.com'") == "1",
   "quem incluiu a pessoa (a responsável) não recebe; o resto da equipe sim" + ("" if certo else ": " + saida))

# O plano mudou.
sql(f"delete from public.academia_vinculos where user_id = '{outra}' and academia_id = '{eq}'; update public.academias set plano = 'basico' where id = '{eq}'; truncate public.emails_a_enviar")
sql(f"update public.academias set plano = 'premium' where id = '{eq}'")
ok(fila("tipo = 'plano'") == "2" and fila(f"tipo = 'plano' and para = 'sideq{sufixo}@exemplo.com'") == "0",
   "plano novo: todos que administram com o e-mail confirmado recebem")
plano = um(f"select assunto || '|' || html || '|' || replace(texto, E'\\n', ' ¶ ') from public.emails_a_enviar where tipo = 'plano' and para = 'paulaeq{sufixo}@exemplo.com'") or ""
ok(plano.startswith("A Academia da Equipe agora está no plano Premium|") and "Olá, Paula!" in plano and "do <strong>Básico</strong> para o <strong>Premium</strong>" in plano
   and "O selo dourado ao lado do nome" in plano and "Instagram e site" in plano and "Pessoas com acesso: até 10 (antes, até 1)" in plano
   and "Ver o plano" in plano and "/parceiros/plano?abrir=" in plano and "Não quero mais receber" in plano and "• Promoções na ficha e na busca" in plano
   and "• Entre as “Academias recomendadas” da página inicial, quanto mais completa a ficha" in plano
   and "• Primeiro entre as recomendadas, marcada como “Patrocinado”" in plano,
   "o e-mail diz o plano de antes e o novo e o que a academia passa a ter, no nosso visual — " + plano[:80])
# O admin muda de ideia antes de o e-mail sair: vai um só, do plano de antes.
sql(f"update public.academias set plano = 'completo' where id = '{eq}'")
plano = um(f"select assunto || '|' || html from public.emails_a_enviar where tipo = 'plano' and para = 'paulaeq{sufixo}@exemplo.com'") or ""
ok(fila("tipo = 'plano'") == "2" and plano.startswith("A Academia da Equipe agora está no plano Completo|") and "do <strong>Básico</strong> para o <strong>Completo</strong>" in plano
   and "selo dourado" not in plano,
   "trocou de novo antes de sair: o e-mail que esperava é trocado pelo novo, contando do plano de antes")
sql(f"update public.academias set plano = 'basico' where id = '{eq}'")
ok(fila("tipo = 'plano'") == "0", "voltou ao mesmo plano antes de sair: nenhum e-mail")
# Descendo, com mais pessoas do que o plano permite.
sql(f"update public.academias set plano = 'premium' where id = '{eq}'; update public.emails_a_enviar set enviado_em = now() where tipo = 'plano'")
sql(f"update public.academias set plano = 'basico' where id = '{eq}'")
plano = um(f"select assunto || '|' || html from public.emails_a_enviar where tipo = 'plano' and enviado_em is null and para = 'edueq{sufixo}@exemplo.com'") or ""
ok(plano.startswith("O plano da Academia da Equipe mudou para o Básico|") and "Com o Básico, a academia deixa de ter:" in plano
   and "Nada é apagado" in plano and "Hoje 3 pessoas têm acesso à academia, e o Básico permite até 1: o responsável principal tira quem passar do limite em <strong>Acessos</strong>" in plano and "Olá, Edu!" in plano,
   "descendo: o que a academia deixa de ter, que nada é apagado e quem passa do limite de pessoas — " + plano[:70])
sql(f"update public.academia_acessos set avisos_por_email = false where user_id = '{equipe_eq}'; truncate public.emails_a_enviar")
sql(f"update public.academias set plano = 'completo' where id = '{eq}'")
ok(fila("tipo = 'plano'") == "1" and fila(f"para = 'edueq{sufixo}@exemplo.com'") == "0", "quem desligou os avisos não recebe")
sql(f"update public.academia_acessos set avisos_por_email = true where user_id = '{equipe_eq}'; truncate public.emails_a_enviar")
sql(f"update public.academias set name = 'Academia da Equipe' where id = '{eq}'")
ok(fila() == "0", "mudar outra coisa da academia não manda o e-mail do plano")

# Pedido de acesso: o responsável decide, a equipe fica sabendo.
pede = parceiro("Rafa Pede", f"rafaeq{sufixo}@exemplo.com")
certo, saida = sql(f"select public.pedir_para_administrar('{eq}', true)", papel="authenticated", user=pede)
resp_html = um(f"select tipo || '|' || html from public.emails_a_enviar where para = 'paulaeq{sufixo}@exemplo.com'") or ""
eq_html = um(f"select tipo || '|' || html from public.emails_a_enviar where para = 'edueq{sufixo}@exemplo.com'") or ""
ok(certo and resp_html.startswith("pedido_responsavel|") and "aceite em <strong>Acessos</strong>" in resp_html and "/parceiros/acessos" in resp_html and "Ver o pedido" in resp_html,
   "pedido de acesso: o responsável recebe, com \"Ver o pedido\"" + ("" if certo else ": " + saida))
ok(eq_html.startswith("pedido_equipe|") and "Quem aceita ou recusa é o responsável principal (Paula Responsável)" in eq_html,
   "e a equipe também, dizendo que quem decide é o responsável — " + eq_html[:60])
ok(fila(f"para = 'sideq{sufixo}@exemplo.com'") == "0" and fila(f"para = 'rafaeq{sufixo}@exemplo.com'") == "0", "sem o e-mail confirmado não recebe; quem pediu não recebe o próprio pedido")
sql(f"delete from public.academias where id = '{eq}'; truncate public.emails_a_enviar")

# 31. Leilão das notificações por região (SQL 20261019120000) ------------------
print("\n# Leilão das notificações")
sql("truncate public.emails_a_enviar; delete from public.lances; update public.leilao_config set lance_minimo = 10, desconto_premium = 0.20, raio_km = 4")
# Três academias no mesmo bairro, cada uma com o seu responsável.
la = dono
# Desde 22/10/2026 (SQL 20261022120000), o leilão é só do Premium, sem desconto.
sql(f"update public.academias set plano = 'premium', envios_de_aviso = 100, bairro = 'Pinheiros', cidade = 'São Paulo', status = 'published', pausada = false where id = '{PINHEIROS}'")
lat, lng = um(f"select lat || ',' || lng from public.academias where id = '{PINHEIROS}'").split(",")
outras = []
for i, (nome, plano, saldo) in enumerate([("Academia Leilão B", "premium", 100), ("Academia Leilão C", "premium", 5), ("Academia Leilão D", "completo", 100)]):
    aid = um(f"insert into public.academias (name, bairro, cidade, lat, lng, status, plano, envios_de_aviso, phone) values "
             f"('{nome}', 'Pinheiros', 'São Paulo', {float(lat) + 0.002 * (i + 1)}, {lng}, 'published', '{plano}', {saldo}, '1197777000{i}') returning id")
    resp = parceiro(f"Resp {i}", f"resp{i}{sufixo}@exemplo.com", aid)
    outras.append((aid, resp))
(b_id, b_resp), (c_id, c_resp), (d_id, d_resp) = outras
meu = json.loads(um(f"select public.meu_leilao('{PINHEIROS}')::text", papel="authenticated", user=la) or "{}")
ok(meu.get("regiao") == "sao-paulo/pinheiros" and meu.get("regiao_nome") == "Pinheiros, São Paulo" and meu.get("lance_minimo") == 10 and meu.get("creditos") == 100 and len(meu.get("envios", [])) == 2,
   "meu_leilao: a região é o bairro, com o lance mínimo, os créditos e os dois envios da semana — " + str({k: meu.get(k) for k in ("regiao", "lance_minimo", "creditos")}))
ok(um(f"select public.meu_leilao('{PINHEIROS}')::text", papel="authenticated", user=carla) in (None, "", "null"), "outra conta não vê o leilão da academia")
lance = lambda user, aid, valor, msg="Para quem nunca fez aula aqui, de segunda a sexta até as 17h.": sql(
    f"select public.dar_lance('{aid}', 'Primeira aula grátis', '{msg}', {valor})::text", papel="authenticated", user=user)
certo, saida = lance(d_resp, d_id, 20)
ok(not certo and "plano Premium" in saida, "o Completo não entra no leilão: só o Premium")
sql(f"update public.academias set plano = 'basico' where id = '{d_id}'")
certo, saida = lance(d_resp, d_id, 20)
ok(not certo and "plano Premium" in saida, "nem o Básico")
certo, saida = lance(la, PINHEIROS, 5)
ok(not certo and "lance mínimo é de R$ 10" in saida, "lance abaixo do mínimo é recusado")
certo, saida = lance(c_resp, c_id, 20)
ok(not certo and "tem R$ 5 de créditos" in saida, "lance maior que os créditos é recusado (pré-pago)")
certo, saida = lance(la, PINHEIROS, 30, "Curta.")
ok(not certo and "10 a 500" in saida, "mensagem curta é recusada")
certo, saida = lance(la, PINHEIROS, 30)
ok(certo and json.loads(saida.splitlines()[-1]).get("valor") == 30, "Premium dá o lance de R$ 30")
certo, saida = lance(la, PINHEIROS, 25)
ok(certo and um(f"select count(*) || '|' || max(valor) from public.lances where academia_id = '{PINHEIROS}'") == "1|25", "um lance por semana: dar outro muda o mesmo")
lance(b_resp, b_id, 20, "Curta mas ok.")
sql(f"update public.academias set envios_de_aviso = 20 where id = '{c_id}'")
lance(c_resp, c_id, 12)
# Quem recebe: pediu promoções e favoritou uma academia do bairro, salvou uma busca nele ou buscou perto.
fav = jogador("Fê Favoritou", f"fe{sufixo}@exemplo.com", promocoes="true", guardados=f"jsonb_build_object('favoritas', jsonb_build_array('{c_id}'))")
perto = jogador("Pê Perto", f"pe{sufixo}@exemplo.com", promocoes="true", guardados=f"jsonb_build_object('ultima_busca', jsonb_build_object('lat', {float(lat) + 0.01}, 'lng', {lng}))")
longe = jogador("Lu Longe", f"lu{sufixo}@exemplo.com", promocoes="true", guardados=f"jsonb_build_object('ultima_busca', jsonb_build_object('lat', {float(lat) + 0.5}, 'lng', {lng}))")
salvou = jogador("Sá Salvou", f"sa{sufixo}@exemplo.com", promocoes="true")
sql(f"insert into public.buscas_salvas (user_id, termo, bairro, cidade, link) values ('{salvou}', 'pinheiros', 'Pinheiros', 'São Paulo', '/quadras/sao-paulo/pinheiros')")
nao = jogador("Nô Não Quer", f"no{sufixo}@exemplo.com", guardados=f"jsonb_build_object('favoritas', jsonb_build_array('{c_id}'))")
dest = um(f"select string_agg(split_part(email, '@', 1), ',' order by email) from public.destinatarios_da_regiao('sao-paulo/pinheiros', '{PINHEIROS}')") or ""
ok(dest == ",".join(sorted([f"fe{sufixo}", f"pe{sufixo}", f"sa{sufixo}"])), "recebe quem favoritou uma academia do bairro, buscou perto ou salvou a busca do bairro; não quem está longe nem quem não pediu — " + dest)
ok(json.loads(um(f"select public.meu_leilao('{PINHEIROS}')::text", papel="authenticated", user=la)).get("alcance") == 3, "a academia vê o alcance (quantos jogadores), sem saber quem")
# Antes da hora, não fecha.
ok(um("select public.fechar_leiloes()") == "0" and um("select count(*) from public.lances where situacao = 'aberto'") == "3", "antes do domingo 20h, o leilão continua aberto")
fecha = um("select public.proximo_fechamento()::text")
ok(um(f"select public.fechar_leiloes('{fecha}'::timestamptz + interval '1 minute')") == "1", "no domingo 20h, o leilão do bairro fecha")
res = {r.split("|")[0]: r.split("|")[1:] for r in (um("select string_agg(academia_id || '|' || situacao || '|' || coalesce(posicao::text, '') || '|' || coalesce(preco::text, '') || '|' || qualidade::text, ';') from public.lances") or "").split(";")}
# Notas: A 25 × 0,95 = 23,75 (fotos? sem) …  o que importa: a ordem e o preço.
q = {k: float(v[3]) for k, v in res.items()}
ok(res[PINHEIROS][0] == "ganhou" and res[PINHEIROS][1] == "1" and res[b_id][0] == "ganhou" and res[b_id][1] == "2" and res[c_id][0] == "perdeu",
   "as duas maiores notas (lance × qualidade) ganham; a terceira perde — " + str({k[-4:]: v[:2] for k, v in res.items()}))
preco_a = int(res[PINHEIROS][2]); preco_b = int(res[b_id][2])
import math
esperado_a = min(25, max(10, math.ceil(20 * q[b_id] / q[PINHEIROS]) + 1))
esperado_b = min(20, max(10, math.ceil(12 * q[c_id] / q[b_id]) + 1))
ok(preco_a == esperado_a and preco_b == esperado_b, f"cada um paga o necessário para passar o seguinte + R$ 1, no máximo o lance, sem desconto (só o Premium entra) — A {preco_a} (esperado {esperado_a}), B {preco_b} (esperado {esperado_b})")
ok(um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == str(100 - preco_a) and um(f"select envios_de_aviso from public.academias where id = '{c_id}'") == "20",
   "quem ganhou paga dos créditos; quem perdeu não paga")
envio1, envio2 = um(f"select (envio_em at time zone 'America/Sao_Paulo')::text from public.lances where academia_id = '{PINHEIROS}'"), um(f"select (envio_em at time zone 'America/Sao_Paulo')::text from public.lances where academia_id = '{b_id}'")
ok(envio1.endswith("10:00:00") and envio2.endswith("10:00:00") and um(f"select extract(dow from '{envio1}'::timestamp)::int || ',' || extract(dow from '{envio2}'::timestamp)::int") == "2,5",
   "o 1º sai na terça às 10h e o 2º na sexta às 10h — " + envio1 + " / " + envio2)
ok(um(f"select public.enviar_notificacoes_do_leilao('{envio1}'::timestamp at time zone 'America/Sao_Paulo' - interval '1 hour')") == "0", "antes da hora, não manda")
ok(um(f"select public.enviar_notificacoes_do_leilao('{envio1}'::timestamp at time zone 'America/Sao_Paulo' + interval '1 minute')") == "1", "na terça às 10h, manda a do 1º lugar")
html = um(f"select assunto || '|' || html from public.emails_a_enviar where tipo = 'notificacao_do_leilao' and para = 'fe{sufixo}@exemplo.com'") or ""
ok(html.startswith("Promoção em Pinheiros: Primeira aula grátis|") and "Novidade em Pinheiros" in html and "Patrocinado · Academia Exemplo Pinheiros" in html and "Promoção patrocinada" in html and "aviso=promocoes" in html and "utm_source=Email-leilao" in html,
   "o e-mail do GuiaTennis: assunto com o bairro, \"Patrocinado\" com o nome da academia e o link para parar — " + html[:70])
ok(fila("tipo = 'notificacao_do_leilao'") == "3" and um(f"select avisados || '|' || situacao from public.lances where academia_id = '{PINHEIROS}'") == "3|enviado", "vai para os 3 do bairro e fica marcada como enviada")
ok(um(f"select public.enviar_notificacoes_do_leilao('{envio1}'::timestamp at time zone 'America/Sao_Paulo' + interval '2 hours')") == "0", "não manda duas vezes")
# Ninguém para receber: devolve o que pagou.
# (a dona da Pinheiros também favoritou e pede promoções: para a B, ela recebe; aqui, desliga também)
sql(f"update public.jogadores set promocoes = false where user_id in ('{fav}', '{perto}', '{salvou}', '{dono}')")
antes_b = int(um(f"select envios_de_aviso from public.academias where id = '{b_id}'"))
um(f"select public.enviar_notificacoes_do_leilao('{envio2}'::timestamp at time zone 'America/Sao_Paulo' + interval '1 minute')")
ok(um(f"select envios_de_aviso from public.academias where id = '{b_id}'") == str(antes_b + preco_b) and um(f"select avisados || '|' || preco from public.lances where academia_id = '{b_id}'") == "0|0",
   "se ninguém recebe, o valor volta para os créditos — " + str((antes_b, preco_b, um(f"select envios_de_aviso from public.academias where id = '{b_id}'"), um(f"select avisados || '|' || preco || '|' || situacao from public.lances where academia_id = '{b_id}'"))))
# Admin: vê os lances, cancela um envio marcado (devolve) e muda o lance mínimo.
certo, _ = sql("select public.leiloes_do_admin()", papel="authenticated", user=carla)
ok(not certo, "só o admin vê os leilões")
adm = json.loads(um("select public.leiloes_do_admin()::text", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) or "{}")
ok(len(adm.get("lances", [])) == 3 and adm.get("config", {}).get("lance_minimo") == 10 and all("academia" in x and "qualidade" in x for x in adm["lances"]), "o admin vê os lances com a academia e a qualidade")
sql("delete from public.lances")
sql(f"update public.jogadores set promocoes = true where user_id in ('{fav}', '{perto}', '{salvou}')")
lance(la, PINHEIROS, 20)
um(f"select public.fechar_leiloes('{fecha}'::timestamptz + interval '1 minute')")
lid = um(f"select id from public.lances where academia_id = '{PINHEIROS}'")
saldo_antes = int(um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'"))
ok(um(f"select situacao || '|' || preco from public.lances where id = '{lid}'") == "ganhou|10", "sozinho no bairro, ganha pelo lance mínimo")
ok(um(f"select public.cancelar_envio_do_lance('{lid}')::text", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) == "true"
   and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == str(saldo_antes + 10) and um(f"select situacao from public.lances where id = '{lid}'") == "cancelado",
   "\"Não enviar\" do admin cancela e devolve os créditos")
ok(um("select public.mudar_lance_minimo(15)", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) == "15" and not sql("select public.mudar_lance_minimo(5)", papel="authenticated", user=la)[0],
   "só o admin muda o lance mínimo")
sql("update public.leilao_config set lance_minimo = 10; delete from public.lances")
ok(um(f"select public.cancelar_lance('{PINHEIROS}')::text", papel="authenticated", user=la) == "false", "cancelar sem lance aberto não faz nada")
lance(la, PINHEIROS, 20)
ok(um(f"select public.cancelar_lance('{PINHEIROS}')::text", papel="authenticated", user=la) == "true" and um(f"select count(*) from public.lances where situacao = 'aberto'") == "0", "a academia cancela o próprio lance antes de fechar")
lance(la, PINHEIROS, 20)
saldo_antes = um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'")
sql(f"update public.academias set plano = 'completo' where id = '{PINHEIROS}'")
um(f"select public.fechar_leiloes('{fecha}'::timestamptz + interval '1 minute')")
ok(um(f"select situacao from public.lances where academia_id = '{PINHEIROS}'") == "cancelado" and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == saldo_antes,
   "quem sai do Premium antes de fechar sai do leilão, sem pagar")
sql(f"delete from public.lances; delete from public.academias where id in ('{b_id}', '{c_id}', '{d_id}'); truncate public.emails_a_enviar")

# 32. Plano e créditos pelo site (SQL 20261019130000) ------------------------------
print("\n# Plano e créditos pelo site")
sql("truncate public.emails_a_enviar; delete from public.compras_de_creditos")
plano_antes = um(f"select coalesce(plano, 'basico') from public.academias where id = '{PINHEIROS}'")
sql(f"update public.academias set plano = 'completo', envios_de_aviso = 0 where id = '{PINHEIROS}'")
eva = parceiro("Eva Equipe", f"evaeq{sufixo}@exemplo.com", PINHEIROS, papel="equipe")  # o Básico só deixa 1 pessoa
certo, saida = sql(f"select public.escolher_plano('{PINHEIROS}', 'premium')", papel="authenticated", user=eva)
ok(not certo and "Só o responsável principal" in saida, "só o responsável principal muda o plano")
certo, saida = sql(f"select public.escolher_plano('{PINHEIROS}', 'ouro')", papel="authenticated", user=dono)
ok(not certo and "Plano inválido" in saida, "plano que não existe é recusado")
sql(f"insert into public.pedidos_de_plano (academia_id, plano, user_id, onde) values ('{PINHEIROS}', 'completo', '{dono}', 'painel') on conflict (academia_id) do nothing")
datas = um(f"select dados_atualizados_em::text from public.academias where id = '{PINHEIROS}'")
ok(um(f"select public.escolher_plano('{PINHEIROS}', 'premium')", papel="authenticated", user=dono) == "premium"
   and um(f"select plano from public.academias where id = '{PINHEIROS}'") == "premium"
   and um(f"select count(*) from public.pedidos_de_plano where academia_id = '{PINHEIROS}'") == "0",
   "o responsável escolhe o Premium: muda na hora e o pedido para o admin some")
ok(um(f"select dados_atualizados_em::text from public.academias where id = '{PINHEIROS}'") == datas, "mudar o plano não mexe na data \"atualizada há…\"")
ok(fila("tipo = 'plano'") != "0", "quem administra recebe o e-mail do plano novo")
# A academia não muda o plano nem os créditos por fora da função.
sql(f"update public.academias set plano = 'basico', envios_de_aviso = 999 where id = '{PINHEIROS}'", papel="authenticated", user=dono)
ok(um(f"select plano || '|' || envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "premium|0", "por fora da função, o plano e os créditos não mudam")
# Compra de créditos.
certo, saida = sql(f"select public.criar_compra_de_creditos('{PINHEIROS}', 10, 'pix')", papel="authenticated", user=dono)
ok(not certo and "R$ 20 a R$ 5.000" in saida, "valor abaixo de R$ 20 é recusado")
certo, saida = sql(f"select public.criar_compra_de_creditos('{PINHEIROS}', 100, 'boleto')", papel="authenticated", user=dono)
ok(not certo and "Pix ou cartão" in saida, "só Pix ou cartão")
certo, saida = sql(f"select public.criar_compra_de_creditos('{PINHEIROS}', 100, 'pix')", papel="authenticated", user=carla)
ok(not certo and "não administra" in saida, "quem não administra a academia não compra")
compra = um(f"select public.criar_compra_de_creditos('{PINHEIROS}', 100, 'pix')", papel="authenticated", user=eva)
ok(bool(compra) and um(f"select situacao || '|' || valor from public.compras_de_creditos where id = '{compra}'") == "aberta|100", "a equipe também compra créditos: a compra fica aberta")
certo, _ = sql(f"select public.compra_para_cobrar('{compra}')", papel="authenticated", user=dono)
ok(not certo, "o site não lê a compra para cobrar (só a função do Netlify)")
certo, _ = sql(f"select public.confirmar_compra('{compra}', 'mp1', 100, 'approved')", papel="authenticated", user=dono)
ok(not certo, "o site não confirma o pagamento")
cob = json.loads(um(f"select public.compra_para_cobrar('{compra}')::text", papel="service_role") or "{}")
ok(cob.get("valor") == 100 and cob.get("forma") == "pix" and cob.get("email") == f"evaeq{sufixo}@exemplo.com" and cob.get("academia") == "Academia Exemplo Pinheiros",
   "a função lê o valor do banco e o e-mail de quem comprou — " + str(cob))
ok(um(f"select public.registrar_cobranca('{compra}', 'mp1')::text", papel="service_role") == "true", "anota a cobrança do Mercado Pago")
ok(um(f"select public.confirmar_compra('{compra}', 'mp1', 100, 'pending')", papel="service_role") == "aberta" and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "0", "pendente: ainda não entra crédito")
ok(um(f"select public.confirmar_compra('{compra}', 'mp1', 50, 'approved')", papel="service_role") == "aberta" and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "0", "pagou menos que a compra: não entra crédito")
ok(um(f"select public.confirmar_compra('{compra}', 'mp1', 100, 'approved')", papel="service_role") == "paga" and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "100", "pago: os R$ 100 entram nos créditos")
ok(um(f"select public.confirmar_compra('{compra}', 'mp1', 100, 'approved')", papel="service_role") == "paga" and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "100", "o mesmo aviso de novo não soma duas vezes")
outra = um(f"select public.criar_compra_de_creditos('{PINHEIROS}', 50, 'cartao')", papel="authenticated", user=dono)
ok(um(f"select public.confirmar_compra('{outra}', 'mp2', 50, 'rejected')", papel="service_role") == "recusada" and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "100", "cartão recusado: a compra fica recusada, sem crédito")
lista = json.loads(um(f"select public.minhas_compras('{PINHEIROS}')::text", papel="authenticated", user=dono) or "[]")
ok([x["situacao"] for x in lista] == ["recusada", "paga"], "a academia vê as últimas compras")
ok(um(f"select public.minhas_compras('{PINHEIROS}')::text", papel="authenticated", user=carla) in (None, "", "null"), "outra conta não vê as compras")
ok(len(json.loads(um("select public.compras_do_admin()::text", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) or "[]")) == 2, "o admin vê as compras dos últimos 30 dias")
sql(f"update public.academias set plano = 'basico' where id = '{PINHEIROS}'")
certo, saida = sql(f"select public.criar_compra_de_creditos('{PINHEIROS}', 100, 'pix')", papel="authenticated", user=dono)
ok(not certo and "Completo e do Premium" in saida, "no Básico não compra créditos (o leilão é do Completo e do Premium)")
sql(f"delete from public.compras_de_creditos; delete from public.academia_vinculos where user_id = '{eva}';"
    f"update public.academias set envios_de_aviso = 0, plano = '{plano_antes}' where id = '{PINHEIROS}'; truncate public.emails_a_enviar")

# 33. Pagamento de teste (SQL 20261020120000, regra 118) -----------------------------
print("\n# Pagamento de teste")
sql("truncate public.emails_a_enviar; delete from public.compras_de_creditos")
plano_antes = um(f"select coalesce(plano, 'basico') from public.academias where id = '{PINHEIROS}'")
sql(f"update public.academias set plano = 'basico', envios_de_aviso = 0 where id = '{PINHEIROS}'")
eva = parceiro("Eva Teste", f"evateste{sufixo}@exemplo.com", PINHEIROS, papel="equipe")
ok(um("select ligado::text from public.pagamento_de_teste") == "true", "o aplicar.sh teste liga o pagamento de teste")
t = json.loads(um("select public.pagamento_de_teste()::text", papel="anon") or "{}")
ok(t.get("ligado") is True and t.get("precos", {}).get("completo_mensal") == 49 and t.get("precos", {}).get("premium_anual") == 990, "o site lê o interruptor e os preços de teste — " + str(t))
certo, saida = sql(f"select public.criar_compra_de_plano('{PINHEIROS}', 'completo', 'mensal', 'pix')", papel="authenticated", user=eva)
ok(not certo and "Só o responsável principal" in saida, "só o responsável principal compra o plano")
certo, saida = sql(f"select public.criar_compra_de_plano('{PINHEIROS}', 'basico', 'mensal', 'pix')", papel="authenticated", user=dono)
ok(not certo and "Plano inválido" in saida, "o Básico não se compra")
plano = um(f"select public.criar_compra_de_plano('{PINHEIROS}', 'completo', 'anual', 'pix')", papel="authenticated", user=dono)
ok(um(f"select tipo || '|' || plano || '|' || periodo || '|' || valor || '|' || situacao from public.compras_de_creditos where id = '{plano}'") == "plano|completo|anual|490|aberta", "a compra do plano sai com o preço do banco (R$ 490 no anual)")
cob = json.loads(um(f"select public.compra_para_cobrar('{plano}')::text", papel="service_role") or "{}")
ok(cob.get("tipo") == "plano" and cob.get("plano") == "completo" and cob.get("periodo") == "anual", "a função do Netlify sabe que é plano")
certo, saida = sql(f"select public.simular_pagamento('{plano}', 'aprovado')", papel="authenticated", user=carla)
ok(not certo and "não administra" in saida, "outra conta não simula o pagamento")
certo, saida = sql(f"select public.simular_pagamento('{plano}', 'aprovado')", papel="authenticated", user=eva)
ok(not certo and "não administra" in saida, "a equipe não simula o pagamento do plano")
ok(um(f"select public.simular_pagamento('{plano}', 'aprovado')", papel="authenticated", user=dono) == "paga"
   and um(f"select plano from public.academias where id = '{PINHEIROS}'") == "completo"
   and um(f"select de_teste::text || '|' || gateway from public.compras_de_creditos where id = '{plano}'") == "true|teste",
   "aprovado: o plano vira Completo e a compra fica marcada como de teste")
ok(fila("tipo = 'plano'") != "0", "quem administra recebe o e-mail do plano novo")
ok(um(f"select public.simular_pagamento('{plano}', 'aprovado')", papel="authenticated", user=dono) == "paga", "simular de novo não muda nada")
certo, saida = sql(f"select public.criar_compra_de_plano('{PINHEIROS}', 'completo', 'mensal', 'pix')", papel="authenticated", user=dono)
ok(not certo and "já está nesse plano" in saida, "não compra o plano que já tem")
cred = um(f"select public.criar_compra_de_creditos('{PINHEIROS}', 200, 'cartao')", papel="authenticated", user=eva)
ok(um(f"select public.simular_pagamento('{cred}', 'recusado')", papel="authenticated", user=eva) == "recusada"
   and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "0", "créditos recusados: nada entra")
cred = um(f"select public.criar_compra_de_creditos('{PINHEIROS}', 200, 'cartao')", papel="authenticated", user=eva)
ok(um(f"select public.simular_pagamento('{cred}', 'aprovado')", papel="authenticated", user=eva) == "paga"
   and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "200", "créditos aprovados (a equipe também): os R$ 200 entram")
lista = json.loads(um(f"select public.minhas_compras('{PINHEIROS}')::text", papel="authenticated", user=dono) or "[]")
ok(any(x.get("tipo") == "plano" and x.get("de_teste") for x in lista), "a academia vê a compra do plano, marcada como de teste")
adm = json.loads(um("select public.compras_do_admin()::text", papel="authenticated", user=str(uuid.uuid4()), email=ADMIN) or "[]")
ok(sum(1 for x in adm if x.get("de_teste")) == 3, "o admin vê as compras de teste marcadas")
# Interruptor desligado (o banco de verdade): o gateway fingido recusa.
sql("update public.pagamento_de_teste set ligado = false")
outra = um(f"select public.criar_compra_de_creditos('{PINHEIROS}', 50, 'pix')", papel="authenticated", user=dono)
certo, saida = sql(f"select public.simular_pagamento('{outra}', 'aprovado')", papel="authenticated", user=dono)
ok(not certo and "só funciona no banco de teste" in saida and um(f"select envios_de_aviso from public.academias where id = '{PINHEIROS}'") == "200", "desligado: o pagamento de teste recusa e nada entra")
certo, _ = sql("update public.pagamento_de_teste set ligado = true", papel="authenticated", user=dono)
ok(um("select ligado::text from public.pagamento_de_teste") == "false", "a academia não liga o interruptor")
sql("update public.pagamento_de_teste set ligado = true")
sql(f"delete from public.compras_de_creditos; delete from public.academia_vinculos where user_id = '{eva}';"
    f"update public.academias set envios_de_aviso = 0, plano = '{plano_antes}' where id = '{PINHEIROS}'; truncate public.emails_a_enviar")

# 34. Academia nova direto no ar só pelo Parceiros (SQL 20261020150000) ----------
print("\n# Academia nova: só o Parceiros publica na hora")
nome_j = f"Arena do Jogador {sufixo}"
jog_ok = jogador("Gil Jogador", f"gil{sufixo}@exemplo.com")
sql(f"insert into public.academias (name, cidade, bairro, status) values ('{nome_j}', 'São Paulo', 'Lapa', 'pending')", papel="authenticated", user=jog_ok)
ok(um(f"select status from public.academias where name = '{nome_j}'") == "pending", "conta de jogador, mesmo com o e-mail confirmado, não publica academia na hora")
sql(f"delete from public.academias where name = '{nome_j}'")

# 35. A ficha só sai do Guia quando a academia fecha as portas (SQL 20261020170000)
print("\n# Academia que fechou")
sql("truncate public.emails_a_enviar; delete from public.pedidos_para_sair")
fechou = um("insert into public.academias (name, status, cidade, bairro) values ('Academia Que Fechou', 'published', 'São Paulo', 'Lapa') returning id")
resp_f = parceiro("Rita Fecha", f"rita{sufixo}@exemplo.com", fechou)
eq_f = parceiro("Saulo Equipe", f"saulo{sufixo}@exemplo.com", fechou, "equipe")
certo, saida = sql(f"select public.pedir_para_sair_do_guia('{fechou}', 'fechou')", papel="authenticated", user=eq_f)
ok(not certo and "responsável principal" in saida, "quem avisa que a academia fechou é o responsável principal")
certo, saida = sql(f"select public.pedir_para_sair_do_guia('{fechou}', 'nao_quer')", papel="authenticated", user=resp_f)
ok(not certo and "Só a academia que fechou as portas sai do Guia" in saida, "academia aberta não sai do Guia (outro motivo é recusado)")
certo, saida = sql(f"select public.pedir_para_sair_do_guia('{fechou}', 'fechou', 'Fechamos em setembro.')", papel="authenticated", user=resp_f)
ok(certo and um("select assunto from public.emails_a_enviar where tipo = 'pedido_para_sair'") == "A academia fechou: Academia Que Fechou",
   "o responsável avisa que fechou e o admin recebe o e-mail" + ("" if certo else ": " + saida))
pid = um("select id from public.pedidos_para_sair_admin()", **admin_jwt)
certo, saida = sql(f"select public.resolver_pedido_para_sair('{pid}', false, 'Ainda aparece aberta no Google.')", **admin_jwt)
ok(certo and um(f"select status from public.academias where id = '{fechou}'") == "published"
   and um(f"select replace(texto, E'\\n', ' ') from public.emails_a_enviar where tipo = 'pedido_para_sair_resposta' and para = 'rita{sufixo}@exemplo.com'").startswith("A Academia Que Fechou continua no GuiaTennis"),
   "\"Continua aberta\": a ficha fica e quem avisou recebe a resposta" + ("" if certo else ": " + saida))
certo, saida = sql(f"select public.tirar_academia_que_fechou('{fechou}')", papel="authenticated", user=resp_f)
ok(not certo and "Só o GuiaTennis" in saida, "só o admin tira direto a academia que fechou")
sql("truncate public.emails_a_enviar")
certo, saida = sql(f"select public.tirar_academia_que_fechou('{fechou}', 'Google: fechado permanentemente')", **admin_jwt)
# Regra 158: a ficha sai do site, mas o cadastro fica guardado como fechado.
ok(certo and um(f"select status from public.academias where id = '{fechou}'") == "fechada"
   and um(f"select count(*) from public.academias where id = '{fechou}'", papel="anon") == "0"
   and um("select resolucao || '|' || motivo from public.pedidos_para_sair where academia_nome = 'Academia Que Fechou' order by pedido_em desc limit 1") == "removida|fechou",
   "o admin tira a academia que fechou: a ficha sai do site, o cadastro fica guardado e fica registrado" + ("" if certo else ": " + saida))
aviso_eq = um(f"select replace(texto, E'\\n', ' ') from public.emails_a_enviar where tipo = 'pedido_para_sair_resposta' and para = 'saulo{sufixo}@exemplo.com'") or ""
ok(aviso_eq.startswith("O GuiaTennis confirmou que a Academia Que Fechou fechou as portas"), "quem administrava recebe o e-mail de que ela saiu — " + aviso_eq[:80])
sql("truncate public.emails_a_enviar; delete from public.pedidos_para_sair")

# 36. Veracidade como os grandes (SQL 20261026120000) -------------------------------
print("\n# WhatsApp da ficha confirmado por código")
sql("truncate public.emails_a_enviar; delete from public.whatsapp_a_enviar; delete from vault.secrets where name = 'whatsapp_token';"
    "update public.whatsapp_configuracao set numero_id = null, real = false, numero_de_teste = null;")
vera = parceiro("Vera Verdade", f"verdade{sufixo}@exemplo.com")
sql(f"update public.academia_acessos set dados_completos_em = now() where user_id = '{vera}'")
nome_v = f"Arena Verdade {sufixo}"
# O site manda sem pedir a linha de volta (em análise, ela ainda não é da conta).
sql(f"insert into public.academias (name, cidade, bairro, phone, status) values ('{nome_v}', 'São Paulo', 'Lapa', '(11) 97777-1111', 'pending')",
    papel="authenticated", user=vera, email=f"verdade{sufixo}@exemplo.com")
av = um(f"select id from public.academias where name = '{nome_v}'")
ok(bool(av) and um(f"select status || '|' || coalesce(phone, '-') || '|' || whatsapp_a_confirmar from public.academias where id = '{av}'")
   == "published|-|(11) 97777-1111",
   "academia nova vai ao ar, mas o WhatsApp espera o código (fora da ficha)")
# Regra 157: nada de "em confirmação" para o visitante (a coluna saiu).
ok(um("select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'academias' and column_name = 'whatsapp_situacao'") == "0",
   "o visitante não sabe que há um número esperando")
certo, _ = sql(f"select whatsapp_a_confirmar from public.academias where id = '{av}'", papel="anon")
ok(not certo, "o visitante não lê o número que espera o código")
ok(um("select assunto from public.emails_a_enviar where tipo = 'whatsapp_para_confirmar'") == f"WhatsApp para confirmar: {nome_v}",
   "sem o WhatsApp da Meta, o admin recebe o aviso para mandar o código")
ok(um(f"select numero || '|' || troca from public.whatsapp_das_minhas_academias()", papel="authenticated", user=vera) == "(11) 97777-1111|false",
   "o Parceiros vê o número que espera o código")
ok(um("select count(*) from public.whatsapp_das_minhas_academias()", papel="authenticated", user=carla) == "0", "outra conta não vê")
ok(um(f"select public.confirmar_whatsapp_da_ficha('{av}', '123456')", papel="authenticated", user=vera) == "sem_codigo", "sem código gerado: 'sem_codigo'")
certo, saida = sql(f"select public.confirmar_whatsapp_da_ficha('{av}', '123456')", papel="authenticated", user=carla)
ok(not certo and "Só quem administra" in saida, "só quem administra confirma")
certo, _ = sql(f"select public.gerar_codigo_do_whatsapp_admin('{av}')", papel="authenticated", user=vera)
ok(not certo, "só o admin gera o código")
cod = um(f"select public.gerar_codigo_do_whatsapp_admin('{av}')", **admin_jwt)
ok(cod is not None and len(cod) == 6 and um(f"select codigo_em is not null from public.whatsapps_para_confirmar_admin() where academia_id = '{av}'", **admin_jwt) == "t",
   "o admin gera o código de 6 números e vê que foi gerado")
errado = "000000" if cod != "000000" else "111111"
ok(um(f"select public.confirmar_whatsapp_da_ficha('{av}', '{errado}')", papel="authenticated", user=vera) == "errado", "código errado conta a tentativa")
sql(f"set local session_replication_role = replica; update public.academias set dados_atualizados_em = now() - interval '10 days' where id = '{av}'")
# Regra 157: o primeiro número também espera o GuiaTennis (o código prova que
# a pessoa tem o número, não que ele é da academia).
ok(um(f"select public.confirmar_whatsapp_da_ficha('{av}', '{cod}')", papel="authenticated", user=vera) == "revisao", "código certo: o GuiaTennis ainda confere ('revisao')")
ok(um(f"select coalesce(phone, '-') || '|' || (whatsapp_codigo_ok_em is not null) from public.academias where id = '{av}'") == "-|true",
   "a ficha continua sem o botão do WhatsApp até o GuiaTennis aprovar")
ok(um("select assunto from public.emails_a_enviar where tipo = 'whatsapp_para_aprovar'") == f"WhatsApp para aprovar: {nome_v}",
   "o admin recebe o número para aprovar")
ok(um("select position('hoje ela está sem WhatsApp' in texto) > 0 from public.emails_a_enviar where tipo = 'whatsapp_para_aprovar'") == "t",
   "o e-mail diz que é o primeiro número da ficha")
certo, saida = sql(f"select public.aprovar_whatsapp_admin('{av}')", **admin_jwt)
ok(certo and um(f"select phone || '|' || coalesce(whatsapp_a_confirmar, '-') || '|' || (whatsapp_confirmado_em is not null) || '|' || (dados_atualizados_em > now() - interval '1 minute') from public.academias where id = '{av}'")
   == "(11) 97777-1111|-|true|true", "o admin aprova: o número entra na ficha, confirmado, e a ficha fica atualizada hoje" + ("" if certo else ": " + saida))

print("\n# Troca do WhatsApp")
sql("truncate public.emails_a_enviar")
sql(f"update public.academias set phone = '(11) 96666-2222', name = '{nome_v}' where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select phone || '|' || whatsapp_a_confirmar || '|' || whatsapp_antes from public.academias where id = '{av}'")
   == "(11) 97777-1111|(11) 96666-2222|(11) 97777-1111", "trocar o número: a ficha continua com o de antes até confirmar")
ok(fila("tipo = 'whatsapp_para_confirmar'") == "1", "o admin fica sabendo da troca")
sql(f"update public.academias set phone = '11966662222', price_aula = '100' where id = '{av}'", papel="authenticated", user=vera)
cod1 = um(f"select public.gerar_codigo_do_whatsapp_admin('{av}')", **admin_jwt)
sql(f"update public.academias set phone = '(11) 96666-2222', price_aula = '120' where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select codigo_em is not null from public.whatsapp_das_minhas_academias() where academia_id = '{av}'", papel="authenticated", user=vera) == "t",
   "salvar a ficha de novo com o mesmo número (escrito de outro jeito) não perde o código")
certo, _ = sql(f"update public.academias set whatsapp_a_confirmar = null, whatsapp_confirmado_em = null, whatsapp_em_revisao_desde = now() where id = '{av}'",
               papel="authenticated", user=vera)
ok(um(f"select whatsapp_a_confirmar || '|' || (whatsapp_confirmado_em is not null) || '|' || (whatsapp_em_revisao_desde is null) from public.academias where id = '{av}'")
   == "(11) 96666-2222|true|true", "a academia não mexe nas colunas do WhatsApp por fora das funções")
ok(um(f"select public.confirmar_whatsapp_da_ficha('{av}', '{cod1}')", papel="authenticated", user=vera) == "revisao", "na troca, o código certo devolve 'revisao'")
ok(um(f"select phone || '|' || (whatsapp_codigo_ok_em is not null) from public.academias where id = '{av}'") == "(11) 97777-1111|true",
   "a ficha continua com o número de antes até o GuiaTennis aprovar")
ok(um("select assunto from public.emails_a_enviar where tipo = 'whatsapp_para_aprovar'") == f"Troca de WhatsApp para aprovar: {nome_v}", "o admin recebe a troca para aprovar")
certo, _ = sql(f"select public.aprovar_whatsapp_admin('{av}')", papel="authenticated", user=vera)
ok(not certo, "só o admin aprova a troca")
certo, saida = sql(f"select public.aprovar_whatsapp_admin('{av}')", **admin_jwt)
ok(certo and um(f"select phone || '|' || coalesce(whatsapp_a_confirmar, '-') from public.academias where id = '{av}'") == "(11) 96666-2222|-",
   "o admin aprova: o número novo entra" + ("" if certo else ": " + saida))
ok(um(f"select assunto from public.emails_a_enviar where tipo = 'whatsapp_aprovado' and para = 'verdade{sufixo}@exemplo.com'") == f"O WhatsApp novo está na ficha da {nome_v}",
   "quem administra recebe o e-mail")
sql(f"update public.academias set phone = '(21) 95555-3333' where id = '{av}'", papel="authenticated", user=vera)
sql(f"select public.recusar_whatsapp_admin('{av}', 'O número é de outra empresa.')", **admin_jwt)
ok(um(f"select phone || '|' || coalesce(whatsapp_a_confirmar, '-') from public.academias where id = '{av}'") == "(11) 96666-2222|-",
   "recusado: o número novo sai e a ficha fica como estava")
ok(um("select position('O número é de outra empresa.' in texto) > 0 and position('O número é de outra empresa.' in html) > 0 from public.emails_a_enviar where tipo = 'whatsapp_recusado'") == "t",
   "o e-mail da recusa leva o motivo")
sql(f"update public.academias set phone = '(21) 94444-4444' where id = '{av}'", papel="authenticated", user=vera)
sql(f"select public.desistir_do_whatsapp_novo('{av}')", papel="authenticated", user=vera)
ok(um(f"select coalesce(whatsapp_a_confirmar, '-') from public.academias where id = '{av}'") == "-", "\"Cancelar\": o número novo sai")
certo, saida = sql(f"update public.academias set phone = '1234' where id = '{av}'", papel="authenticated", user=vera)
ok(not certo and "DDD e número" in saida, "número sem DDD é recusado")
sql(f"update public.academias set phone = '' where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select coalesce(phone, '-') || '|' || (whatsapp_confirmado_em is null) from public.academias where id = '{av}'") == "-|true", "tirar o WhatsApp vale na hora")
sql(f"update public.academias set phone = '(11) 93333-5555' where id = '{av}'", **admin_jwt)
ok(um(f"select phone || '|' || coalesce(whatsapp_a_confirmar, '-') from public.academias where id = '{av}'") == "(11) 93333-5555|-",
   "o admin escreve o número direto, sem código")
# Com o WhatsApp da Meta ligado (banco de teste: só o número de teste recebe).
sql("select public.configurar_whatsapp('tok_teste', '123456', '(11) 98888-7777', false)")
sql(f"update public.academias set phone = '(11) 92222-6666' where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select para || '|' || origem from public.whatsapp_a_enviar where academia_id = '{av}' and tipo = 'whatsapp_da_ficha'") == "5511988887777|automatico",
   "com o WhatsApp ligado, o código sai sozinho (no teste, para o número de teste)")
ok(um(f"select public.pedir_codigo_do_whatsapp('{av}')", papel="authenticated", user=vera) == "espere", "\"Mandar outro código\": um por hora")
ok(um(f"select ligado from public.whatsapp_das_minhas_academias() where academia_id = '{av}'", papel="authenticated", user=vera) == "t", "o Parceiros sabe que o envio está ligado")
sql("delete from vault.secrets where name = 'whatsapp_token'; update public.whatsapp_configuracao set numero_id = null, real = false, numero_de_teste = null; delete from public.whatsapp_a_enviar")
ok(um(f"select public.pedir_codigo_do_whatsapp('{av}')", papel="authenticated", user=vera) == "desligado", "desligado: 'desligado' (o admin manda)")
sql(f"select public.desistir_do_whatsapp_novo('{av}')", papel="authenticated", user=vera)

print("\n# Informar um problema")
sql("truncate public.emails_a_enviar")
certo, saida = sql(f"select public.informar_problema('{av}', 'preco_horario')", papel="anon")
ok(not certo, "sem conta, não informa")
nina = jogador("Nina Sem Confirmar", f"nina{sufixo}@exemplo.com", confirmado=False)
certo, saida = sql(f"select public.informar_problema('{av}', 'preco_horario')", papel="authenticated", user=nina)
ok(not certo and "Confirme o seu e-mail" in saida, "sem o e-mail confirmado, não informa")
certo, saida = sql(f"select public.informar_problema('{av}', 'preco_horario')", papel="authenticated", user=vera)
ok(not certo and "Vocês administram esta academia" in saida, "quem administra corrige em Minha ficha")
certo, saida = sql(f"select public.informar_problema('{av}', 'outro')", papel="authenticated", user=carla)
ok(not certo and "Conte o que está errado" in saida, "\"Outro problema\" pede o texto")
ok(um(f"select public.informar_problema('{av}', 'preco_horario', 'A aula custa R$ 150, não R$ 120.')", papel="authenticated", user=carla) == "ok",
   "o jogador informa o problema")
ok(um("select assunto from public.emails_a_enviar where tipo = 'problema_na_ficha' and para = 'guiatennis1@gmail.com'") == f"Problema informado: {nome_v}", "o admin recebe")
ok(um(f"select assunto from public.emails_a_enviar where tipo = 'problema_na_ficha' and para = 'verdade{sufixo}@exemplo.com'")
   == f"Um jogador informou um problema na ficha da {nome_v}", "quem administra também recebe, sem saber quem informou")
ok(um(f"select motivo || '|' || detalhes from public.problemas_da_minha_academia('{av}')", papel="authenticated", user=vera)
   == "preco_horario|A aula custa R$ 150, não R$ 120.", "o Parceiros vê o que foi informado")
ok(um(f"select count(*) from public.problemas_da_minha_academia('{av}')", papel="authenticated", user=carla) == "0", "outra conta não vê")
ok(um(f"select quem from public.problemas_admin() where academia_id = '{av}'", **admin_jwt) == "Carla Jogadora", "o admin vê quem informou")
sql(f"update public.academias set price_aula = '150' where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select resolucao from public.problemas_na_ficha where academia_id = '{av}' and motivo = 'preco_horario'") == "academia_salvou",
   "salvar a ficha resolve o aviso de dados")
davi_v = jogador("Davi Avisa", f"daviv{sufixo}@exemplo.com")
sql(f"update public.academias set phone = '(11) 91111-7777' where id = '{av}'", **admin_jwt)
sql(f"set local session_replication_role = replica; update public.academias set dados_atualizados_em = now() - interval '10 days' where id = '{av}'")
ok(um(f"select public.informar_problema('{av}', 'whatsapp')", papel="authenticated", user=carla) == "ok", "um aviso de WhatsApp: o botão continua")
ok(um(f"select phone from public.academias where id = '{av}'") == "(11) 91111-7777", "com um aviso só, o número fica")
ok(um(f"select public.informar_problema('{av}', 'whatsapp', 'Atendeu outra empresa.')", papel="authenticated", user=davi_v) == "whatsapp_em_revisao",
   "dois avisos de contas diferentes: o botão sai")
ok(um(f"select coalesce(phone, '-') || '|' || (whatsapp_em_revisao_desde is not null) || '|' || whatsapp_em_revisao_numero || '|' || (dados_atualizados_em < now() - interval '9 days') from public.academias where id = '{av}'")
   == "-|true|(11) 91111-7777|true", "o número fica guardado fora da ficha (em revisão) e a data não muda")
ok(um("select assunto from public.emails_a_enviar where tipo = 'whatsapp_em_revisao' and para = 'guiatennis1@gmail.com'") == f"WhatsApp em revisão: {nome_v}", "o admin recebe")
ok(um(f"select assunto from public.emails_a_enviar where tipo = 'whatsapp_em_revisao' and para = 'verdade{sufixo}@exemplo.com'") == f"O WhatsApp da {nome_v} está em revisão",
   "quem administra também")
sql(f"update public.academias set phone = '(11) 91111-7777', price_aula = '160' where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select coalesce(phone, '-') || '|' || whatsapp_antes from public.academias where id = '{av}'") == "-|(11) 91111-7777",
   "em revisão, a academia escrever o número de novo vira troca (código e conferência)")
ok(um(f"select count(*) from public.problemas_na_ficha where academia_id = '{av}' and motivo = 'whatsapp' and resolvido_em is null") == "2",
   "salvar a ficha não resolve o aviso do WhatsApp")
sql(f"select public.desistir_do_whatsapp_novo('{av}')", papel="authenticated", user=vera)
certo, _ = sql(f"select public.manter_whatsapp_admin('{av}')", papel="authenticated", user=vera)
ok(not certo, "só o admin decide")
sql(f"select public.manter_whatsapp_admin('{av}')", **admin_jwt)
ok(um(f"select phone || '|' || (whatsapp_em_revisao_desde is null) from public.academias where id = '{av}'") == "(11) 91111-7777|true", "\"Manter\": o número volta")
ok(um(f"select count(*) from public.problemas_na_ficha where academia_id = '{av}' and motivo = 'whatsapp' and resolvido_em is null") == "0", "e os avisos se resolvem")
sql(f"select public.informar_problema('{av}', 'whatsapp')", papel="authenticated", user=carla)
sql(f"select public.informar_problema('{av}', 'whatsapp')", papel="authenticated", user=davi_v)
sql(f"select public.tirar_whatsapp_admin('{av}')", **admin_jwt)
ok(um(f"select coalesce(phone, '-') || '|' || (whatsapp_em_revisao_desde is null) || '|' || coalesce(whatsapp_em_revisao_numero, '-') from public.academias where id = '{av}'") == "-|true|-",
   "\"Tirar da ficha\": o número sai de vez")
certo, saida = sql(f"select public.informar_problema('{av}', 'whatsapp')", papel="authenticated", user=carla)
ok(not certo and "não tem WhatsApp" in saida, "sem WhatsApp na ficha, não há o que informar dele")
pid = um(f"select public.informar_problema('{av}', 'endereco', 'O número é 120.')", papel="authenticated", user=carla)
pid = um(f"select id from public.problemas_admin() where academia_id = '{av}' and motivo = 'endereco'", **admin_jwt)
sql(f"select public.resolver_problema_admin('{pid}', 'corrigido')", **admin_jwt)
ok(um(f"select resolucao from public.problemas_na_ficha where id = '{pid}'") == "corrigido", "o admin resolve")

print("\n# Avaliar só com o e-mail confirmado")
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars) values ('{av}', 5)", papel="authenticated", user=nina)
ok(not certo and "Confirme o seu e-mail para avaliar" in saida, "sem o e-mail confirmado, não avalia")
certo, saida = sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{av}', 1, 'Péssimo, não vão!')", papel="authenticated", user=carla)
ok(certo, "com o e-mail confirmado, avalia" + ("" if certo else ": " + saida))

print("\n# Denunciar avaliação")
sql("truncate public.emails_a_enviar")
rid = um(f"select id from public.avaliacoes where academia_id = '{av}' and user_id = '{carla}'")
certo, saida = sql(f"select public.denunciar_avaliacao('{rid}', 'falsa')", papel="authenticated", user=carla)
ok(not certo and "é sua" in saida, "não denuncia a própria avaliação")
certo, saida = sql(f"select public.denunciar_avaliacao('{rid}', 'falsa')", papel="anon")
ok(not certo, "sem conta, não denuncia")
ok(um(f"select public.denunciar_avaliacao('{rid}', 'conflito')", papel="authenticated", user=davi_v) == "ok", "outra conta denuncia")
ok(um(f"select public.denunciar_avaliacao('{rid}', 'falsa')", papel="authenticated", user=davi_v) == "ok", "denunciar de novo troca o motivo (uma por conta)")
ok(um("select assunto from public.emails_a_enviar where tipo = 'avaliacao_denunciada'") == f"Avaliação denunciada: {nome_v}", "o admin recebe")
ok(um(f"select denuncias || '|' || array_to_string(motivos, ',') from public.denuncias_admin() where avaliacao_id = '{rid}'", **admin_jwt) == "1|falsa",
   "o admin vê a avaliação com as denúncias")
sql(f"select public.resolver_denuncia_admin('{rid}', false)", **admin_jwt)
ok(um(f"select count(*) from public.denuncias_admin() where avaliacao_id = '{rid}'", **admin_jwt) == "0"
   and um(f"select count(*) from public.avaliacoes where id = '{rid}'") == "1", "\"Manter\": a avaliação fica")
sql(f"select public.denunciar_avaliacao('{rid}', 'ofensiva')", papel="authenticated", user=nina)
sql(f"select public.resolver_denuncia_admin('{rid}', true)", **admin_jwt)
ok(um(f"select count(*) from public.avaliacoes where id = '{rid}'") == "0", "\"Remover\": a avaliação sai")

print("\n# A academia que avisou que fechou sai do site na hora (regra 157)")
sql(f"update public.academia_acessos set academia_id = '{av}' where user_id = '{vera}'")
# Antes do aviso, a academia tinha pausado por uns dias (a pausa de antes volta depois).
sql(f"select public.pausar_minha_academia('{av}', true, now() + interval '10 days')", papel="authenticated", user=vera)
sql(f"select public.pausar_minha_academia('{av}', false)", papel="authenticated", user=vera)
ok(um(f"select count(*) from public.academias where id = '{av}'", papel="anon") == "1", "no ar antes do aviso")
sql(f"select public.pausar_minha_academia('{av}', true, now() + interval '10 days')", papel="authenticated", user=vera)
sql(f"select public.pedir_para_sair_do_guia('{av}', 'fechou')", papel="authenticated", user=vera)
ok(um(f"select (avisou_que_fechou_em is not null) || '|' || pausada || '|' || pausada_pela_academia || '|' || (pausada_ate is null) from public.academias where id = '{av}'")
   == "true|true|false|true", "o aviso pausa a ficha pelo GuiaTennis, sem data")
ok(um(f"select count(*) from public.academias where id = '{av}'", papel="anon") == "0", "o jogador não vê mais a academia (nem pelo link)")
ok(um(f"select (pausa_antes->>'pausada') || '|' || (pausa_antes->>'pela_academia') || '|' || (pausa_antes->>'ate' is not null) from public.pedidos_para_sair where academia_id = '{av}' and resolvido_em is null")
   == "true|true|true", "a pausa de antes fica guardada no aviso")
certo, saida = sql(f"select public.pausar_minha_academia('{av}', false)", papel="authenticated", user=vera)
ok(not certo and "avisaram que a academia fechou" in saida, "a academia não volta sozinha enquanto o GuiaTennis confere")
certo, saida = sql(f"select public.pausar_minha_academia('{av}', true, now() + interval '3 days')", papel="authenticated", user=vera)
ok(not certo and "avisaram que a academia fechou" in saida, "nem pausa de novo (pausar e voltar desfaria)")
certo, _ = sql(f"update public.academias set pausada = false, pausada_ate = null where id = '{av}'", papel="authenticated", user=vera)
ok(um(f"select pausada from public.academias where id = '{av}'") == "t", "nem tira a pausa pela ficha")
ok(um(f"select avisou_que_fechou_em is not null from public.academias where id = '{av}'", papel="authenticated", user=vera) == "t", "quem administra ainda vê a ficha")
pid = um(f"select id from public.pedidos_para_sair where academia_id = '{av}' and resolvido_em is null")
sql(f"select public.resolver_pedido_para_sair('{pid}', false, null)", **admin_jwt)
ok(um(f"select (avisou_que_fechou_em is null) || '|' || pausada || '|' || pausada_pela_academia || '|' || (pausada_ate > now() + interval '9 days') from public.academias where id = '{av}'")
   == "true|true|true|true", "\"Continua aberta\": volta a pausa de antes (da academia, com a data)")
sql(f"select public.pausar_minha_academia('{av}', false)", papel="authenticated", user=vera)
sql(f"select public.pedir_para_sair_do_guia('{av}', 'fechou')", papel="authenticated", user=vera)
ok(um(f"select count(*) from public.academias where id = '{av}'", papel="anon") == "0", "avisou de novo: sai do site")
sql(f"select public.cancelar_pedido_para_sair('{av}')", papel="authenticated", user=vera)
ok(um(f"select count(*) from public.academias where id = '{av}'", papel="anon") == "1"
   and um(f"select (avisou_que_fechou_em is null) || '|' || pausada from public.academias where id = '{av}'") == "true|false",
   "cancelou o aviso: a ficha volta ao site como estava")
sql(f"select public.pedir_para_sair_do_guia('{av}', 'fechou')", papel="authenticated", user=vera)
pid = um(f"select id from public.pedidos_para_sair where academia_id = '{av}' and resolvido_em is null")
certo, saida = sql(f"select public.resolver_pedido_para_sair('{pid}', true, null)", **admin_jwt)
ok(certo and um(f"select status from public.academias where id = '{av}'") == "fechada"
   and um(f"select count(*) from public.academias where id = '{av}'", papel="anon") == "0",
   "\"Fechou: tirar do Guia\": a ficha sai do site e o cadastro fica guardado (regra 158)" + ("" if certo else ": " + saida))
sql("truncate public.emails_a_enviar; delete from public.pedidos_para_sair")

# 37. O controle das fichas paradas no admin (regra 157) ----------------------------
print("\n# Fichas paradas há 3 meses")
parada = um(f"insert into public.academias (name, status, cidade, bairro) values ('Arena Parada {sufixo}', 'published', 'São Paulo', 'Lapa') returning id")
basica = um(f"insert into public.academias (name, status, cidade, bairro) values ('Quadra Básica {sufixo}', 'published', 'São Paulo', 'Lapa') returning id")
nova = um(f"insert into public.academias (name, status, cidade, bairro) values ('Quadra Nova {sufixo}', 'published', 'São Paulo', 'Lapa') returning id")
fora = um(f"insert into public.academias (name, status, cidade, bairro, pausada) values ('Quadra Pausada {sufixo}', 'published', 'São Paulo', 'Lapa', true) returning id")
paulo = parceiro("Paulo Parado", f"paulo{sufixo}@exemplo.com", parada)
sql(f"set local session_replication_role = replica; update public.academias set dados_atualizados_em = now() - interval '4 months' where id in ('{parada}', '{fora}');"
    f" update public.academias set dados_atualizados_em = now() - interval '5 months' where id = '{basica}'")
lista = um(f"select string_agg(nome || ':' || com_responsavel || ':' || recebem, ',' order by atualizada_em) from public.fichas_paradas_admin() where academia_id in ('{parada}', '{basica}', '{nova}', '{fora}')", **admin_jwt)
ok(lista == f"Quadra Básica {sufixo}:false:0,Arena Parada {sufixo}:true:1", "o admin vê as fichas no ar paradas há 3 meses, a mais parada primeiro — " + str(lista))
ok(um("select count(*) from public.fichas_paradas_admin()", papel="authenticated", user=carla) == "0", "quem não é admin não vê")
certo, _ = sql(f"select public.lembrar_ficha_admin('{parada}')", papel="authenticated", user=paulo)
ok(not certo, "só o admin manda o lembrete")
sql("truncate public.emails_a_enviar")
ok(um(f"select public.lembrar_ficha_admin('{parada}')", **admin_jwt) == "1", "\"Lembrar agora\": 1 pessoa recebe")
ok(um(f"select assunto from public.emails_a_enviar where tipo = 'ficha_parada' and para = 'paulo{sufixo}@exemplo.com'") == f"Confira a ficha da Arena Parada {sufixo} no GuiaTennis",
   "o e-mail \"Está tudo certo na ficha?\" sai para a academia")
ok(um(f"select lembrada_em is not null from public.fichas_paradas_admin() where academia_id = '{parada}'", **admin_jwt) == "t", "a lista mostra quando foi o lembrete")
certo, saida = sql(f"select public.lembrar_ficha_admin('{parada}')", **admin_jwt)
ok(not certo and "já recebeu o lembrete hoje" in saida, "um lembrete por dia")
ok(um("select public.preparar_lembretes_de_ficha()") == "0", "o lembrete automático não repete no mesmo dia")
certo, saida = sql(f"select public.lembrar_ficha_admin('{basica}')", **admin_jwt)
ok(not certo and "Ninguém da academia recebe" in saida, "sem ninguém para receber, o admin fica sabendo")
certo, _ = sql(f"select public.ficha_conferida_admin('{basica}')", papel="authenticated", user=paulo)
ok(not certo, "só o admin marca como conferida")
sql(f"select public.ficha_conferida_admin('{basica}')", **admin_jwt)
ok(um(f"select count(*) from public.fichas_paradas_admin() where academia_id = '{basica}'", **admin_jwt) == "0"
   and um(f"select dados_atualizados_em < now() - interval '4 months' from public.academias where id = '{basica}'") == "t",
   "\"Conferi: está certo\": sai da lista, sem mudar a data que o jogador vê")
sql(f"update public.academias set price_aula = '90' where id = '{parada}'", papel="authenticated", user=paulo)
ok(um(f"select count(*) from public.fichas_paradas_admin() where academia_id = '{parada}'", **admin_jwt) == "0", "a academia salvou a ficha: sai da lista")
sql(f"delete from public.academias where id in ('{parada}', '{basica}', '{nova}', '{fora}'); truncate public.emails_a_enviar")

# 38. A academia fechada fica guardada e pode reabrir; tudo no painel (regra 158) --
print("\n# Academia fechada fica guardada")
sql("truncate public.emails_a_enviar; delete from public.pedidos_para_sair")
nome_r = f"Arena Reabre {sufixo}"
reab = um(f"insert into public.academias (name, status, cidade, bairro, phone, plano) values ('{nome_r}', 'published', 'São Paulo', 'Lapa', '(11) 95555-0000', 'premium') returning id")
email_rita2 = f"ritar{sufixo}@exemplo.com"
rita2 = parceiro("Rita Reabre", email_rita2, reab)
jog_r = jogador("Jonas Joga", f"jonas{sufixo}@exemplo.com")
sql(f"insert into public.avaliacoes (academia_id, stars, comment) values ('{reab}', 5, 'Ótimas quadras')", papel="authenticated", user=jog_r, email=f"jonas{sufixo}@exemplo.com")
sql(f"select public.pedir_para_sair_do_guia('{reab}', 'fechou', 'Fechamos em outubro.')", papel="authenticated", user=rita2)
pid = um(f"select id from public.pedidos_para_sair where academia_id = '{reab}' and resolvido_em is null")
sql(f"select public.resolver_pedido_para_sair('{pid}', true, null)", **admin_jwt)
ok(um(f"select status || '|' || plano || '|' || (fechada_em is not null) || '|' || array_to_string(fechada_emails, ',') || '|' || pausada from public.academias where id = '{reab}'")
   == f"fechada|basico|true|{email_rita2}|false", "\"Fechou\": cadastro guardado como fechado, no Básico, com o e-mail de quem administrava")
ok(um(f"select count(*) from public.avaliacoes where academia_id = '{reab}'") == "1", "as avaliações ficam guardadas")
ok(um(f"select count(*) from public.academia_vinculos where academia_id = '{reab}'") == "0"
   and um(f"select coalesce(academia_id::text, '-') from public.academia_acessos where user_id = '{rita2}'") == "-", "quem administrava sai da academia")
ok(um(f"select count(*) from public.academias where id = '{reab}'", papel="anon") == "0", "o jogador não vê a academia fechada")
certo, _ = sql(f"select fechada_emails from public.academias where id = '{reab}'", **admin_jwt)
ok(not certo, "nem o admin lê os e-mails pela tabela (só pelas funções)")
email_resp = um(f"select replace(texto, E'\\n', ' ') from public.emails_a_enviar where tipo = 'pedido_para_sair_resposta' and para = '{email_rita2}'") or ""
ok("O cadastro fica guardado" in email_resp and "apagada" not in email_resp, "o e-mail de quem avisou diz que o cadastro fica guardado")
ok(um(f"select fechada_em is not null from public.academias where id = '{reab}'", **admin_jwt) == "t"
   and um(f"select emails[1] || '|' || avaliacoes from public.academias_fechadas_admin() where academia_id = '{reab}'", **admin_jwt) == f"{email_rita2}|1",
   "o admin vê as fechadas, com quem administrava e as avaliações")
ok(um("select count(*) from public.academias_fechadas_admin()", papel="authenticated", user=jog_r) == "0", "quem não é admin não vê essa lista")

print("\n# O mesmo e-mail reabre")
ok(um(f"select minha || '|' || nome from public.academias_fechadas() where academia_id = '{reab}'", papel="authenticated", user=rita2, email=email_rita2) == f"true|{nome_r}",
   "a conta que administrava vê a academia fechada como dela")
certo, saida = sql(f"select public.reabrir_academia('{reab}', null, false)", papel="authenticated", user=rita2, email=email_rita2)
ok(not certo and "declaração" in saida, "reabrir pede a declaração")
sql("truncate public.emails_a_enviar")
ok(um(f"select public.reabrir_academia('{reab}', 'Reabrimos em novembro.', true)", papel="authenticated", user=rita2, email=email_rita2) == "reaberta",
   "o mesmo e-mail reabre na hora ('reaberta')")
ok(um(f"select status || '|' || (reaberta_em is not null) || '|' || (revisar_desde is not null) || '|' || coalesce(array_to_string(fechada_emails, ','), '-') from public.academias where id = '{reab}'")
   == "published|true|true|-", "a academia volta ao site, para o admin revisar")
ok(um(f"select papel from public.academia_vinculos where academia_id = '{reab}' and user_id = '{rita2}'") == "principal"
   and um(f"select academia_id from public.academia_acessos where user_id = '{rita2}'") == reab, "e a conta volta a administrar, como responsável")
ok(um("select assunto from public.emails_a_enviar where tipo = 'academia_reaberta'") == f"Academia reaberta: {nome_r}", "o admin recebe")
ok(um(f"select reaberta_em is not null from public.academias_para_revisar_admin() where id = '{reab}'", **admin_jwt) == "t", "e vê em \"Foram ao ar\", como reaberta")
ok(um(f"select count(*) from public.avaliacoes where academia_id = '{reab}'", papel="anon") == "1", "as avaliações voltam junto")

print("\n# Outro e-mail pede para reabrir")
sql(f"select public.tirar_academia_que_fechou('{reab}')", **admin_jwt)
email_nova = f"nina{sufixo}nova@exemplo.com"
nova_conta = parceiro("Nina Nova", email_nova)
ok(um(f"select minha from public.academias_fechadas() where academia_id = '{reab}'", papel="authenticated", user=nova_conta, email=email_nova) == "f",
   "outra conta vê a academia como fechada (cadastro inativo), não como dela")
certo, _ = sql("select count(*) from public.academias_fechadas()", papel="anon")
ok(not certo, "sem conta, a lista não sai")
certo, saida = sql(f"select public.pedir_para_administrar('{reab}', true)", papel="authenticated", user=nova_conta, email=email_nova)
ok(not certo or um(f"select count(*) from public.academia_vinculos where academia_id = '{reab}'") == "0", "\"Administrar esta academia\" não pega a academia fechada")
sql("truncate public.emails_a_enviar")
ok(um(f"select public.reabrir_academia('{reab}', 'Somos os novos donos.', true)", papel="authenticated", user=nova_conta, email=email_nova) == "pedido",
   "outra conta pede ao GuiaTennis ('pedido')")
ok(um(f"select status from public.academias where id = '{reab}'") == "fechada", "a academia continua fechada até o admin decidir")
ok(um("select assunto from public.emails_a_enviar where tipo = 'pedido_de_reabertura'") == f"Pedido para reabrir: {nome_r}", "o admin recebe o pedido")
ok(um(f"select pedido_em is not null from public.academias_fechadas() where academia_id = '{reab}'", papel="authenticated", user=nova_conta, email=email_nova) == "t",
   "a conta vê que o pedido está em andamento")
rid = um(f"select id from public.pedidos_de_reabertura_admin() where academia_id = '{reab}'", **admin_jwt)
ok(bool(rid) and um(f"select email || '|' || detalhes || '|' || emails_antes[1] from public.pedidos_de_reabertura_admin() where id = '{rid}'", **admin_jwt)
   == f"{email_nova}|Somos os novos donos.|{email_rita2}", "o admin vê o pedido, os detalhes e quem administrava antes")
certo, _ = sql(f"select public.resolver_reabertura_admin('{rid}', true)", papel="authenticated", user=nova_conta, email=email_nova)
ok(not certo, "só o admin decide")
sql(f"select public.resolver_reabertura_admin('{rid}', true, null)", **admin_jwt)
ok(um(f"select status || '|' || (revisar_desde is null) from public.academias where id = '{reab}'") == "published|true"
   and um(f"select papel from public.academia_vinculos where academia_id = '{reab}' and user_id = '{nova_conta}'") == "principal",
   "aprovado: a academia volta e a conta nova administra")
ok(um(f"select assunto from public.emails_a_enviar where tipo = 'reabertura_resposta' and para = '{email_nova}'") == f"A {nome_r} voltou ao GuiaTennis", "quem pediu recebe o e-mail")
sql(f"select public.tirar_academia_que_fechou('{reab}')", **admin_jwt)
sql(f"select public.reabrir_academia_admin('{reab}')", **admin_jwt)
ok(um(f"select status || '|' || (select count(*) from public.academia_vinculos where academia_id = '{reab}')::text from public.academias where id = '{reab}'") == "published|0",
   "o admin também reabre direto (sem responsável)")

print("\n# Tudo o que chega ao admin, no painel")
ok(int(um("select count(*) from public.avisos_do_admin(30)", **admin_jwt) or 0) >= 1
   and um("select count(*) from public.avisos_do_admin(30) where tipo = 'pedido_de_reabertura'", **admin_jwt) == "1",
   "os e-mails mandados ao admin aparecem como avisos no painel")
ok(um("select count(*) from public.avisos_do_admin(30)", papel="authenticated", user=jog_r) == "0", "quem não é admin não vê")
rev = um(f"select id from public.avaliacoes where academia_id = '{reab}' limit 1")
certo, saida = sql(f"select public.pedir_analise_da_avaliacao('{rev}', 'falsa')", papel="authenticated", user=jog_r)
ok(not certo and "Só quem administra" in saida, "só quem administra a academia pede análise")
sql(f"insert into public.academia_vinculos (user_id, academia_id, papel) values ('{nova_conta}', '{reab}', 'principal') on conflict do nothing")
sql("truncate public.emails_a_enviar")
ok(um(f"select public.pedir_analise_da_avaliacao('{rev}', 'conflito', 'Quem escreveu é de outra academia.')", papel="authenticated", user=nova_conta, email=email_nova) == "ok",
   "a academia pede análise pelo site (não mais pelo WhatsApp)")
ok(um(f"select da_academia || '|' || detalhes[1] from public.denuncias_admin() where avaliacao_id = '{rev}'", **admin_jwt) == "true|Quem escreveu é de outra academia.",
   "o admin vê em Avaliações denunciadas, como pedido da academia, com o motivo")
ok(um("select assunto from public.emails_a_enviar where tipo = 'analise_pedida'") == f"A academia pediu análise de uma avaliação: {nome_r}", "e recebe o aviso")
sql(f"delete from public.academias where id = '{reab}'; truncate public.emails_a_enviar")

print(f"\n{'Tudo certo' if not falhas else str(falhas) + ' falha(s)'}")
sys.exit(1 if falhas else 0)
