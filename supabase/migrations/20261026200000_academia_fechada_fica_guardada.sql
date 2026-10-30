-- ============================================================
-- A academia que fechou fica guardada, e todas as pendências chegam ao painel
-- (pedido do Breno em 26/10/2026: "não quero que academias sejam excluídas
-- por completo do site, manter no sistema para possível reinauguração ou ter
-- o controle de quantas academia já tivemos no site, e se um email que já
-- possuío uma academia, retornar, aparecer uma pergunta se ele deseja
-- administrar aquela academia novamente ou um novo email pesquisar o nome
-- daquela academia e aparecer algo como fechado permanente/ cadastro
-- inativo. eu preciso que todas notificações de pendências chegue ao meu
-- perfil, sobre tudo que devo fazer")
-- ============================================================
-- 1. "Fechou: tirar do Guia" não apaga mais: a academia passa a 'fechada'
--    (cadastro inativo), fora do site, com as avaliações e a data, como o
--    "Fechado permanentemente" do Google e a propriedade desativada do
--    Booking, que continuam no sistema. Guarda os e-mails de quem a
--    administrava (academias.fechada_emails, só o banco lê) e tira os
--    acessos; o plano volta ao Básico.
-- 2. Reabrir (como o "Marcar como aberta" do Google): quem administrava (o
--    mesmo e-mail) reabre na hora e volta a administrar
--    (reabrir_academia → 'reaberta'; o admin revisa depois); uma conta nova
--    pede ao GuiaTennis (→ 'pedido', pedidos_de_reabertura), que confere e
--    aprova ou recusa. O admin também reabre direto.
-- 3. O admin vê tudo o que chega a ele: avisos_do_admin (os e-mails que o
--    banco mandou ao admin, para o painel listar) e o "Pedir análise" da
--    academia, que ia pelo WhatsApp, vira um pedido no painel
--    (pedir_analise_da_avaliacao, junto das denúncias).
-- Pode rodar de novo sem estragar nada.

-- 1. A academia fechada fica guardada --------------------------------------
alter table public.academias add column if not exists fechada_em timestamptz;
alter table public.academias add column if not exists fechada_emails text[];
alter table public.academias add column if not exists reaberta_em timestamptz;
-- A data sai para o admin pelo painel; os e-mails, só pelas funções.
grant select (fechada_em, reaberta_em) on public.academias to authenticated;

-- Fecha o cadastro: fora do site, sem acessos, no Básico, com os e-mails de
-- quem administrava. Tira também o que esperava por ela.
create or replace function public.guardar_academia_fechada(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emails text[];
  r record;
begin
  select coalesce(array_agg(distinct lower(u.email)) filter (where u.email is not null), '{}')
    into v_emails
    from public.academia_vinculos v
    join auth.users u on u.id = v.user_id
    where v.academia_id = p_academia;
  for r in select user_id from public.academia_vinculos where academia_id = p_academia loop
    delete from public.academia_vinculos where user_id = r.user_id and academia_id = p_academia;
    update public.academia_acessos
      set academia_id = (select v.academia_id from public.academia_vinculos v
                         where v.user_id = r.user_id order by v.created_at limit 1)
      where user_id = r.user_id and academia_id = p_academia;
  end loop;
  delete from public.pedidos_de_acesso where academia_id = p_academia;
  delete from public.codigos_do_whatsapp where academia_id = p_academia;
  update public.problemas_na_ficha set resolvido_em = now(), resolucao = 'academia_fechou'
    where academia_id = p_academia and resolvido_em is null;
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set status = 'fechada', fechada_em = now(),
        fechada_emails = (select array_agg(distinct e) from unnest(coalesce(fechada_emails, '{}') || v_emails) e),
        plano = 'basico', pausada = false, pausada_ate = null, pausada_pela_academia = false,
        avisou_que_fechou_em = null, revisar_desde = null,
        whatsapp_a_confirmar = null, whatsapp_antes = null, whatsapp_pedido_em = null,
        whatsapp_pedido_por = null, whatsapp_codigo_ok_em = null
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
end $$;

-- O mesmo do SQL 20261020170000, sem apagar: "Fechou" guarda a academia.
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
  v_quem text;
  v_resposta text := nullif(btrim(coalesce(p_resposta, '')), '');
  v_outros jsonb := '[]'::jsonb;
  v_parar text;
  v_fato text;
  o jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis resolve esse aviso.' using errcode = '42501';
  end if;
  select * into p from public.pedidos_para_sair where id = p_id and resolvido_em is null;
  if not found then
    raise exception 'Aviso não encontrado ou já resolvido.' using errcode = '22023';
  end if;
  select x.email, x.nome_responsavel into v_email, v_nome from public.academia_acessos x where x.user_id = p.user_id;
  v_quem := coalesce(nullif(btrim(v_nome), ''), 'O responsável principal');
  v_fato := case when p.user_id is null then 'O GuiaTennis confirmou que a ' || p.academia_nome || ' fechou as portas'
                 else v_quem || ' avisou que a ' || p.academia_nome || ' fechou as portas' end;
  if p.academia_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('user_id', q.user_id, 'email', q.email, 'token', q.token_avisos)), '[]'::jsonb)
      into v_outros
      from public.quem_recebe_da_academia(p.academia_id) q
      where q.user_id is distinct from p.user_id;
  end if;
  update public.pedidos_para_sair
    set resolvido_em = now(), resolucao = case when p_remover then 'removida' else 'mantida' end, resposta = v_resposta
    where id = p_id;
  if p_remover and p.academia_id is not null then
    perform public.guardar_academia_fechada(p.academia_id);
  end if;
  -- A resposta para quem avisou.
  if v_email is not null then
    begin
      perform public.por_na_fila('sair-resposta:' || p_id, 'pedido_para_sair_resposta', v_email,
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do Guia' else 'A academia continua no Guia' end,
          public.email_p('Olá' || coalesce(', ' || public.html_texto(split_part(btrim(v_nome), ' ', 1)), '') || '!')
          || case when p_remover
               then public.email_p('Conferimos que a <strong>' || public.html_texto(p.academia_nome) || '</strong> fechou as portas, e ela não aparece mais no GuiaTennis.')
                    || public.email_p('O cadastro fica guardado, com as avaliações. Se a academia reabrir, entre no GuiaTennis Parceiros com este e-mail: ele pergunta se você quer administrá-la de novo.')
               else public.email_p('A <strong>' || public.html_texto(p.academia_nome) || '</strong> continua no GuiaTennis: ela ainda aparece aberta ou com informações públicas.')
                    || coalesce(public.email_p(public.html_texto(v_resposta)), '')
                    || public.email_p('Para tirar a ficha da busca por um tempo, use Suas academias › Pausar no site.') end,
          'Abrir o GuiaTennis Parceiros',
          public.site_dos_emails() || case when p_remover then '/parceiros' else '/parceiros/academias' end,
          'Aviso automático do GuiaTennis Parceiros.'),
        case when p_remover then 'Conferimos que a ' || p.academia_nome || ' fechou as portas, e ela não aparece mais no GuiaTennis.'
                  || E'\n\nO cadastro fica guardado, com as avaliações. Se a academia reabrir, entre no GuiaTennis Parceiros com este e-mail: ele pergunta se você quer administrá-la de novo.'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis: ela ainda aparece aberta ou com informações públicas.'
                  || coalesce(E'\n\n' || v_resposta, '') end);
    exception when others then
      raise warning 'resposta do aviso de que fechou: %', sqlerrm;
    end;
  end if;
  -- E para as outras pessoas da academia.
  for o in select * from jsonb_array_elements(v_outros) loop
    begin
      v_parar := public.link_parar_avisos((o->>'token')::uuid, 'parceiros');
      perform public.por_na_fila('sair-resposta:' || p_id || ':' || (o->>'user_id'), 'pedido_para_sair_resposta', o->>'email',
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do Guia' else 'A academia continua no Guia' end,
          case when p_remover
            then public.email_p(public.html_texto(v_fato) || ', e ela não aparece mais no GuiaTennis. O cadastro fica guardado, com as avaliações: se ela reabrir, entre no GuiaTennis Parceiros com este e-mail.')
            else public.email_p(public.html_texto(v_fato) || ', mas ela continua no Guia: ainda aparece aberta ou com informações públicas.')
                 || coalesce(public.email_p(public.html_texto(v_resposta)), '') end,
          'Abrir o GuiaTennis Parceiros',
          public.site_dos_emails() || case when p_remover then '/parceiros' else '/parceiros/academias' end,
          case when p_remover then 'Você recebe este e-mail porque administrava a ' else 'Você recebe este e-mail porque administra a ' end
          || public.html_texto(p.academia_nome) || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        case when p_remover
          then v_fato || ', e ela não aparece mais no GuiaTennis. O cadastro fica guardado, com as avaliações: se ela reabrir, entre no GuiaTennis Parceiros com este e-mail.'
          else v_fato || ', mas ela continua no Guia: ainda aparece aberta ou com informações públicas.'
               || coalesce(E'\n\n' || v_resposta, '') end
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar);
    exception when others then
      raise warning 'resposta do aviso de que fechou (equipe): %', sqlerrm;
    end;
  end loop;
