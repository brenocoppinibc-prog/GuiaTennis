-- ============================================================
-- Promoções das academias Premium (pedido do Breno em 08/10/2026: "quero
-- colocar em ação que academias com Premium divulgue promoções")
-- ============================================================
-- Era o "Em breve" do Premium ("Promoções na ficha e avisos para os seus
-- jogadores"). Agora:
--
--   promocoes            a promoção: título, detalhes e até quando vale.
--                        O site lê só as que estão valendo, de academia
--                        Premium no ar (promocao_visivel). Até 3 valendo
--                        por academia; validade de até 90 dias.
--   salvar_promocao      cria ou muda (quem administra a academia, só no
--                        Premium). A promoção nova avisa por e-mail quem
--                        favoritou a academia e ligou "Promoções das
--                        academias" na conta — no máximo um aviso por
--                        academia a cada 7 dias.
--   apagar_promocao      quem administra a academia ou o admin.
--   promocoes_da_minha_academia  as da academia, também as encerradas, com
--                        quantas pessoas o e-mail avisou.
--   parar_avisos         ganha o aviso 'promocoes' (o link do e-mail).
--
-- Pode rodar de novo sem estragar nada.

create table if not exists public.promocoes (
  id uuid primary key default gen_random_uuid(),
  academia_id uuid not null references public.academias(id) on delete cascade,
  titulo text not null,
  detalhes text,
  valida_ate date not null,
  criada_por uuid references auth.users(id) on delete set null,
  avisados integer not null default 0,
  avisada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.promocoes drop constraint if exists promocoes_texto_ok;
alter table public.promocoes add constraint promocoes_texto_ok
  check (char_length(btrim(titulo)) between 3 and 60 and (detalhes is null or char_length(detalhes) <= 280));
create index if not exists promocoes_da_academia on public.promocoes (academia_id, valida_ate);

-- Valendo hoje, de academia Premium no ar. Função à parte porque o visitante
-- não lê a linha inteira da academia.
create or replace function public.promocao_visivel(p_academia uuid, p_valida_ate date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_valida_ate >= public.hoje_em_brasilia()
     and exists (select 1 from public.academias a
                 where a.id = p_academia and a.plano = 'premium' and public.academia_no_ar(a));
$$;

alter table public.promocoes enable row level security;
revoke all on public.promocoes from anon, authenticated;
grant select (id, academia_id, titulo, detalhes, valida_ate, created_at) on public.promocoes to anon, authenticated;
drop policy if exists promocoes_valendo on public.promocoes;
create policy promocoes_valendo on public.promocoes for select to anon, authenticated
  using (public.promocao_visivel(academia_id, valida_ate));

-- O aviso por e-mail da promoção nova ------------------------------------
-- Para quem favoritou a academia (jogadores.guardados → favoritas), ligou
-- "Promoções das academias" e confirmou o e-mail; nunca para quem administra
-- a academia. Uma academia avisa no máximo uma vez a cada 7 dias: a promoção
-- seguinte aparece na ficha, sem e-mail. Devolve 'enviado', 'semana' ou
-- 'ninguem'.
create or replace function public.avisar_promocao(p_promocao uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.promocoes;
  a public.academias;
  j record;
  v_link text;
  v_parar text;
  v_primeiro text;
  v_caixa text;
  v_n int := 0;
begin
  select * into p from public.promocoes where id = p_promocao;
  if not found then
    return null;
  end if;
  select * into a from public.academias where id = p.academia_id;
  if exists (select 1 from public.promocoes x
             where x.academia_id = p.academia_id and x.id <> p.id
               and x.avisada_em > now() - interval '7 days') then
    return 'semana';
  end if;
  v_link := public.site_dos_emails() || '/academia/' || public.slug_da_academia(a.name, a.id) || '?utm_source=Email-promocao';
  v_caixa := '<div style="margin:6px 0 16px;padding:14px 16px;border:1px solid #D8B865;border-radius:12px;background:#FBF7EC">'
    || '<p style="margin:0;font-size:16px;font-weight:700;color:#1F2A24">' || public.html_texto(p.titulo) || '</p>'
    || case when nullif(btrim(p.detalhes), '') is not null
         then '<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#1F2A24">' || public.html_texto(p.detalhes) || '</p>' else '' end
    || '<p style="margin:8px 0 0;font-size:13px;color:#6B6458">Válida até ' || public.data_por_extenso(p.valida_ate) || '</p></div>';
  for j in
    select x.* from public.jogadores x
    where x.promocoes and x.email_confirmado_em is not null and public.email_valido(x.email)
      and coalesce(x.guardados -> 'favoritas', '[]'::jsonb) ? p.academia_id::text
      and not exists (select 1 from public.academia_vinculos v
                      where v.academia_id = p.academia_id and v.user_id = x.user_id)
  loop
    v_primeiro := split_part(btrim(j.nome), ' ', 1);
    v_parar := public.link_parar_avisos(j.token_avisos, 'promocoes');
    if public.por_na_fila(
      'promocao:' || p.id || ':' || j.user_id, 'promocao', j.email,
      'Promoção na ' || a.name || ': ' || p.titulo,
      public.email_montado('Promoção na ' || public.html_texto(a.name),
        public.email_p('Olá, ' || public.html_texto(v_primeiro) || '! A <strong>' || public.html_texto(a.name)
          || '</strong>, uma das suas academias favoritas no GuiaTennis, está com uma promoção:')
        || v_caixa
        || public.email_p('As condições são combinadas direto com a academia, pelo WhatsApp da ficha.'),
        'Ver a academia', v_link,
        'Você recebe este aviso porque favoritou a academia e pediu, na sua conta do GuiaTennis, avisos de promoções. '
        || '<a href="' || public.html_texto(v_parar) || '" style="color:#6B6458">Não quero mais receber promoções</a>'
        || ' · <a href="' || public.html_texto(public.site_dos_emails() || '/perfil') || '" style="color:#6B6458">Mudar os avisos</a>.'),
      'Olá, ' || v_primeiro || '! A ' || a.name || ', uma das suas academias favoritas no GuiaTennis, está com uma promoção: '
        || p.titulo || coalesce(E'\n' || nullif(btrim(p.detalhes), ''), '')
        || E'\nVálida até ' || public.data_por_extenso(p.valida_ate) || '.'
        || E'\n\nVer a academia: ' || v_link
        || E'\n\nNão quer mais receber promoções? ' || v_parar,
      v_parar) then
      v_n := v_n + 1;
    end if;
  end loop;
  update public.promocoes
    set avisados = v_n, avisada_em = case when v_n > 0 then now() end
    where id = p.id;
  return case when v_n > 0 then 'enviado' else 'ninguem' end;
end $$;

-- Criar ou mudar ------------------------------------------------------------
create or replace function public.salvar_promocao(
  p_academia uuid, p_id uuid, p_titulo text, p_detalhes text, p_valida_ate date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_id uuid := p_id;
  v_hoje date := public.hoje_em_brasilia();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_aviso text;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') <> 'premium' then
    raise exception 'As promoções são do plano Premium.' using errcode = '42501';
  end if;
  if a.status <> 'published' then
    raise exception 'A academia ainda está em análise: a promoção pode ser criada quando ela estiver no ar.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 60 then
    raise exception 'Escreva a promoção em até 60 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 280 then
    raise exception 'Os detalhes cabem em até 280 letras.' using errcode = '22023';
  end if;
  if p_valida_ate is null or p_valida_ate < v_hoje or p_valida_ate > v_hoje + 90 then
    raise exception 'Escolha até quando a promoção vale: de hoje até 90 dias.' using errcode = '22023';
  end if;
  if v_id is null then
    if (select count(*) from public.promocoes
        where academia_id = p_academia and valida_ate >= v_hoje) >= 3 then
      raise exception 'A academia já tem 3 promoções valendo. Encerre uma para criar outra.' using errcode = '22023';
    end if;
    insert into public.promocoes (academia_id, titulo, detalhes, valida_ate, criada_por)
      values (p_academia, v_titulo, v_detalhes, p_valida_ate, auth.uid())
      returning id into v_id;
    v_aviso := public.avisar_promocao(v_id);
  else
    if (select count(*) from public.promocoes
        where academia_id = p_academia and id <> v_id and valida_ate >= v_hoje) >= 3 then
      raise exception 'A academia já tem 3 promoções valendo. Encerre uma para criar outra.' using errcode = '22023';
    end if;
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = p_valida_ate, updated_at = now()
      where id = v_id and academia_id = p_academia;
    if not found then
      raise exception 'Promoção não encontrada.' using errcode = '22023';
    end if;
  end if;
  return jsonb_build_object('id', v_id, 'aviso', v_aviso,
    'avisados', (select avisados from public.promocoes where id = v_id));
end $$;

-- Encerrar (apagar) ---------------------------------------------------------
create or replace function public.apagar_promocao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia uuid;
begin
  select academia_id into v_academia from public.promocoes where id = p_id;
  if v_academia is null then
    return;
  end if;
  if not public.eh_admin() and not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = v_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  delete from public.promocoes where id = p_id;
end $$;

-- As da academia, para o GuiaTennis Parceiros -------------------------------
create or replace function public.promocoes_da_minha_academia(p_academia uuid)
returns table (id uuid, titulo text, detalhes text, valida_ate date, valendo boolean,
               avisados integer, avisada_em timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.titulo, p.detalhes, p.valida_ate, p.valida_ate >= public.hoje_em_brasilia(),
         p.avisados, p.avisada_em, p.created_at
  from public.promocoes p
  where p.academia_id = p_academia
    and (public.eh_admin() or exists (select 1 from public.academia_vinculos v
                                      where v.user_id = auth.uid() and v.academia_id = p_academia))
  order by p.valida_ate >= public.hoje_em_brasilia() desc, p.valida_ate desc, p.created_at desc
  limit 30;
$$;

-- O link "Não quero mais receber promoções" do e-mail -----------------------
create or replace function public.parar_avisos(p_token uuid, p_aviso text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if p_token is null then
    return null;
  end if;
  select user_id into v_user from public.jogadores where token_avisos = p_token;
  if v_user is not null then
    if p_aviso = 'viagem' then
      update public.jogadores set avisos_viagem = false, avisos_mudados_em = now() where user_id = v_user;
      return 'viagem';
    elsif p_aviso = 'novas' then
      update public.jogadores set avisos_academias = false, avisos_mudados_em = now() where user_id = v_user;
      update public.buscas_salvas set avisar = false where user_id = v_user;
      return 'novas';
    elsif p_aviso = 'promocoes' then
      update public.jogadores set promocoes = false, avisos_mudados_em = now() where user_id = v_user;
      return 'promocoes';
    end if;
    update public.jogadores
      set avisos_academias = false, promocoes = false, novidades = false, avisos_viagem = false,
          avisos_mudados_em = now()
      where user_id = v_user;
    update public.buscas_salvas set avisar = false where user_id = v_user;
    return 'todos';
  end if;
  select user_id into v_user from public.academia_acessos where token_avisos = p_token;
  if v_user is not null then
    update public.academia_acessos set avisos_por_email = false, updated_at = now() where user_id = v_user;
    return 'parceiros';
  end if;
  return null;
end $$;

revoke all on function public.promocao_visivel(uuid, date) from public;
grant execute on function public.promocao_visivel(uuid, date) to anon, authenticated;
revoke all on function public.avisar_promocao(uuid) from public, anon, authenticated;
revoke all on function public.salvar_promocao(uuid, uuid, text, text, date) from public, anon;
revoke all on function public.apagar_promocao(uuid) from public, anon;
revoke all on function public.promocoes_da_minha_academia(uuid) from public, anon;
grant execute on function public.salvar_promocao(uuid, uuid, text, text, date),
  public.apagar_promocao(uuid), public.promocoes_da_minha_academia(uuid) to authenticated;
revoke all on function public.parar_avisos(uuid, text) from public;
grant execute on function public.parar_avisos(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
