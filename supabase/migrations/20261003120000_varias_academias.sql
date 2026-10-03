-- ============================================================
-- Uma conta, várias academias (pedido do Breno em 03/10/2026)
-- ============================================================
-- Como o Google Business Profile ("Suas empresas"), o Booking (várias
-- propriedades na mesma conta), o trivago Business Studio e o iFood
-- Parceiros (várias lojas no mesmo login): a mesma conta do GuiaTennis
-- Parceiros administra quantas academias a pessoa responder, em qualquer
-- plano. Cada academia continua provada uma a uma (código no WhatsApp da
-- ficha, documento ou academia nova publicada), e o papel (principal ou
-- equipe) é de cada academia.
--
--   academia_vinculos            quem administra qual academia, com o papel
--   academia_acessos.academia_id passa a ser a academia aberta agora no
--                                painel (a que a pessoa escolheu na lista);
--                                as funções de número, pessoas e plano
--                                continuam valendo para ela.
--
-- Pode rodar de novo sem estragar nada.

create table if not exists public.academia_vinculos (
  user_id uuid not null references public.academia_acessos (user_id) on delete cascade,
  academia_id uuid not null references public.academias (id) on delete cascade,
  papel text not null default 'principal',
  ficha_atualizada_em timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, academia_id)
);
create index if not exists academia_vinculos_academia
  on public.academia_vinculos (academia_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'academia_vinculos_papel') then
    alter table public.academia_vinculos
      add constraint academia_vinculos_papel check (papel in ('principal', 'equipe'));
  end if;
end $$;

-- Quem já administrava uma academia continua com ela.
insert into public.academia_vinculos (user_id, academia_id, papel, ficha_atualizada_em, created_at)
select user_id, academia_id, coalesce(papel, 'principal'), ficha_atualizada_em, created_at
from public.academia_acessos
where academia_id is not null
on conflict (user_id, academia_id) do nothing;

alter table public.academia_vinculos enable row level security;
drop policy if exists "Ver os proprios vinculos" on public.academia_vinculos;
create policy "Ver os proprios vinculos" on public.academia_vinculos
  for select
  using (user_id = auth.uid() or public.eh_admin());
revoke all on public.academia_vinculos from anon, authenticated;
grant select on public.academia_vinculos to authenticated;
grant all on public.academia_vinculos to service_role;

-- Apagar uma academia não apaga mais a conta de quem a administrava (a
-- pessoa pode ter outras): a academia aberta passa para outra da lista.
do $$
declare
  v_nome text;
begin
  select c.conname into v_nome
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.academia_acessos'::regclass and c.contype = 'f'
    and a.attname = 'academia_id' and c.confdeltype = 'c'
  limit 1;
  if v_nome is not null then
    execute format('alter table public.academia_acessos drop constraint %I', v_nome);
    alter table public.academia_acessos
      add constraint academia_acessos_academia_id_fkey
      foreign key (academia_id) references public.academias (id) on delete set null;
  end if;
end $$;

-- Academia apagada: quem só administrava ela (e não tem pedido de outra)
-- perde o login, como antes; quem tem outras continua com elas.
create or replace function public.contas_da_academia_apagada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.academia_acessos x
  where exists (select 1 from public.academia_vinculos v
                where v.user_id = x.user_id and v.academia_id = old.id)
    and not exists (select 1 from public.academia_vinculos v
                    where v.user_id = x.user_id and v.academia_id <> old.id)
    and (x.pedido_academia_id is null or x.pedido_academia_id = old.id);
  return old;
end $$;

drop trigger if exists contas_da_academia_apagada on public.academias;
create trigger contas_da_academia_apagada
  before delete on public.academias
  for each row execute function public.contas_da_academia_apagada();

-- Gatilhos que mantêm as duas tabelas juntas ---------------------------