end $$;

-- Ninguém passa a administrar uma academia fechada sem reabri-la (o pedido
-- de sempre, "Administrar esta academia", também esbarra aqui).
create or replace function public.vinculo_com_academia_aberta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.academias where id = new.academia_id and status = 'fechada') then
    raise exception 'Essa academia está fechada no GuiaTennis. Se ela reabriu, peça para reabrir.' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists vinculo_com_academia_aberta on public.academia_vinculos;
create trigger vinculo_com_academia_aberta
  before insert on public.academia_vinculos
  for each row execute function public.vinculo_com_academia_aberta();

-- 2. Reabrir -----------------------------------------------------------------
create table if not exists public.pedidos_de_reabertura (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  detalhes text,
  declarou_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolucao text,
  resposta text
);
alter table public.pedidos_de_reabertura drop constraint if exists pedidos_de_reabertura_ok;
alter table public.pedidos_de_reabertura add constraint pedidos_de_reabertura_ok
  check ((detalhes is null or char_length(detalhes) <= 500)
         and (resolucao is null or resolucao in ('reaberta', 'recusada', 'cancelado')));
create unique index if not exists pedidos_de_reabertura_um_aberto
  on public.pedidos_de_reabertura (academia_id, user_id) where resolvido_em is null;
alter table public.pedidos_de_reabertura enable row level security;
revoke all on table public.pedidos_de_reabertura from anon, authenticated;

