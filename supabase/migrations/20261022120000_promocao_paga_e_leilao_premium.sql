-- ============================================================
-- Promoção na ficha paga por semana e leilão só do Premium (pedido do Breno
-- em 22/10/2026: "eu quero cobrar para ter promoção na ficha tbm" e
-- "completo tbm pode ter promoção mas não tem desconto nessa parte pagar mais
-- doq o Premium e completo não pode ter acesso ao leilão somente Premium")
-- ============================================================
-- Como o Destaque da OLX e o "Turbinar" do Instagram: escolhe quantas
-- semanas, vê o preço antes e paga com o saldo de créditos (o mesmo do
-- leilão). Escolhas do Breno: um valor único por semana, o preço ainda não
-- definido (o admin muda; começa em R$ 0, sem custo), e o Premium paga menos.
--
--   leilao_config.preco_promocao_semana  o preço da semana da promoção na
--                               ficha (o Completo paga ele; o Premium, com
--                               o desconto_premium, 20%).
--   promocoes.semanas, .pago    quantas semanas foram compradas e quanto
--                               saiu dos créditos.
--   promocoes_liberadas         Completo e Premium.
--   preco_da_promocao           o preço da semana para a academia.
--   salvar_promocao             de 1 a 12 semanas, cobradas na hora; mudar
--                               o texto é livre e dá para somar semanas.
--   apagar_promocao             encerrar devolve as semanas que ainda não
--                               começaram.
--   promocoes_da_minha_academia ganha semanas e pago.
--   meu_leilao                  ganha os preços da promoção na ficha.
--   dar_lance, fechar_leiloes   só o Premium (o desconto do leilão sai: só
--                               o Premium entra).
--   mudar_preco_da_promocao     o admin muda o preço da semana.
-- Pode rodar de novo sem estragar nada.

alter table public.leilao_config add column if not exists preco_promocao_semana integer not null default 0;
alter table public.leilao_config drop constraint if exists leilao_config_preco_promocao_ok;
alter table public.leilao_config add constraint leilao_config_preco_promocao_ok check (preco_promocao_semana >= 0);

alter table public.promocoes add column if not exists semanas integer not null default 0;
alter table public.promocoes add column if not exists pago integer not null default 0;

-- Completo e Premium publicam na ficha ----------------------------------------
create or replace function public.promocoes_liberadas(a public.academias)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(a.plano, 'basico') in ('completo', 'premium');
$$;

create or replace function public.preco_da_promocao(a public.academias)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when c.preco_promocao_semana = 0 then 0
              when a.plano = 'premium' then greatest(1, floor(c.preco_promocao_semana * (1 - c.desconto_premium))::integer)
              else c.preco_promocao_semana end
  from public.leilao_config c where c.id = 1;
$$;

-- Publicar ou mudar -------------------------------------------------------------
drop function if exists public.salvar_promocao(uuid, uuid, text, text, date, boolean);
drop function if exists public.salvar_promocao(uuid, uuid, text, text, date);

create or replace function public.salvar_promocao(
  p_academia uuid, p_id uuid, p_titulo text, p_detalhes text, p_semanas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  p public.promocoes;
  v_id uuid := p_id;
  v_hoje date := public.hoje_em_brasilia();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_semanas integer := coalesce(p_semanas, 0);
  v_preco integer;
  v_ate date;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if not public.promocoes_liberadas(a) then
    raise exception 'As promoções na ficha são dos planos Completo e Premium.' using errcode = '42501';
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
  if v_semanas < 0 or v_semanas > 12 then
    raise exception 'Escolha de 1 a 12 semanas.' using errcode = '22023';
  end if;
  if v_id is not null then
    select * into p from public.promocoes where id = v_id and academia_id = p_academia;
    if not found then
      raise exception 'Promoção não encontrada.' using errcode = '22023';
    end if;
  end if;
  -- Nova ou reaberta: escolhe as semanas. Valendo: o texto muda de graça e
  -- dá para somar semanas.
  if (v_id is null or p.valida_ate < v_hoje) and v_semanas < 1 then
    raise exception 'Escolha de 1 a 12 semanas.' using errcode = '22023';
  end if;
  if exists (select 1 from public.promocoes
             where academia_id = p_academia and valida_ate >= v_hoje
               and (v_id is null or id <> v_id))
     and (v_id is null or p.valida_ate < v_hoje) then
    raise exception 'A academia já tem uma promoção valendo. Altere ou encerre a de agora para publicar outra.' using errcode = '22023';
  end if;
  v_ate := case when v_semanas = 0 then p.valida_ate
                when v_id is null or p.valida_ate < v_hoje then v_hoje + 7 * v_semanas - 1
                else p.valida_ate + 7 * v_semanas end;
  if v_semanas > 0 and v_ate > v_hoje + 83 then
    raise exception 'A promoção vale no máximo 12 semanas à frente.' using errcode = '22023';
  end if;
  v_preco := public.preco_da_promocao(a) * v_semanas;
  if v_preco > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou escolha menos semanas.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  if v_preco > 0 then
    perform public.mexer_creditos(p_academia, -v_preco);
  end if;
  if v_id is null then
    insert into public.promocoes (academia_id, titulo, detalhes, valida_ate, criada_por, semanas, pago)
      values (p_academia, v_titulo, v_detalhes, v_ate, auth.uid(), v_semanas, v_preco)
      returning id into v_id;
  elsif p.valida_ate < v_hoje then
    -- Reabrir conta do zero: as semanas e o pago de antes já acabaram.
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = v_ate, semanas = v_semanas, pago = v_preco,
          created_at = now(), updated_at = now()
      where id = v_id;
  else
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = v_ate,
          semanas = semanas + v_semanas, pago = pago + v_preco, updated_at = now()
      where id = v_id;
  end if;
  return jsonb_build_object('id', v_id, 'valida_ate', v_ate, 'pago', v_preco,
    'creditos', (select envios_de_aviso from public.academias where id = p_academia));
end $$;

-- Encerrar devolve as semanas que ainda não começaram ---------------------------
drop function if exists public.apagar_promocao(uuid);
create or replace function public.apagar_promocao(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.promocoes;
  v_hoje date := public.hoje_em_brasilia();
  v_volta integer := 0;
begin
  select * into p from public.promocoes where id = p_id;
  if not found then
    return 0;
  end if;
  if not public.eh_admin() and not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p.academia_id) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  if p.valida_ate >= v_hoje and p.semanas > 0 and p.pago > 0 then
    v_volta := least(p.pago, ((p.valida_ate - v_hoje) / 7) * (p.pago / p.semanas));
    if v_volta > 0 then
      perform public.mexer_creditos(p.academia_id, v_volta);
    end if;
  end if;
  delete from public.promocoes where id = p_id;
  return v_volta;
end $$;

drop function if exists public.promocoes_da_minha_academia(uuid);
create or replace function public.promocoes_da_minha_academia(p_academia uuid)
returns table (id uuid, titulo text, detalhes text, valida_ate date, valendo boolean,
               avisados integer, avisada_em timestamptz, created_at timestamptz,
               semanas integer, pago integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.titulo, p.detalhes, p.valida_ate, p.valida_ate >= public.hoje_em_brasilia(),
         p.avisados, p.avisada_em, p.created_at, p.semanas, p.pago
  from public.promocoes p
  where p.academia_id = p_academia
    and (public.eh_admin() or exists (select 1 from public.academia_vinculos v
                                      where v.user_id = auth.uid() and v.academia_id = p_academia))
  order by p.valida_ate >= public.hoje_em_brasilia() desc, p.valida_ate desc, p.created_at desc
  limit 30;
$$;

-- O Parceiros: os preços da promoção na ficha vêm junto do saldo ---------------
create or replace function public.meu_leilao(p_academia uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  cfg public.leilao_config;
  v_regiao text;
  v_fecha timestamptz := public.proximo_fechamento();
  l public.lances;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    return null;
  end if;
  select * into a from public.academias where id = p_academia;
  select * into cfg from public.leilao_config where id = 1;
  v_regiao := public.regiao_da_academia(a);
  select * into l from public.lances where academia_id = p_academia and fecha_em = v_fecha and situacao = 'aberto';
  return jsonb_build_object(
    'regiao', v_regiao,
    'regiao_nome', case when v_regiao is null then null else public.nome_da_regiao(a) end,
    'fecha_em', v_fecha,
    'envios', jsonb_build_array(v_fecha + interval '1 day 14 hours', v_fecha + interval '4 days 14 hours'),
    'lance_minimo', cfg.lance_minimo,
    'desconto_premium', cfg.desconto_premium,
    'preco_promocao_semana', cfg.preco_promocao_semana,
    'preco_promocao', public.preco_da_promocao(a),
    'creditos', coalesce(a.envios_de_aviso, 0),
    'alcance', case when v_regiao is null then 0 else (select count(*) from public.destinatarios_da_regiao(v_regiao, p_academia)) end,
    'lance', case when l.id is null then null else public.lance_em_json(l) end,
    'historico', coalesce((select jsonb_agg(public.lance_em_json(h) order by h.fecha_em desc)
                           from (select * from public.lances
                                 where academia_id = p_academia and situacao <> 'aberto'
                                 order by fecha_em desc limit 10) h), '[]'::jsonb));
end $$;

-- O leilão é só do Premium ------------------------------------------------------
create or replace function public.dar_lance(p_academia uuid, p_titulo text, p_mensagem text, p_valor integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  cfg public.leilao_config;
  v_regiao text;
  v_fecha timestamptz := public.proximo_fechamento();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  l public.lances;
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
    raise exception 'O leilão de promoções é do plano Premium.' using errcode = '42501';
  end if;
  if not public.academia_no_ar(a) then
    raise exception 'A academia precisa estar no ar para entrar no leilão.' using errcode = '22023';
  end if;
  v_regiao := public.regiao_da_academia(a);
  if v_regiao is null then
    raise exception 'Para entrar no leilão, a ficha precisa do bairro e da cidade.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 60 then
    raise exception 'Escreva a promoção em até 60 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(v_mensagem) < 10 or char_length(v_mensagem) > 500 then
    raise exception 'A mensagem precisa ter de 10 a 500 letras.' using errcode = '22023';
  end if;
  select * into cfg from public.leilao_config where id = 1;
  if p_valor is null or p_valor < cfg.lance_minimo then
    raise exception 'O lance mínimo é de R$ %.', cfg.lance_minimo using errcode = '22023';
  end if;
  if p_valor > 100000 then
    raise exception 'O lance passa do limite.' using errcode = '22023';
  end if;
  if p_valor > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou dê um lance menor.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  insert into public.lances (academia_id, regiao, regiao_nome, fecha_em, titulo, mensagem, valor, criado_por)
    values (p_academia, v_regiao, public.nome_da_regiao(a), v_fecha, v_titulo, v_mensagem, p_valor, auth.uid())
    on conflict (academia_id, fecha_em) do update
      set titulo = excluded.titulo, mensagem = excluded.mensagem, valor = excluded.valor,
          regiao = excluded.regiao, regiao_nome = excluded.regiao_nome, updated_at = now()
      where public.lances.situacao = 'aberto'
    returning * into l;
  if l.id is null then
    raise exception 'O leilão desta semana já fechou.' using errcode = '22023';
  end if;
  return public.lance_em_json(l);
end $$;

create or replace function public.fechar_leiloes(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.leilao_config;
  r record;
  v_ids uuid[];
  v_notas numeric[];
  v_quals numeric[];
  v_valores integer[];
  v_i integer;
  v_pos integer;
  v_preco integer;
  v_fechados integer := 0;
  a public.academias;
begin
  select * into cfg from public.leilao_config where id = 1;
  for r in select distinct regiao, fecha_em from public.lances where situacao = 'aberto' and fecha_em <= p_agora loop
    -- Quem não está mais no Premium ou no ar sai antes de contar.
    update public.lances l set situacao = 'cancelado', updated_at = now()
      from public.academias x
      where l.regiao = r.regiao and l.fecha_em = r.fecha_em and l.situacao = 'aberto' and x.id = l.academia_id
        and (coalesce(x.plano, 'basico') <> 'premium' or not public.academia_no_ar(x));
    update public.lances l set qualidade = coalesce(public.qualidade_do_lance(l.academia_id, l.mensagem), 0.70)
      where l.regiao = r.regiao and l.fecha_em = r.fecha_em and l.situacao = 'aberto';
    select array_agg(id order by nota desc, created_at), array_agg(nota order by nota desc, created_at),
           array_agg(qualidade order by nota desc, created_at), array_agg(valor order by nota desc, created_at)
      into v_ids, v_notas, v_quals, v_valores
      from (select id, created_at, qualidade, valor, valor * qualidade as nota from public.lances
            where regiao = r.regiao and fecha_em = r.fecha_em and situacao = 'aberto') t;
    v_pos := 0;
    for v_i in 1 .. coalesce(array_length(v_ids, 1), 0) loop
      if v_pos >= 2 then
        update public.lances set situacao = 'perdeu', updated_at = now() where id = v_ids[v_i];
        continue;
      end if;
      -- Paga o necessário para passar o seguinte, mais R$ 1 (como o Google).
      v_preco := case when v_i < array_length(v_ids, 1)
                      then ceil(v_notas[v_i + 1] / v_quals[v_i])::integer + 1
                      else cfg.lance_minimo end;
      v_preco := least(v_valores[v_i], greatest(v_preco, cfg.lance_minimo));
      select x.* into a from public.academias x join public.lances l on l.academia_id = x.id where l.id = v_ids[v_i];
      if coalesce(a.envios_de_aviso, 0) < v_preco then
        update public.lances set situacao = 'sem_saldo', updated_at = now() where id = v_ids[v_i];
        continue;
      end if;
      v_pos := v_pos + 1;
      perform public.mexer_creditos(a.id, -v_preco);
      update public.lances
        set situacao = 'ganhou', posicao = v_pos, preco = v_preco, updated_at = now(),
            envio_em = r.fecha_em + case when v_pos = 1 then interval '1 day 14 hours' else interval '4 days 14 hours' end
        where id = v_ids[v_i];
    end loop;
    v_fechados := v_fechados + 1;
  end loop;
  return v_fechados;
end $$;

-- Lance aberto de quem não é Premium sai já (nada foi cobrado).
update public.lances l set situacao = 'cancelado', updated_at = now()
  from public.academias x
  where l.situacao = 'aberto' and x.id = l.academia_id and coalesce(x.plano, 'basico') <> 'premium';

-- O admin muda o preço da semana --------------------------------------------------
create or replace function public.mudar_preco_da_promocao(p_valor integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin muda o preço da promoção.' using errcode = '42501';
  end if;
  if p_valor is null or p_valor < 0 or p_valor > 10000 then
    raise exception 'O preço da semana vai de R$ 0 a R$ 10.000.' using errcode = '22023';
  end if;
  update public.leilao_config set preco_promocao_semana = p_valor, updated_at = now() where id = 1;
  return p_valor;
end $$;

revoke all on function public.preco_da_promocao(public.academias) from public, anon, authenticated;
revoke all on function public.salvar_promocao(uuid, uuid, text, text, integer) from public, anon;
grant execute on function public.salvar_promocao(uuid, uuid, text, text, integer) to authenticated;
revoke all on function public.apagar_promocao(uuid) from public, anon;
grant execute on function public.apagar_promocao(uuid) to authenticated;
revoke all on function public.promocoes_da_minha_academia(uuid) from public, anon;
grant execute on function public.promocoes_da_minha_academia(uuid) to authenticated;
revoke all on function public.mudar_preco_da_promocao(integer) from public, anon;
grant execute on function public.mudar_preco_da_promocao(integer) to authenticated;

notify pgrst, 'reload schema';
