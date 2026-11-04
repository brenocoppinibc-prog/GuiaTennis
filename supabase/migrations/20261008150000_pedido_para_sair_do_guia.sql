-- ============================================================
-- Tirar a academia do guia vira um pedido (pedido do Breno em 08/10/2026:
-- "eu quero que a pausa o administrador consiga fazer, agora a exclusão
-- preciso pedir uma solicitação")
-- ============================================================
-- Pausar continua com quem administra a academia (pausar_minha_academia).
-- Tirar do guia passa a ser um pedido feito no GuiaTennis Parceiros, que o
-- admin aprova ou recusa no painel:
--
--   pedidos_para_sair        um pedido aberto por academia: motivo,
--                            detalhes, quem pediu, quando; e como terminou
--                            ('removida', 'mantida' ou 'cancelado').
--   pedir_para_sair_do_guia  só o responsável principal da academia. Avisa
--                            o admin por e-mail.
--   cancelar_pedido_para_sair  quem administra a academia.
--   meus_pedidos_para_sair   os pedidos abertos das academias da conta.
--   pedidos_para_sair_admin  os abertos, para o painel do admin.
--   resolver_pedido_para_sair  o admin tira a academia do guia (apaga a
--                            ficha, como o "Excluir" do admin) ou mantém, e
--                            quem pediu recebe a resposta por e-mail.
--
-- Pode rodar de novo sem estragar nada.

create table if not exists public.pedidos_para_sair (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid references public.academias (id) on delete set null,
  academia_nome text not null,
  user_id uuid references auth.users (id) on delete set null,
  motivo text not null,
  detalhes text,
  pedido_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolucao text,
  resposta text
);
alter table public.pedidos_para_sair drop constraint if exists pedidos_para_sair_ok;
alter table public.pedidos_para_sair add constraint pedidos_para_sair_ok
  check (motivo in ('fechou', 'nao_quer', 'outro')
         and (detalhes is null or char_length(detalhes) <= 500)
         and (resolucao is null or resolucao in ('removida', 'mantida', 'cancelado')));
create unique index if not exists pedidos_para_sair_um_aberto
  on public.pedidos_para_sair (academia_id) where resolvido_em is null;
alter table public.pedidos_para_sair enable row level security;
revoke all on public.pedidos_para_sair from anon, authenticated;

create or replace function public.motivo_para_sair(p_motivo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_motivo when 'fechou' then 'A academia fechou'
                       when 'nao_quer' then 'Não querem mais aparecer no GuiaTennis'
                       else 'Outro motivo' end;
$$;

-- O responsável principal pede ---------------------------------------------
create or replace function public.pedir_para_sair_do_guia(p_academia uuid, p_motivo text, p_detalhes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_id uuid;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Quem pede para tirar a academia do guia é o responsável principal.' using errcode = '42501';
  end if;
  if p_motivo is null or p_motivo not in ('fechou', 'nao_quer', 'outro') then
    raise exception 'Escolha o motivo.' using errcode = '22023';
  end if;
  if p_motivo = 'outro' and v_detalhes is null then
    raise exception 'Conte o motivo em poucas palavras.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'O motivo cabe em até 500 letras.' using errcode = '22023';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pedidos_para_sair where academia_id = p_academia and resolvido_em is null) then
    raise exception 'Já existe um pedido para tirar esta academia do guia.' using errcode = '22023';
  end if;
  insert into public.pedidos_para_sair (academia_id, academia_nome, user_id, motivo, detalhes)
    values (p_academia, a.name, auth.uid(), p_motivo, v_detalhes)
    returning id into v_id;
  select * into x from public.academia_acessos where user_id = auth.uid();
  perform public.aviso_ao_admin(
    'sair:' || v_id, 'pedido_para_sair', 'Pedido para tirar do guia: ' || a.name,
    'Pedido para tirar do guia',
    public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, x.email, 'O responsável')) || '</strong> pediu para tirar a <strong>'
      || public.html_texto(a.name) || '</strong> do GuiaTennis.')
    || public.email_p('Motivo: ' || public.html_texto(public.motivo_para_sair(p_motivo))
      || coalesce(' — ' || public.html_texto(v_detalhes), '') || '.')
    || public.email_p('Responda no painel: "Tirar do guia" ou "Manter no guia".'),
    coalesce(x.nome_responsavel, x.email, 'O responsável') || ' pediu para tirar a ' || a.name || ' do GuiaTennis. Motivo: '
      || public.motivo_para_sair(p_motivo) || coalesce(' — ' || v_detalhes, '') || '.');
  return v_id;
end $$;

