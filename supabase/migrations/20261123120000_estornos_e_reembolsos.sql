-- Regra 316 (23/11/2026): estornos e pedidos de reembolso ("existe algo para eu
-- conseguir conectar o extrato da conta com os créditos ou pagamento? por
-- exemplo, … estornar um dinheiro e esse crédito ainda continuar?"; "sim, opção
-- a e em pagamentos faça uma solicitação para pedirem reembolso").
-- Como a Shopify e a Stripe: o estorno desfaz a compra no site.
--   * Estorno pelo admin (Compras e notas › "Estornar"): sugere devolver só os
--     créditos ainda não usados (opção a); a função pagamento.mjs devolve no
--     Mercado Pago e o banco tira os créditos ou encurta o plano.
--   * Estorno feito no Mercado Pago ou contestação no cartão: o aviso do
--     Mercado Pago (ou "Conferir com o Mercado Pago") faz o mesmo sozinho.
--   * A academia pede o reembolso em Pagamentos › "Pedir reembolso"; o admin
--     estorna ou recusa, com a resposta por e-mail.

alter table public.compras_de_creditos add column if not exists valor_estornado numeric not null default 0;
alter table public.compras_de_creditos add column if not exists creditos_tirados integer not null default 0;
alter table public.compras_de_creditos add column if not exists estornada_em timestamptz;
alter table public.compras_de_creditos add column if not exists estorno_origem text;
alter table public.compras_de_creditos add column if not exists estorno_motivo text;
alter table public.compras_de_creditos add column if not exists estorno_pedido_valor numeric;
alter table public.compras_de_creditos add column if not exists estorno_pedido_em timestamptz;

do $$
declare
  r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.compras_de_creditos'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%situacao%' loop
    execute 'alter table public.compras_de_creditos drop constraint ' || quote_ident(r.conname);
  end loop;
  alter table public.compras_de_creditos add constraint compras_de_creditos_situacao_check
    check (situacao in ('aberta', 'paga', 'recusada', 'estornada'));
end $$;

create table if not exists public.pedidos_de_reembolso (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras_de_creditos (id) on delete cascade,
  academia_id uuid not null references public.academias (id) on delete cascade,
  user_id uuid,
  motivo text not null check (char_length(motivo) between 5 and 1000),
  situacao text not null default 'aberto' check (situacao in ('aberto', 'reembolsado', 'recusado')),
  resposta text,
  created_at timestamptz not null default now(),
  resolvido_em timestamptz
);
create unique index if not exists pedidos_de_reembolso_um_aberto on public.pedidos_de_reembolso (compra_id) where situacao = 'aberto';
alter table public.pedidos_de_reembolso enable row level security;
revoke all on public.pedidos_de_reembolso from anon, authenticated;

-- Os créditos que a compra deu (no Pix, 5% a mais; regra 304).
create or replace function public.creditos_da_compra(c public.compras_de_creditos)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when c.tipo = 'plano' then 0
              else c.valor + case when c.forma = 'pix' then public.bonus_do_pix(c.valor) else 0 end end;
$$;

-- Quanto devolver (opção a): nos créditos, só os ainda não usados, em reais e
-- na mesma proporção do que foi pago; no plano, até 7 dias depois do pagamento,
-- tudo (CDC, art. 49); no anual, depois disso, os meses inteiros que faltam,
-- com os usados pelo preço do mensal (Termos de Uso).
create or replace function public.estorno_sugerido(p_compra uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_recebidos integer;
  v_saldo integer;
  v_nao_usados integer;
  v_pago numeric;
  v_sugerido numeric := 0;
  v_regra text;
  v_meses integer;
  v_mensal integer;
begin
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found then
    raise exception 'Compra não encontrada.' using errcode = '22023';
  end if;
  if not (public.eh_admin() or public.posso(c.academia_id, 'pagamentos') or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  v_pago := coalesce(c.valor_pago, c.valor) - c.valor_estornado;
  if c.situacao <> 'paga' or v_pago <= 0 then
    return jsonb_build_object('valor_pago', c.valor, 'restante', 0, 'sugerido', 0, 'regra', 'Compra sem valor a devolver.');
  end if;
  if c.tipo = 'plano' then
    if c.paga_em > now() - interval '7 days' then
      v_sugerido := v_pago;
      v_regra := 'Até 7 dias depois do pagamento, a devolução é integral.';
    elsif c.periodo = 'anual' then
      select valor into v_mensal from public.precos_dos_planos where plano = c.plano and periodo = 'mensal';
      v_meses := ceil(extract(epoch from (now() - c.paga_em)) / (30.44 * 86400))::integer;
      v_sugerido := greatest(0, v_pago - v_meses * coalesce(v_mensal, 0));
      v_regra := 'No anual, os meses que faltam, com os ' || v_meses || ' meses usados pelo preço do mensal.';
    else
      v_regra := 'Depois de 7 dias, o mensal não tem devolução: o plano fica até o fim do mês pago.';
    end if;
    return jsonb_build_object('tipo', 'plano', 'valor_pago', c.valor, 'restante', v_pago, 'sugerido', round(v_sugerido, 2), 'regra', v_regra);
  end if;
  v_recebidos := public.creditos_da_compra(c) - c.creditos_tirados;
  select coalesce(envios_de_aviso, 0) into v_saldo from public.academias where id = c.academia_id;
  v_nao_usados := greatest(0, least(v_saldo, v_recebidos));
  if v_recebidos > 0 then
    v_sugerido := floor(v_pago * v_nao_usados / v_recebidos * 100) / 100;
  end if;
  return jsonb_build_object('tipo', 'creditos', 'valor_pago', c.valor, 'restante', v_pago, 'creditos_recebidos', v_recebidos,
    'creditos_nao_usados', v_nao_usados, 'sugerido', v_sugerido,
    'regra', case when v_nao_usados >= v_recebidos then 'Nenhum crédito desta compra foi usado: a devolução é integral.'
                  else 'Devolução dos créditos ainda não usados (R$ ' || v_nao_usados || ' de R$ ' || v_recebidos || '). Créditos usados não são devolvidos.' end);
end $$;
revoke all on function public.estorno_sugerido(uuid) from public, anon;
grant execute on function public.estorno_sugerido(uuid) to authenticated;

-- O estorno no banco, uma vez por valor (p_total = quanto já foi devolvido no
-- total, como o Mercado Pago informa): tira os créditos na mesma proporção, ou
-- encurta o plano (devolução integral encerra o plano e a renovação
-- automática), e avisa a academia e o admin.
create or replace function public.aplicar_estorno(p_compra uuid, p_total numeric, p_origem text, p_motivo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_pago numeric;
  v_total numeric;
  v_delta numeric;
  v_tirar integer;
  v_dias numeric;
  s public.assinaturas;
  v_academia text;
  v_texto text;
  v_que text;
  v_link text;
  r record;
begin
  select * into c from public.compras_de_creditos where id = p_compra for update;
  if not found then
    return 'nao_achou';
  end if;
  if c.situacao not in ('paga', 'estornada') then
    return c.situacao;
  end if;
  v_pago := coalesce(c.valor_pago, c.valor);
  v_total := least(coalesce(p_total, 0), v_pago);
  if v_total <= c.valor_estornado then
    return case when c.situacao = 'estornada' then 'estornada' else 'sem_mudanca' end;
  end if;
  v_delta := v_total - c.valor_estornado;
  if c.tipo = 'plano' then
    select * into s from public.assinaturas where academia_id = c.academia_id and plano = c.plano and encerrada_em is null;
    if found then
      if v_total >= v_pago then
        v_dias := case when c.periodo = 'anual' then 365 else 30 end;
      else
        v_dias := round(v_delta / v_pago * case when c.periodo = 'anual' then 365 else 30 end);
      end if;
      if s.ate - (v_dias * interval '1 day') <= now() then
        update public.assinaturas set encerrada_em = now(), teste = false, updated_at = now() where academia_id = c.academia_id;
        update public.cobrancas_automaticas set desejada = 'cancelada', updated_at = now()
          where academia_id = c.academia_id and desejada <> 'cancelada';
        if (select coalesce(plano, 'basico') from public.academias where id = c.academia_id) = s.plano then
          perform public.trocar_plano_da_assinatura(c.academia_id, s.depois);
        end if;
      else
        update public.assinaturas set ate = ate - (v_dias * interval '1 day'), aviso_em = null, updated_at = now()
          where academia_id = c.academia_id;
      end if;
    end if;
    if v_total >= v_pago then
      update public.cobrancas_automaticas set desejada = 'cancelada', updated_at = now()
        where academia_id = c.academia_id and desejada <> 'cancelada';
    end if;
  else
    v_tirar := round(public.creditos_da_compra(c) * v_total / v_pago)::integer - c.creditos_tirados;
    if v_tirar > 0 then
      perform public.mexer_creditos(c.academia_id, -v_tirar);
    end if;
  end if;
  update public.compras_de_creditos set
      valor_estornado = v_total, creditos_tirados = creditos_tirados + greatest(coalesce(v_tirar, 0), 0),
      estornada_em = now(), estorno_origem = coalesce(p_origem, 'admin'),
      estorno_motivo = coalesce(nullif(btrim(p_motivo), ''), estorno_motivo),
      situacao = case when v_total >= v_pago then 'estornada' else situacao end, updated_at = now()
    where id = c.id;
  update public.pedidos_de_reembolso set situacao = 'reembolsado', resolvido_em = now()
    where compra_id = c.id and situacao = 'aberto';
  -- Os avisos.
  begin
    select name into v_academia from public.academias where id = c.academia_id;
    v_que := case when c.tipo = 'plano'
      then 'do plano ' || public.nome_do_plano(c.plano) || case when c.periodo = 'anual' then ' anual' else ' mensal' end
      else 'dos créditos de promoções' end;
    v_link := public.site_dos_emails() || '/parceiros/pagamentos?abrir=' || right(replace(c.academia_id::text, '-', ''), 8) || '&utm_source=Email-reembolso';
    v_texto := 'O reembolso de R$ ' || replace(to_char(v_delta, 'FM999990.00'), '.', ',') || ' da compra ' || v_que || ' da ' || v_academia
      || ' foi feito pelo Mercado Pago, no mesmo meio de pagamento'
      || case when c.forma = 'cartao' then ' (no cartão, o valor aparece na fatura em até duas faturas)' else '' end || '. '
      || case when c.tipo = 'plano' then 'O prazo do plano foi ajustado.' else 'Os créditos correspondentes saíram do saldo.' end;
    for r in select * from public.principais_da_academia(c.academia_id) loop
      perform public.por_na_fila('reembolso:' || c.id || ':' || v_total || ':' || r.user_id, 'compra_paga', r.email,
        'Reembolso na ' || v_academia || ': R$ ' || replace(to_char(v_delta, 'FM999990.00'), '.', ','),
        public.email_montado('Reembolso feito', public.email_p(public.html_texto(v_texto)), 'Ver os pagamentos', v_link,
          'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_academia) || ' no GuiaTennis Parceiros.'),
        v_texto || E'\n\n' || v_link);
    end loop;
    if coalesce(p_origem, 'admin') <> 'admin' or c.nota_emitida_em is not null then
      perform public.aviso_ao_admin('estorno:' || c.id || ':' || v_total, 'nota_a_emitir',
        case when p_origem = 'contestacao' then 'Contestação no cartão: ' else 'Estorno: ' end || v_academia || ', R$ ' || replace(to_char(v_delta, 'FM999990.00'), '.', ','),
        'Estorno registrado',
        public.email_p(public.html_texto(v_academia || ': R$ ' || replace(to_char(v_delta, 'FM999990.00'), '.', ',') || ' ' || v_que || ' '
          || case p_origem when 'contestacao' then 'foram contestados no cartão.' when 'mercadopago' then 'foram devolvidos pelo Mercado Pago.' else 'foram devolvidos.' end
          || case when c.nota_emitida_em is not null then ' A nota fiscal já foi emitida: cancele ou ajuste no Emissor Nacional.' else '' end)),
        v_academia || ': R$ ' || v_delta || ' ' || v_que || ' devolvidos.' || case when c.nota_emitida_em is not null then ' Cancele ou ajuste a nota no Emissor Nacional.' else '' end,
        'compras');
    end if;
  exception when others then
    raise warning 'aviso de estorno: %', sqlerrm;
  end;
  return case when v_total >= v_pago then 'estornada' else 'parcial' end;
end $$;

-- Para a função do Netlify: o estorno que o Mercado Pago informou (pelo id do
-- pagamento) e o que o admin pediu.
create or replace function public.registrar_estorno(p_gateway_id text, p_total numeric, p_origem text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.compras_de_creditos where gateway_id = p_gateway_id and situacao in ('paga', 'estornada')
    order by created_at desc limit 1;
  if v_id is null then
    return 'nao_achou';
  end if;
  return public.aplicar_estorno(v_id, p_total, p_origem, null);
end $$;

create or replace function public.estorno_para_fazer(p_compra uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', id, 'gateway_id', gateway_id, 'pedido', estorno_pedido_valor,
    'estornado', valor_estornado, 'situacao', situacao, 'de_teste', de_teste)
  from public.compras_de_creditos where id = p_compra;
$$;

create or replace function public.compras_para_conferir()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'gateway_id', gateway_id)), '[]'::jsonb)
  from (select id, gateway_id from public.compras_de_creditos
        where situacao = 'paga' and not de_teste and gateway_id ~ '^\d+$' and paga_em > now() - interval '180 days'
        order by paga_em desc limit 200) x;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['aplicar_estorno(uuid, numeric, text, text)', 'registrar_estorno(text, numeric, text)',
                           'estorno_para_fazer(uuid)', 'compras_para_conferir()', 'creditos_da_compra(public.compras_de_creditos)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon, authenticated';
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute 'grant execute on function public.' || f || ' to service_role';
    end if;
  end loop;
end $$;

-- O admin pede o estorno (Compras e notas › "Estornar"): o valor que falta
-- devolver, no máximo o que foi pago. A compra de teste (sem Mercado Pago) é
-- estornada na hora; a de verdade, pela função do Netlify.
create or replace function public.pedir_estorno(p_compra uuid, p_valor numeric, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_total numeric;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin estorna.' using errcode = '42501';
  end if;
  select * into c from public.compras_de_creditos where id = p_compra for update;
  if not found or c.situacao <> 'paga' then
    raise exception 'Compra paga não encontrada.' using errcode = '22023';
  end if;
  if coalesce(p_valor, 0) <= 0 or c.valor_estornado + p_valor > coalesce(c.valor_pago, c.valor) then
    raise exception 'Valor inválido: no máximo R$ %.', replace(to_char(coalesce(c.valor_pago, c.valor) - c.valor_estornado, 'FM999990.00'), '.', ',') using errcode = '22023';
  end if;
  v_total := c.valor_estornado + round(p_valor, 2);
  update public.compras_de_creditos set estorno_pedido_valor = v_total, estorno_pedido_em = now(),
      estorno_motivo = coalesce(nullif(btrim(p_motivo), ''), estorno_motivo), updated_at = now()
    where id = c.id;
  if c.de_teste then
    return public.aplicar_estorno(c.id, v_total, 'admin', p_motivo);
  end if;
  return 'mercadopago';
end $$;
revoke all on function public.pedir_estorno(uuid, numeric, text) from public, anon;
grant execute on function public.pedir_estorno(uuid, numeric, text) to authenticated;

-- A academia pede o reembolso (Pagamentos › "Pedir reembolso").
create or replace function public.pedir_reembolso(p_compra uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_id uuid;
  v_academia text;
  v_quem text;
  v_texto text;
begin
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found or not public.posso(c.academia_id, 'pagamentos') then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  if c.situacao <> 'paga' then
    raise exception 'Só uma compra paga pode ter reembolso.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Conte o motivo do pedido.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pedidos_de_reembolso where compra_id = c.id and situacao = 'aberto') then
    raise exception 'Já existe um pedido de reembolso desta compra em análise.' using errcode = '22023';
  end if;
  insert into public.pedidos_de_reembolso (compra_id, academia_id, user_id, motivo)
    values (c.id, c.academia_id, auth.uid(), left(btrim(p_motivo), 1000))
    returning id into v_id;
  begin
    select name into v_academia from public.academias where id = c.academia_id;
    v_quem := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = auth.uid()), 'Alguém da academia');
    v_texto := v_quem || ', da ' || v_academia || ', pediu o reembolso da compra de R$ ' || c.valor
      || case when c.tipo = 'plano' then ' (plano ' || public.nome_do_plano(c.plano) || ')' else ' (créditos)' end || '. Motivo: ' || left(btrim(p_motivo), 1000);
    perform public.aviso_ao_admin('pedido-reembolso:' || v_id, 'nota_a_emitir', 'Pedido de reembolso: ' || v_academia || ', R$ ' || c.valor,
      'Pedido de reembolso', public.email_p(public.html_texto(v_texto)) || public.email_p('Estorne ou recuse em Compras e notas.'),
      v_texto || E'\n\nEstorne ou recuse em Compras e notas.', 'compras');
  exception when others then
    raise warning 'aviso de reembolso: %', sqlerrm;
  end;
  return v_id;
end $$;
revoke all on function public.pedir_reembolso(uuid, text) from public, anon;
grant execute on function public.pedir_reembolso(uuid, text) to authenticated;

create or replace function public.recusar_reembolso(p_pedido uuid, p_resposta text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_de_reembolso;
  v_academia text;
  v_texto text;
  v_link text;
  r record;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin responde aos pedidos.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_resposta, ''))) < 5 then
    raise exception 'Escreva a resposta para a academia.' using errcode = '22023';
  end if;
  update public.pedidos_de_reembolso set situacao = 'recusado', resposta = left(btrim(p_resposta), 1000), resolvido_em = now()
    where id = p_pedido and situacao = 'aberto'
    returning * into p;
  if not found then
    raise exception 'Pedido em análise não encontrado.' using errcode = '22023';
  end if;
  select name into v_academia from public.academias where id = p.academia_id;
  v_link := public.site_dos_emails() || '/parceiros/pagamentos?abrir=' || right(replace(p.academia_id::text, '-', ''), 8) || '&utm_source=Email-reembolso';
  v_texto := 'O pedido de reembolso da ' || v_academia || ' foi analisado e não foi aprovado. Resposta do GuiaTennis: ' || p.resposta;
  for r in select * from public.principais_da_academia(p.academia_id) loop
    perform public.por_na_fila('reembolso-recusado:' || p.id || ':' || r.user_id, 'compra_paga', r.email,
      'Pedido de reembolso da ' || v_academia,
      public.email_montado('Pedido de reembolso', public.email_p(public.html_texto(v_texto)), 'Ver os pagamentos', v_link,
        'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_academia) || ' no GuiaTennis Parceiros.'),
      v_texto || E'\n\n' || v_link);
  end loop;
end $$;
revoke all on function public.recusar_reembolso(uuid, text) from public, anon;
grant execute on function public.recusar_reembolso(uuid, text) to authenticated;

-- As compras da academia (Pagamentos), agora com o reembolso.
create or replace function public.minhas_compras(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.posso(p_academia, 'pagamentos')
    then coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'valor', c.valor, 'forma', c.forma,
                     'situacao', c.situacao, 'created_at', c.created_at, 'paga_em', c.paga_em,
                     'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo, 'de_teste', c.de_teste,
                     'nota_emitida_em', c.nota_emitida_em, 'nota_email', c.nota_email,
                     'valor_estornado', c.valor_estornado, 'estornada_em', c.estornada_em,
                     'reembolso', (select jsonb_build_object('situacao', p.situacao, 'created_at', p.created_at, 'resposta', p.resposta)
                                   from public.pedidos_de_reembolso p where p.compra_id = c.id order by p.created_at desc limit 1),
                     'quem', (select coalesce(nullif(btrim(x.nome_responsavel), ''), x.email)
                              from public.academia_acessos x where x.user_id = c.user_id)) order by c.created_at desc)
                   from (select * from public.compras_de_creditos where academia_id = p_academia
                         order by created_at desc limit 20) c), '[]'::jsonb)
    else null end;