-- A academia volta ao site; com a conta, ela passa a administrar (como
-- responsável principal, se ninguém mais administra).
create or replace function public.academia_volta_ao_guia(p_academia uuid, p_user uuid, p_revisar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('guiatennis.mudanca_do_guia', p_academia::text, true);
  update public.academias
    set status = 'published', fechada_em = null, fechada_emails = null, reaberta_em = now(),
        revisar_desde = case when p_revisar then now() end
    where id = p_academia;
  perform set_config('guiatennis.mudanca_do_guia', '', true);
  if p_user is not null and exists (select 1 from public.academia_acessos where user_id = p_user) then
    insert into public.academia_vinculos (user_id, academia_id, papel, declarou_em)
      values (p_user, p_academia,
              case when exists (select 1 from public.academia_vinculos where academia_id = p_academia and papel = 'principal')
                   then 'equipe' else 'principal' end, now())
      on conflict do nothing;
    update public.academia_acessos set academia_id = p_academia
      where user_id = p_user and academia_id is null;
  end if;
  update public.pedidos_de_reabertura set resolvido_em = now(), resolucao = 'cancelado'
    where academia_id = p_academia and resolvido_em is null and user_id is distinct from p_user;
end $$;

-- As academias fechadas (nome e lugar, que já foram públicos), para a busca
-- do Parceiros: "Fechada permanentemente · cadastro inativo". minha: a conta
-- administrava quando ela fechou (o mesmo e-mail).
create or replace function public.academias_fechadas()
returns table (academia_id uuid, nome text, bairro text, cidade text, fechada_em timestamptz, minha boolean, pedido_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.bairro, a.cidade, a.fechada_em,
    lower(coalesce(auth.jwt() ->> 'email', '')) = any(coalesce(a.fechada_emails, '{}')),
    (select p.criado_em from public.pedidos_de_reabertura p
     where p.academia_id = a.id and p.user_id = auth.uid() and p.resolvido_em is null)
  from public.academias a
  where a.status = 'fechada' and auth.uid() is not null
  order by a.name;
$$;

-- "A academia reabriu?": o mesmo e-mail reabre na hora ('reaberta'); outra
-- conta pede ao GuiaTennis ('pedido').
create or replace function public.reabrir_academia(p_academia uuid, p_detalhes text default null, p_declaro boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  select * into x from public.academia_acessos where user_id = auth.uid();
  if not found then
    raise exception 'Entre com a sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if x.email_confirmado_em is null then
    raise exception 'Confirme o seu e-mail para reabrir a academia.' using errcode = '42501';
  end if;
  if not coalesce(p_declaro, false) then
    raise exception 'Marque a declaração de que você responde pela academia.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'Os detalhes cabem em até 500 letras.' using errcode = '22023';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found or a.status <> 'fechada' then
    raise exception 'Essa academia não está fechada no GuiaTennis.' using errcode = '22023';
  end if;
  if v_email <> '' and v_email = any(coalesce(a.fechada_emails, '{}')) then
    perform public.academia_volta_ao_guia(p_academia, auth.uid(), true);
    perform public.aviso_ao_admin('reaberta:' || p_academia || ':' || public.hoje_em_brasilia(),
      'academia_reaberta', 'Academia reaberta: ' || a.name, 'Academia reaberta',
      public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, v_email)) || '</strong> (' || public.html_texto(v_email)
        || '), que administrava a <strong>' || public.html_texto(a.name) || '</strong> quando ela fechou, avisou que ela reabriu e voltou a administrar a ficha.')
      || coalesce(public.email_p('Detalhes: ' || public.html_texto(v_detalhes) || '.'), '')
      || public.email_p('Ela já está no ar. Confira em <strong>Pendências</strong> › "Foram ao ar ou foram assumidas sozinhas".'),
      coalesce(x.nome_responsavel, v_email) || ' (' || v_email || '), que administrava a ' || a.name
        || ' quando ela fechou, avisou que ela reabriu e voltou a administrar a ficha.' || coalesce(' Detalhes: ' || v_detalhes || '.', ''));
    return 'reaberta';
  end if;
  insert into public.pedidos_de_reabertura (academia_id, user_id, detalhes, declarou_em)
    values (p_academia, auth.uid(), v_detalhes, now())
    on conflict (academia_id, user_id) where resolvido_em is null
    do update set detalhes = excluded.detalhes, declarou_em = now()
    returning id into v_id;
  perform public.aviso_ao_admin('reabertura:' || v_id, 'pedido_de_reabertura', 'Pedido para reabrir: ' || a.name,
    'Pedido para reabrir uma academia fechada',
    public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, v_email)) || '</strong> (' || public.html_texto(v_email)
      || ') diz que a <strong>' || public.html_texto(a.name) || '</strong>, fechada no GuiaTennis, reabriu, e quer administrá-la.')
    || coalesce(public.email_p('Detalhes: ' || public.html_texto(v_detalhes) || '.'), '')
    || public.email_p('Confira se ela reabriu (Google, Instagram, telefone) e responda em <strong>Pendências</strong>: reabrir ou recusar.'),
    coalesce(x.nome_responsavel, v_email) || ' (' || v_email || ') diz que a ' || a.name
      || ', fechada no GuiaTennis, reabriu, e quer administrá-la.' || coalesce(' Detalhes: ' || v_detalhes || '.', ''));
  return 'pedido';