-- Acesso criado ou aberto numa academia (criar_acesso_academia, pessoa
-- nova da equipe): ganha o vínculo com o mesmo papel.
create or replace function public.vinculo_do_acesso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.academia_id is not null then
    insert into public.academia_vinculos (user_id, academia_id, papel)
    values (new.user_id, new.academia_id, coalesce(new.papel, 'principal'))
    on conflict (user_id, academia_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists vinculo_do_acesso on public.academia_acessos;
create trigger vinculo_do_acesso
  after insert or update of academia_id on public.academia_acessos
  for each row execute function public.vinculo_do_acesso();

-- Vínculo removido: se era a academia aberta, abre outra da lista (ou
-- nenhuma, e a conta volta a "escolher a academia").
create or replace function public.vinculo_removido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_vinculos;
begin
  select * into v from public.academia_vinculos
    where user_id = old.user_id
    order by created_at limit 1;
  update public.academia_acessos
    set academia_id = v.academia_id,
        papel = coalesce(v.papel, papel),
        updated_at = now()
    where user_id = old.user_id
      and (academia_id is null or academia_id = old.academia_id)
      and academia_id is distinct from v.academia_id;
  return old;
end $$;

drop trigger if exists vinculo_removido on public.academia_vinculos;
create trigger vinculo_removido
  after delete on public.academia_vinculos
  for each row execute function public.vinculo_removido();

-- Quem é de qual academia -----------------------------------------------

create or replace function public.minhas_academias()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select academia_id from public.academia_vinculos
  where user_id = auth.uid();
$$;

create or replace function public.avaliacao_da_minha_academia(p_avaliacao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.avaliacoes a
    join public.academia_vinculos v on v.academia_id = a.academia_id
    where a.id = p_avaliacao and v.user_id = auth.uid()
  );
$$;

-- A lista do seletor "Suas academias", com a aberta agora marcada.
create or replace function public.academias_da_minha_conta()
returns table (academia_id uuid, nome text, papel text, status text,
  pausada boolean, plano text, bairro text, cidade text, aberta boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.academia_id, a.name, v.papel, a.status, coalesce(a.pausada, false),
    coalesce(a.plano, 'basico'), a.bairro, a.cidade,
    v.academia_id = x.academia_id
  from public.academia_vinculos v
  join public.academias a on a.id = v.academia_id
  join public.academia_acessos x on x.user_id = v.user_id
  where v.user_id = auth.uid()
  order by a.name;
$$;

-- Trocar a academia aberta no painel.
create or replace function public.abrir_minha_academia(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_vinculos;
begin
  select * into v from public.academia_vinculos
    where user_id = auth.uid() and academia_id = p_academia;
  if not found then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  update public.academia_acessos
    set academia_id = v.academia_id, papel = v.papel, updated_at = now()
    where user_id = auth.uid();
end $$;

-- Ficha salva pela academia: anota no vínculo daquela academia.
create or replace function public.proteger_ficha_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.status := old.status;
  new.pago := old.pago;
  new.plano := old.plano;
  new.pausada := old.pausada;
  new.pausada_ate := old.pausada_ate;
  new.source := old.source;
  new.nome_solicitante := old.nome_solicitante;
  new.contato_solicitante := old.contato_solicitante;
  new.confirmada := true;
  update public.academia_vinculos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  update public.academia_acessos
    set ficha_atualizada_em = now()
    where user_id = auth.uid() and academia_id = new.id;
  return new;
end $$;

-- Liga a conta a mais uma academia -------------------------------------
-- Principal se a academia ainda não tem um. p_abrir: passa a ser a
-- academia aberta no painel (pedido da própria pessoa); sem ele, só abre
-- se a conta não tinha nenhuma (pessoa posta na equipe por outro).

drop function if exists public.ligar_conta_a_academia(uuid, uuid);
create or replace function public.ligar_conta_a_academia(
  p_user uuid, p_academia uuid, p_abrir boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel text;
begin
  insert into public.academia_vinculos (user_id, academia_id, papel)
  values (p_user, p_academia,
    case when exists (select 1 from public.academia_vinculos y
                      where y.academia_id = p_academia and y.papel = 'principal')
         then 'equipe' else 'principal' end)
  on conflict (user_id, academia_id) do nothing;
  select papel into v_papel from public.academia_vinculos
    where user_id = p_user and academia_id = p_academia;
  update public.academia_acessos
    set academia_id = case when p_abrir or academia_id is null then p_academia else academia_id end,
        papel = case when p_abrir or academia_id is null then v_papel else papel end,
        pedido_academia_id = case when pedido_academia_id = p_academia then null else pedido_academia_id end,
        pedido_nome = case when pedido_academia_id = p_academia then null else pedido_nome end,
        pedido_em = case when pedido_academia_id = p_academia then null else pedido_em end,
        updated_at = now()
    where user_id = p_user;
end $$;

-- Pedidos: quem já administra uma academia pode pedir outra ---------------

create or replace function public.pedir_para_administrar(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  v_nome text;
begin
  select * into v from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if exists (select 1 from public.academia_vinculos
             where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta já administra essa academia.' using errcode = '22023';
  end if;
  select name into v_nome from public.academias
    where id = p_academia and status = 'published';
  if v_nome is null then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  update public.academia_acessos
    set pedido_academia_id = p_academia, pedido_nome = v_nome,
        pedido_em = now(), updated_at = now()
    where user_id = auth.uid();
end $$;

create or replace function public.cancelar_meu_pedido()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.academia_acessos
    set pedido_academia_id = null, pedido_nome = null, pedido_em = null, updated_at = now()
    where user_id = auth.uid();
$$;

-- Academia nova mandada por uma conta do GuiaTennis Parceiros (com ou sem
-- academia): vira o pedido dela.
create or replace function public.pedido_da_academia_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.eh_admin() then
    update public.academia_acessos
      set pedido_academia_id = new.id, pedido_nome = new.name,
          pedido_em = now(), updated_at = now()
      where user_id = auth.uid();
  end if;
  return new;
end $$;

create or replace function public.liberar_pedidos_da_academia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.status = 'published' and coalesce(old.status, '') <> 'published' then
    for r in select user_id from public.academia_acessos
             where pedido_academia_id = new.id
             order by pedido_em loop
      perform public.ligar_conta_a_academia(r.user_id, new.id, true);
    end loop;
  end if;
  return new;
end $$;

create or replace function public.aprovar_pedido_de_acesso(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis aprova pedidos.' using errcode = '42501';
  end if;
  select * into v from public.academia_acessos where user_id = p_user;
  if not found or v.pedido_academia_id is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  perform public.ligar_conta_a_academia(p_user, v.pedido_academia_id, true);
end $$;

create or replace function public.gerar_codigo_do_pedido(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.academia_acessos;
  v_codigo text := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis gera o código.' using errcode = '42501';
  end if;
  select * into v from public.academia_acessos where user_id = p_user;
  if not found or v.pedido_academia_id is null then
    raise exception 'Pedido não encontrado.' using errcode = '22023';
  end if;
  if exists (select 1 from public.academia_vinculos
             where user_id = p_user and academia_id = v.pedido_academia_id) then
    raise exception 'Essa conta já administra essa academia.' using errcode = '22023';
  end if;
  insert into public.codigos_de_verificacao (user_id, academia_id, codigo_hash, criado_em, tentativas)
  values (p_user, v.pedido_academia_id, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now(), 0)
  on conflict (user_id) do update
    set academia_id = excluded.academia_id, codigo_hash = excluded.codigo_hash,
        criado_em = now(), tentativas = 0;
  return v_codigo;
end $$;

create or replace function public.confirmar_meu_codigo(p_codigo text)
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
  perform public.ligar_conta_a_academia(auth.uid(), c.academia_id, true);
  delete from public.codigos_de_verificacao where user_id = auth.uid();
  return 'ok';
end $$;

-- Pessoas da academia aberta -------------------------------------------

create or replace function public.pessoas_da_minha_academia()
returns table (user_id uuid, nome text, email text, papel text,
  dados_completos_em timestamptz, ultimo_acesso timestamptz, sou_eu boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select x.user_id, x.nome_responsavel, coalesce(x.email, x.usuario), v.papel,
    x.dados_completos_em, u.last_sign_in_at, x.user_id = auth.uid()
  from public.academia_vinculos v
  join public.academia_acessos x on x.user_id = v.user_id
  left join auth.users u on u.id = x.user_id
  where v.academia_id = (select e.academia_id from public.academia_acessos e
                         join public.academia_vinculos m
                           on m.user_id = e.user_id and m.academia_id = e.academia_id
                         where e.user_id = auth.uid())
  order by (v.papel = 'principal') desc, v.created_at;
$$;

-- O responsável principal da academia aberta põe mais uma pessoa. Conta
-- que já existe (com ou sem outras academias) ganha esta também; e-mail
-- novo ganha login com a senha provisória que a tela gerou.
create or replace function public.adicionar_pessoa(p_email text, p_nome text, p_senha text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
  v_outro public.academia_acessos;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_plano text;
  v_limite int;
  v_id uuid;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null then
    raise exception 'A sua conta ainda não administra uma academia.' using errcode = '42501';
  end if;
  if v_papel <> 'principal' then
    raise exception 'Só o responsável principal adiciona pessoas.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_email like '%@acesso.guiatennis.com.br' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  select coalesce(plano, 'basico') into v_plano from public.academias where id = v_academia;
  v_limite := public.limite_de_pessoas(v_plano);
  if (select count(*) from public.academia_vinculos where academia_id = v_academia) >= v_limite then
    raise exception 'O seu plano permite até % %. Aprimore o plano para adicionar mais.',
      v_limite, case when v_limite = 1 then 'pessoa' else 'pessoas' end
      using errcode = '22023';
  end if;

  select x.* into v_outro
    from public.academia_acessos x join auth.users u on u.id = x.user_id
    where lower(u.email) = v_email or lower(x.email) = v_email
    limit 1;
  if found then
    if exists (select 1 from public.academia_vinculos
               where user_id = v_outro.user_id and academia_id = v_academia) then
      raise exception 'Essa pessoa já tem acesso a esta academia.' using errcode = '23505';
    end if;
    perform public.ligar_conta_a_academia(v_outro.user_id, v_academia, false);
    return 'ligada';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Esse e-mail não pode ser usado.' using errcode = '23505';
  end if;
  if length(coalesce(p_senha, '')) < 8 then
    raise exception 'A senha precisa ter pelo menos 8 caracteres.' using errcode = '22023';
  end if;

  v_id := public.criar_login(v_email, p_senha);
  insert into public.academia_acessos (user_id, academia_id, usuario, nome_responsavel, email, papel)
  values (v_id, v_academia, v_email, nullif(btrim(coalesce(p_nome, '')), ''), v_email, 'equipe');
  return 'criada';
end $$;

-- Tira a pessoa da academia aberta. Quem fica sem nenhuma academia (e sem
-- pedido) perde o login, como antes; quem tem outras continua com elas.
create or replace function public.remover_pessoa(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
  v_papel text;
  v_ele public.academia_vinculos;
begin
  select x.academia_id, m.papel into v_academia, v_papel
    from public.academia_acessos x
    join public.academia_vinculos m on m.user_id = x.user_id and m.academia_id = x.academia_id
    where x.user_id = auth.uid();
  if v_academia is null or v_papel <> 'principal' then
    raise exception 'Só o responsável principal remove pessoas.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode remover a si mesmo.' using errcode = '22023';
  end if;
  select * into v_ele from public.academia_vinculos
    where user_id = p_user and academia_id = v_academia;
  if not found then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if v_ele.papel = 'principal' then
    raise exception 'Outro responsável principal só o GuiaTennis remove.' using errcode = '42501';
  end if;
  delete from public.academia_vinculos where user_id = p_user and academia_id = v_academia;
  delete from public.academia_acessos x
    where x.user_id = p_user and x.pedido_academia_id is null
      and not exists (select 1 from public.academia_vinculos where user_id = p_user);
end $$;

-- Admin: com p_academia, tira a conta só daquela academia (se ela tiver
-- outras); sem, apaga a conta inteira, como antes.
drop function if exists public.remover_acesso_academia(uuid);
create or replace function public.remover_acesso_academia(p_user uuid, p_academia uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis remove um acesso.' using errcode = '42501';
  end if;
  if p_academia is not null and exists (
       select 1 from public.academia_vinculos
       where user_id = p_user and academia_id <> p_academia) then
    delete from public.academia_vinculos where user_id = p_user and academia_id = p_academia;
    return;
  end if;
  delete from public.academia_acessos where user_id = p_user;
end $$;

-- A lista do admin: uma linha por academia de cada conta (o papel e a
-- ficha atualizada são daquela academia) e uma linha para a conta sem
-- nenhuma. O pedido vem em todas as linhas da conta.
create or replace function public.acessos_das_academias()
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
  select x.user_id, v.academia_id, x.usuario, x.nome_responsavel, x.cargo,
    x.email, x.whatsapp, x.cnpj, x.recebe_relatorio, x.termos_aceitos_em,
    x.dados_completos_em, x.senha_trocada_em,
    case when v.academia_id is null then x.ficha_atualizada_em else v.ficha_atualizada_em end,
    x.created_at, u.last_sign_in_at, coalesce(v.papel, x.papel), x.pedido_academia_id,
    x.pedido_nome, x.pedido_em, x.tratamento, c.criado_em
  from public.academia_acessos x
  left join public.academia_vinculos v on v.user_id = x.user_id
  left join auth.users u on u.id = x.user_id
  left join public.codigos_de_verificacao c on c.user_id = x.user_id
  where public.eh_admin()
  order by x.created_at, v.created_at;
$$;

-- Permissões ------------------------------------------------------------

revoke all on function public.academias_da_minha_conta() from public, anon;
revoke all on function public.abrir_minha_academia(uuid) from public, anon;
revoke all on function public.remover_acesso_academia(uuid, uuid) from public, anon;
grant execute on function public.academias_da_minha_conta(),
  public.abrir_minha_academia(uuid),
  public.remover_acesso_academia(uuid, uuid)
  to authenticated;

revoke all on function public.ligar_conta_a_academia(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.vinculo_do_acesso() from public, anon, authenticated;
revoke all on function public.vinculo_removido() from public, anon, authenticated;
revoke all on function public.contas_da_academia_apagada() from public, anon, authenticated;

notify pgrst, 'reload schema';