$$;

-- Compras e notas (admin), agora com os estornos e os pedidos de reembolso.
create or replace function public.compras_do_admin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin vê as compras.' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'academia_id', c.academia_id, 'academia', a.name,
                     'valor', c.valor, 'forma', c.forma, 'situacao', c.situacao, 'created_at', c.created_at,
                     'paga_em', c.paga_em, 'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo, 'de_teste', c.de_teste,
                     'nota_documento', c.nota_documento, 'nota_nome', c.nota_nome, 'nota_email', c.nota_email,
                     'nota_emitida_em', c.nota_emitida_em, 'gateway_id', c.gateway_id,
                     'valor_estornado', c.valor_estornado, 'estornada_em', c.estornada_em, 'estorno_origem', c.estorno_origem,
                     'estorno_pedido_valor', c.estorno_pedido_valor,
                     'reembolso', (select jsonb_build_object('id', p.id, 'situacao', p.situacao, 'motivo', p.motivo, 'created_at', p.created_at,
                                     'quem', (select coalesce(nullif(btrim(x.nome_responsavel), ''), x.email) from public.academia_acessos x where x.user_id = p.user_id))
                                   from public.pedidos_de_reembolso p where p.compra_id = c.id order by p.created_at desc limit 1))
                   order by c.created_at desc)
                   from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
                   where c.created_at >= now() - interval '30 days'
                      or (c.situacao = 'paga' and c.nota_emitida_em is null and not c.de_teste)
                      or exists (select 1 from public.pedidos_de_reembolso p where p.compra_id = c.id and p.situacao = 'aberto')), '[]'::jsonb);
end $$;