create or replace function public.cancelar_pedido_para_sair(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  update public.pedidos_para_sair
    set resolvido_em = now(), resolucao = 'cancelado'
    where academia_id = p_academia and resolvido_em is null;
end $$;

create or replace function public.meus_pedidos_para_sair()
returns table (academia_id uuid, motivo text, pedido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.academia_id, p.motivo, p.pedido_em
  from public.pedidos_para_sair p
  where p.resolvido_em is null
    and exists (select 1 from public.academia_vinculos v
                where v.user_id = auth.uid() and v.academia_id = p.academia_id);
$$;

-- O admin ------------------------------------------------------------------
create or replace function public.pedidos_para_sair_admin()
returns table (id uuid, academia_id uuid, nome text, bairro text, cidade text, motivo text, detalhes text,
               pedido_em timestamptz, pessoa text, email text, whatsapp text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    return;
  end if;
  return query
    select p.id, p.academia_id, p.academia_nome, a.bairro, a.cidade, p.motivo, p.detalhes, p.pedido_em,
           x.nome_responsavel, x.email, x.whatsapp
    from public.pedidos_para_sair p
    left join public.academias a on a.id = p.academia_id
    left join public.academia_acessos x on x.user_id = p.user_id
    where p.resolvido_em is null
    order by p.pedido_em;
end $$;

create or replace function public.resolver_pedido_para_sair(p_id uuid, p_remover boolean, p_resposta text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_para_sair;
  v_email text;
  v_nome text;
  v_resposta text := nullif(btrim(coalesce(p_resposta, '')), '');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis resolve esse pedido.' using errcode = '42501';
  end if;
  select * into p from public.pedidos_para_sair where id = p_id and resolvido_em is null;
  if not found then
    raise exception 'Pedido não encontrado ou já resolvido.' using errcode = '22023';
  end if;
  select x.email, x.nome_responsavel into v_email, v_nome from public.academia_acessos x where x.user_id = p.user_id;
  update public.pedidos_para_sair
    set resolvido_em = now(), resolucao = case when p_remover then 'removida' else 'mantida' end, resposta = v_resposta
    where id = p_id;
  if p_remover and p.academia_id is not null then
    delete from public.academias where id = p.academia_id;
  end if;
  -- A resposta para quem pediu.
  begin
    perform public.por_na_fila('sair-resposta:' || p_id, 'pedido_para_sair_resposta', v_email,
      case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
           else 'Sobre o pedido para tirar a ' || p.academia_nome || ' do GuiaTennis' end,
      public.email_montado(case when p_remover then 'A academia saiu do guia' else 'A academia continua no guia' end,
        public.email_p('Olá' || coalesce(', ' || public.html_texto(split_part(btrim(v_nome), ' ', 1)), '') || '!')
        || case when p_remover
             then public.email_p('Como você pediu, a <strong>' || public.html_texto(p.academia_nome) || '</strong> não aparece mais no GuiaTennis.')
             else public.email_p('A <strong>' || public.html_texto(p.academia_nome) || '</strong> continua no GuiaTennis.')
                  || coalesce(public.email_p(public.html_texto(v_resposta)), '')
                  || public.email_p('Para tirar a ficha da busca por um tempo, use Suas academias › Pausar no site.') end,
        case when p_remover then null else 'Abrir o GuiaTennis Parceiros' end,
        case when p_remover then null else public.site_dos_emails() || '/parceiros/academias' end,
        'Aviso automático do GuiaTennis Parceiros.'),
      case when p_remover then 'Como você pediu, a ' || p.academia_nome || ' não aparece mais no GuiaTennis.'
           else 'A ' || p.academia_nome || ' continua no GuiaTennis.' || coalesce(E'\n\n' || v_resposta, '') end);
  exception when others then
    raise warning 'resposta do pedido para sair: %', sqlerrm;
  end;
end $$;

revoke all on function public.motivo_para_sair(text) from public, anon, authenticated;
revoke all on function public.pedir_para_sair_do_guia(uuid, text, text) from public, anon;
revoke all on function public.cancelar_pedido_para_sair(uuid) from public, anon;
revoke all on function public.meus_pedidos_para_sair() from public, anon;
revoke all on function public.pedidos_para_sair_admin() from public, anon;
revoke all on function public.resolver_pedido_para_sair(uuid, boolean, text) from public, anon;
grant execute on function public.pedir_para_sair_do_guia(uuid, text, text), public.cancelar_pedido_para_sair(uuid),
  public.meus_pedidos_para_sair(), public.pedidos_para_sair_admin(),
  public.resolver_pedido_para_sair(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
