-- ============================================================
-- Cadastro completo e verificação pelo WhatsApp da academia (01/10/2026)
-- ============================================================
-- Pedido do Breno, no modelo do trivago Business Studio:
--
--   * A conta guarda os dados de contato completos: tratamento (Sr., Sra.
--     ou prefiro não informar), nome e sobrenome, cargo, WhatsApp e se a
--     pessoa quer receber novidades e o relatório do mês.
--   * Quem pede para administrar uma academia do guia prova que responde
--     por ela com um código mandado ao WhatsApp que está na ficha da
--     academia — como o Google Business Profile faz com o telefone da
--     empresa. O Breno gera o código no painel e manda ele mesmo pelo
--     WhatsApp (nada sai sozinho); a pessoa digita o código no GuiaTennis
--     Parceiros e a conta é liberada. Sem o código, o Breno continua
--     podendo aprovar depois de conferir um documento.
--
-- Pode rodar de novo sem estragar nada.

alter table public.academia_acessos add column if not exists tratamento text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'academia_acessos_tratamento') then
    alter table public.academia_acessos add constraint academia_acessos_tratamento
      check (tratamento is null or tratamento in ('Sr.', 'Sra.', 'Prefiro não informar'));
  end if;
end $$;

-- Códigos de verificação: tabela fechada (nem a própria conta lê). Só o
-- resumo do código fica guardado, e ele vale 72 horas e 5 tentativas.
create table if not exists public.codigos_de_verificacao (
  user_id uuid primary key references public.academia_acessos (user_id) on delete cascade,
  academia_id uuid not null references public.academias (id) on delete cascade,
  codigo_hash text not null,
  criado_em timestamptz not null default now(),
  tentativas int not null default 0
);
alter table public.codigos_de_verificacao enable row level security;
revoke all on public.codigos_de_verificacao from anon, authenticated;
grant all on public.codigos_de_verificacao to service_role;

-- Conta nova com os dados de contato completos. A versão antiga (5
-- parâmetros) sai: a nova aceita a mesma chamada, porque o resto tem padrão.
drop function if exists public.criar_minha_conta(text, text, text, text, boolean);
create or replace function public.criar_minha_conta(
  p_email text, p_senha text, p_nome text, p_whatsapp text, p_aceite boolean,
  p_tratamento text default null, p_cargo text default null,
  p_recebe_novidades boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_whats text := public.telefone_normal(p_whatsapp);
  v_tratamento text := nullif(btrim(coalesce(p_tratamento, '')), '');
  v_id uuid;
begin
  if auth.uid() is not null then
    raise exception 'Saia da conta atual para criar outra.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Escreva o seu nome.' using errcode = '22023';
  end if;
  if v_tratamento is not null and v_tratamento not in ('Sr.', 'Sra.', 'Prefiro não informar') then
    raise exception 'Escolha o tratamento.' using errcode = '22023';
  end if;
  if length(v_whats) not between 10 and 11 then
    raise exception 'WhatsApp inválido: use o DDD e o número.' using errcode = '22023';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;
  if not coalesce(p_aceite, false) then
    raise exception 'Falta aceitar os Termos de Uso e a Política de Privacidade.' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email)
     or exists (select 1 from public.academia_acessos where lower(email) = v_email or usuario = v_email) then
    raise exception 'Esse e-mail já tem conta no GuiaTennis Parceiros. Entre com a sua senha.'
      using errcode = '23505';
  end if;
  if (select count(*) from public.academia_acessos
      where academia_id is null and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitos cadastros agora. Tente de novo em alguns minutos.' using errcode = '54000';
  end if;

  v_id := public.criar_login(v_email, p_senha);
  insert into public.academia_acessos (user_id, academia_id, usuario,
    nome_responsavel, tratamento, cargo, email, whatsapp, recebe_relatorio,
    termos_aceitos_em, dados_completos_em, senha_trocada_em, papel)
  values (v_id, null, v_email, btrim(p_nome), v_tratamento,
    nullif(btrim(coalesce(p_cargo, '')), ''), v_email, v_whats,
    coalesce(p_recebe_novidades, false), now(), now(), now(), 'principal');
end $$;

-- Primeiro acesso (e "Editar dados") com o tratamento. Mesma troca: sai a
-- versão de 7 parâmetros.
drop function if exists public.completar_meu_acesso(text, text, text, text, text, boolean, boolean);
create or replace function public.completar_meu_acesso(
  p_nome text, p_cargo text, p_email text, p_whatsapp text,
  p_cnpj text, p_recebe_relatorio boolean, p_aceite boolean,
  p_tratamento text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acesso public.academia_acessos;
  v_whats text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_tratamento text := nullif(btrim(coalesce(p_tratamento, '')), '');
begin
  select * into v_acesso from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Acesso não encontrado.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Escreva o nome do responsável.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_cargo, '')) = '' then
    raise exception 'Escolha o cargo.' using errcode = '22023';
  end if;
  if v_tratamento is not null and v_tratamento not in ('Sr.', 'Sra.', 'Prefiro não informar') then
    raise exception 'Escolha o tratamento.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if length(v_whats) not between 10 and 13 then
    raise exception 'WhatsApp inválido: use o DDD e o número.' using errcode = '22023';
  end if;
  if v_cnpj <> '' and length(v_cnpj) <> 14 then
    raise exception 'CNPJ inválido: são 14 números.' using errcode = '22023';
  end if;
  if v_acesso.termos_aceitos_em is null and not coalesce(p_aceite, false) then
    raise exception 'Falta aceitar os Termos de Uso e a Política de Privacidade.' using errcode = '22023';
  end if;
  update public.academia_acessos set
    nome_responsavel = btrim(p_nome),
    tratamento = coalesce(v_tratamento, tratamento),
    cargo = btrim(p_cargo),
    email = v_email,
    whatsapp = v_whats,
    cnpj = nullif(v_cnpj, ''),
    recebe_relatorio = coalesce(p_recebe_relatorio, false),
    termos_aceitos_em = coalesce(termos_aceitos_em, now()),
    dados_completos_em = coalesce(dados_completos_em, now()),
    updated_at = now()
  where user_id = auth.uid();