end $$;

create or replace function public.cancelar_reabertura(p_academia uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.pedidos_de_reabertura set resolvido_em = now(), resolucao = 'cancelado'
    where academia_id = p_academia and user_id = auth.uid() and resolvido_em is null;
$$;

-- Admin: as fechadas (com quem administrava), os pedidos e as decisões.
create or replace function public.academias_fechadas_admin()
returns table (academia_id uuid, nome text, bairro text, cidade text, fechada_em timestamptz, emails text[],
  avaliacoes int, publicada_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.bairro, a.cidade, a.fechada_em, coalesce(a.fechada_emails, '{}'),
    (select count(*)::int from public.avaliacoes v where v.academia_id = a.id), a.publicada_em
  from public.academias a
  where public.eh_admin() and a.status = 'fechada'
  order by a.fechada_em desc nulls last;
$$;

create or replace function public.pedidos_de_reabertura_admin()
returns table (id uuid, academia_id uuid, nome text, bairro text, cidade text, fechada_em timestamptz,
  quem text, email text, whatsapp text, detalhes text, criado_em timestamptz, emails_antes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, a.id, a.name, a.bairro, a.cidade, a.fechada_em,
    x.nome_responsavel, coalesce(x.email, u.email), x.whatsapp, p.detalhes, p.criado_em, coalesce(a.fechada_emails, '{}')
  from public.pedidos_de_reabertura p
  join public.academias a on a.id = p.academia_id
  left join public.academia_acessos x on x.user_id = p.user_id
  left join auth.users u on u.id = p.user_id
  where public.eh_admin() and p.resolvido_em is null
  order by p.criado_em;
$$;

create or replace function public.resolver_reabertura_admin(p_id uuid, p_aprovar boolean, p_resposta text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_de_reabertura;
  a public.academias;
  v_email text;
  v_nome text;
  v_resposta text := nullif(btrim(coalesce(p_resposta, '')), '');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis decide.' using errcode = '42501';
  end if;
  select * into p from public.pedidos_de_reabertura where id = p_id and resolvido_em is null;
  if not found then
    raise exception 'Pedido não encontrado ou já resolvido.' using errcode = '22023';
  end if;
  select * into a from public.academias where id = p.academia_id;
  update public.pedidos_de_reabertura
    set resolvido_em = now(), resolucao = case when p_aprovar then 'reaberta' else 'recusada' end, resposta = v_resposta
    where id = p_id;
  if p_aprovar and a.status = 'fechada' then
    perform public.academia_volta_ao_guia(a.id, p.user_id, false);
  end if;
  select coalesce(x.email, u.email), x.nome_responsavel into v_email, v_nome
    from auth.users u left join public.academia_acessos x on x.user_id = u.id where u.id = p.user_id;
  if v_email is not null then
    perform public.por_na_fila('reabertura-resposta:' || p_id, 'reabertura_resposta', v_email,
      case when p_aprovar then 'A ' || a.name || ' voltou ao GuiaTennis' else 'A ' || a.name || ' continua fechada no GuiaTennis' end,
      public.email_montado(case when p_aprovar then 'A academia voltou ao Guia' else 'A academia continua fechada' end,
        public.email_p('Olá' || coalesce(', ' || public.html_texto(split_part(btrim(v_nome), ' ', 1)), '') || '!')
        || case when p_aprovar
             then public.email_p('Conferimos que a <strong>' || public.html_texto(a.name) || '</strong> reabriu: ela voltou ao GuiaTennis, e você administra a ficha. Confira os dados e salve: assim o jogador vê que está tudo certo.')
             else public.email_p('Não conseguimos confirmar que a <strong>' || public.html_texto(a.name) || '</strong> reabriu, e ela continua fechada no GuiaTennis.')
                  || coalesce(public.email_p(public.html_texto(v_resposta)), '') end,
        'Abrir o GuiaTennis Parceiros', public.site_dos_emails() || '/parceiros', 'Aviso automático do GuiaTennis Parceiros.'),
      case when p_aprovar
        then 'Conferimos que a ' || a.name || ' reabriu: ela voltou ao GuiaTennis, e você administra a ficha. Confira os dados e salve.'
        else 'Não conseguimos confirmar que a ' || a.name || ' reabriu, e ela continua fechada no GuiaTennis.' || coalesce(E'\n\n' || v_resposta, '') end);
  end if;
end $$;

create or replace function public.reabrir_academia_admin(p_academia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis reabre uma academia.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.academias where id = p_academia and status = 'fechada') then
    raise exception 'Essa academia não está fechada.' using errcode = '22023';
  end if;
  perform public.academia_volta_ao_guia(p_academia, null, false);
end $$;

-- A lista de revisar diz também quando a academia reabriu.
drop function if exists public.academias_para_revisar_admin();
create or replace function public.academias_para_revisar_admin()
returns table (id uuid, nome text, bairro text, cidade text, no_ar_desde timestamptz,
  quem text, email text, whatsapp text, declarou_em timestamptz, reaberta_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.bairro, a.cidade, a.revisar_desde,
    coalesce(x.nome_responsavel, a.nome_solicitante),
    coalesce(x.email, x.usuario, a.contato_solicitante), x.whatsapp, v.declarou_em, a.reaberta_em
  from public.academias a
  left join public.academia_vinculos v on v.academia_id = a.id and v.papel = 'principal'
  left join public.academia_acessos x on x.user_id = v.user_id
  where public.eh_admin() and a.revisar_desde is not null
  order by a.revisar_desde desc;
$$;

-- 3. Tudo o que chega ao admin, no painel --------------------------------------
-- Os e-mails que o banco mandou (ou vai mandar) ao admin, do mais novo ao
-- mais antigo: o painel lista como avisos, com o lugar de cada um.
create or replace function public.avisos_do_admin(p_dias int default 30)
returns table (id uuid, tipo text, assunto text, criado_em timestamptz, enviado_em timestamptz, erro text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.tipo, e.assunto, e.criado_em, e.enviado_em, e.erro
  from public.emails_a_enviar e
  where public.eh_admin()
    and lower(e.para) = lower(coalesce((select c.admin from public.emails_configuracao c where c.id), 'guiatennis1@gmail.com'))
    and e.criado_em > now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 60))
  order by e.criado_em desc
  limit 200;
$$;

-- "Pedir análise" da academia: no painel, junto das denúncias (antes, uma
-- mensagem no WhatsApp do Breno).
alter table public.denuncias_de_avaliacao add column if not exists da_academia boolean not null default false;
alter table public.denuncias_de_avaliacao add column if not exists detalhes text;
alter table public.denuncias_de_avaliacao drop constraint if exists denuncias_detalhes_ok;
alter table public.denuncias_de_avaliacao add constraint denuncias_detalhes_ok
  check (detalhes is null or char_length(detalhes) <= 500);

create or replace function public.pedir_analise_da_avaliacao(p_avaliacao uuid, p_motivo text, p_detalhes text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.avaliacoes;
  a public.academias;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
begin
  select * into v from public.avaliacoes where id = p_avaliacao;
  if not found then
    raise exception 'Avaliação não encontrada.' using errcode = '22023';
  end if;
  if not public.administro_a_academia(v.academia_id) then
    raise exception 'Só quem administra a academia pede a análise.' using errcode = '42501';
  end if;
  if coalesce(p_motivo, '') not in ('falsa', 'ofensiva', 'propaganda', 'conflito', 'pessoal') then
    raise exception 'Escolha o motivo.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'Os detalhes cabem em até 500 letras.' using errcode = '22023';
  end if;
  insert into public.denuncias_de_avaliacao (avaliacao_id, user_id, motivo, da_academia, detalhes)
  values (p_avaliacao, auth.uid(), p_motivo, true, v_detalhes)
  on conflict (avaliacao_id, user_id) do update
    set motivo = excluded.motivo, da_academia = true, detalhes = excluded.detalhes,
        criado_em = now(), resolvido_em = null, resolucao = null;
  select * into a from public.academias where id = v.academia_id;
  perform public.aviso_ao_admin('analise:' || p_avaliacao || ':' || public.hoje_em_brasilia(),
    'analise_pedida', 'A academia pediu análise de uma avaliação: ' || coalesce(a.name, 'academia'), 'Análise de avaliação pedida',
    public.email_p('A <strong>' || public.html_texto(coalesce(a.name, 'academia')) || '</strong> pediu a análise de uma avaliação ('
      || v.stars || ' de 5, de ' || public.html_texto(coalesce(v.nome_autor, 'um jogador')) || '): '
      || public.html_texto(public.nome_da_denuncia(p_motivo)) || '.')
    || coalesce(public.email_p('Detalhes: ' || public.html_texto(v_detalhes) || '.'), '')
    || public.email_p('Confira em <strong>Pendências</strong> › "Avaliações denunciadas": manter ou remover.'),
    'A ' || coalesce(a.name, 'academia') || ' pediu a análise de uma avaliação (' || v.stars || ' de 5): '
      || public.nome_da_denuncia(p_motivo) || '.' || coalesce(' Detalhes: ' || v_detalhes || '.', ''));
  return 'ok';
end $$;

drop function if exists public.denuncias_admin();
create or replace function public.denuncias_admin()
returns table (avaliacao_id uuid, academia_id uuid, academia text, stars int, comentario text, autor text,
  avaliada_em timestamptz, denuncias int, motivos text[], primeira_em timestamptz, da_academia boolean, detalhes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.academia_id, a.name, v.stars, v.comment, v.nome_autor, v.created_at,
    count(*)::int, array_agg(distinct d.motivo), min(d.criado_em), bool_or(d.da_academia),
    array_remove(array_agg(d.detalhes), null)
  from public.denuncias_de_avaliacao d
  join public.avaliacoes v on v.id = d.avaliacao_id
  left join public.academias a on a.id = v.academia_id
  where public.eh_admin() and d.resolvido_em is null
  group by v.id, a.name
  order by bool_or(d.da_academia) desc, count(*) desc, min(d.criado_em);
$$;

-- Permissões ---------------------------------------------------------------
revoke all on function public.guardar_academia_fechada(uuid) from public, anon, authenticated;
revoke all on function public.academia_volta_ao_guia(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.vinculo_com_academia_aberta() from public, anon, authenticated;
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.resolver_pedido_para_sair(uuid, boolean, text)', 'public.academias_fechadas()',
    'public.reabrir_academia(uuid, text, boolean)', 'public.cancelar_reabertura(uuid)',
    'public.academias_fechadas_admin()', 'public.pedidos_de_reabertura_admin()',
    'public.resolver_reabertura_admin(uuid, boolean, text)', 'public.reabrir_academia_admin(uuid)',
    'public.academias_para_revisar_admin()', 'public.avisos_do_admin(int)',
    'public.pedir_analise_da_avaliacao(uuid, text, text)', 'public.denuncias_admin()'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