end $$;

-- O admin gera o código do pedido para mandar ao WhatsApp da ficha.
create or replace function public.gerar_codigo_do_pedido(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  -- Seis números tirados de bytes aleatórios de verdade (pgcrypto).
  v_codigo text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis gera o código.' using errcode = '42501';
  end if;
  select * into v from public.academia_acessos where user_id = p_user;
  if not found or v.pedido_academia_id is null or v.academia_id is not null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  insert into public.codigos_de_verificacao (user_id, academia_id, codigo_hash, criado_em, tentativas)
  values (p_user, v.pedido_academia_id, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0)
  on conflict (user_id) do update
    set academia_id = excluded.academia_id, codigo_hash = excluded.codigo_hash,
        criado_em = now(), tentativas = 0;
  return v_codigo;
end $$;

-- A pessoa digita o código que chegou no WhatsApp da academia. Devolve o
-- resultado em vez de dar erro no código errado: assim a tentativa fica
-- contada (um erro desfaria a contagem). 'ok', 'errado', 'tentativas',
-- 'venceu' ou 'sem_codigo'.
drop function if exists public.confirmar_meu_codigo(text);
create function public.confirmar_meu_codigo(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  c public.codigos_de_verificacao;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
begin
  select * into v from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if v.academia_id is not null then
    raise exception 'A sua conta já administra uma academia.' using errcode = '22023';
  end if;
  select * into c from public.codigos_de_verificacao where user_id = auth.uid();
  if not found or v.pedido_academia_id is distinct from c.academia_id then
    return 'sem_codigo';
  end if;
  if c.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if c.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, c.codigo_hash) <> c.codigo_hash then
    update public.codigos_de_verificacao set tentativas = tentativas + 1 where user_id = auth.uid();
    return 'errado';
  end if;
  perform public.ligar_conta_a_academia(auth.uid(), c.academia_id);
  delete from public.codigos_de_verificacao where user_id = auth.uid();
  return 'ok';
end $$;

-- A lista do admin ganha o tratamento e quando o código foi gerado.
drop function if exists public.acessos_das_academias();
create function public.acessos_das_academias()
returns table (
  user_id uuid, academia_id uuid, usuario text, nome_responsavel text,
  cargo text, email text, whatsapp text, cnpj text,
  recebe_relatorio boolean, termos_aceitos_em timestamptz,
  dados_completos_em timestamptz, senha_trocada_em timestamptz,
  ficha_atualizada_em timestamptz, created_at timestamptz,
  ultimo_acesso timestamptz, papel text, pedido_academia_id uuid,
  pedido_nome text, pedido_em timestamptz, tratamento text,
  codigo_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.academia_id, x.usuario, x.nome_responsavel, x.cargo,
    x.email, x.whatsapp, x.cnpj, x.recebe_relatorio, x.termos_aceitos_em,
    x.dados_completos_em, x.senha_trocada_em, x.ficha_atualizada_em,
    x.created_at, u.last_sign_in_at, x.papel, x.pedido_academia_id,
    x.pedido_nome, x.pedido_em, x.tratamento, c.criado_em
  from public.academia_acessos x
  left join auth.users u on u.id = x.user_id
  left join public.codigos_de_verificacao c on c.user_id = x.user_id
  where public.eh_admin()
  order by x.created_at;
$$;

-- Permissões ------------------------------------------------------------

revoke all on function public.criar_minha_conta(text, text, text, text, boolean, text, text, boolean) from public;
grant execute on function public.criar_minha_conta(text, text, text, text, boolean, text, text, boolean)
  to anon, authenticated;

revoke all on function public.completar_meu_acesso(text, text, text, text, text, boolean, boolean, text) from public, anon;
revoke all on function public.gerar_codigo_do_pedido(uuid) from public, anon;
revoke all on function public.confirmar_meu_codigo(text) from public, anon;
revoke all on function public.acessos_das_academias() from public, anon;
grant execute on function public.completar_meu_acesso(text, text, text, text, text, boolean, boolean, text),
  public.gerar_codigo_do_pedido(uuid),
  public.confirmar_meu_codigo(text),
  public.acessos_das_academias()
  to authenticated;

notify pgrst, 'reload schema';
