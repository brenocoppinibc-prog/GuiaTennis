-- A assinatura do Premium (regra 310, 21/11/2026: "pode aparecer completo de
-- 49 de graça, Premium 89 por 49, faça tudo"; "deixaria o Premium com 1° mês
-- grátis e se cancelar a assinatura, ter opção de básico ou completo").
--
-- Como o Spotify e o LinkedIn Premium: o primeiro mês do Premium é grátis, sem
-- cartão; cinco dias antes do fim chega o e-mail; sem pagamento, a academia
-- volta sozinha para o plano escolhido (o Completo, que está grátis por
-- enquanto). O pagamento soma um mês (ou um ano) ao prazo. Cancelar não tira o
-- Premium na hora: ele fica até o fim do que foi pago (ou do mês grátis) e
-- depois vira o plano que a academia escolheu, Completo ou Básico.
--
-- O preço de lançamento: o Premium sai por R$ 49 (o preço normal, R$ 89, fica
-- riscado) e o Completo fica grátis por enquanto (o normal, R$ 49, riscado).
-- valor_normal é só o que a tela mostra riscado; a cobrança usa o valor.
--
-- As primeiras 30 academias com responsável no Parceiros ganham o selo
-- "Fundadora", que fica para sempre. E o Básico vê quantas vezes a ficha foi
-- vista no mês. Pode rodar de novo sem estragar.

-- O preço de lançamento e o normal ---------------------------------------------
alter table public.precos_dos_planos add column if not exists valor_normal integer;
insert into public.precos_dos_planos (plano, periodo, valor, valor_normal) values
  ('completo', 'mensal', 49, 49), ('completo', 'anual', 490, 490),
  ('premium', 'mensal', 49, 89), ('premium', 'anual', 490, 890)
on conflict (plano, periodo) do update set valor = excluded.valor, valor_normal = excluded.valor_normal;

-- O site lê os preços nos dois sites (antes, só no de teste); "normais" é o
-- preço riscado.
create or replace function public.pagamento_de_teste()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ligado', coalesce((select ligado from public.pagamento_de_teste), false),
    'precos', coalesce((select jsonb_object_agg(plano || '_' || periodo, valor) from public.precos_dos_planos), '{}'::jsonb),
    'normais', coalesce((select jsonb_object_agg(plano || '_' || periodo, coalesce(valor_normal, valor)) from public.precos_dos_planos), '{}'::jsonb));
$$;
revoke all on function public.pagamento_de_teste() from public;
grant execute on function public.pagamento_de_teste() to anon, authenticated;

-- A assinatura ------------------------------------------------------------------
-- Uma linha por academia, que fica mesmo depois do fim: teste_usado_em garante
-- um mês grátis por academia. Ativa = encerrada_em nula.
create table if not exists public.assinaturas (
  academia_id uuid primary key references public.academias (id) on delete cascade,
  plano text not null default 'premium' check (plano in ('completo', 'premium')),
  ate timestamptz not null,
  depois text not null default 'completo' check (depois in ('basico', 'completo')),
  teste boolean not null default false,
  teste_usado_em timestamptz,
  cancelada_em timestamptz,
  aviso_em timestamptz,
  encerrada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assinaturas enable row level security;
revoke all on public.assinaturas from anon, authenticated;

create or replace function public.sou_principal_da_academia(p_academia uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal');
$$;

-- O que a tela de Plano mostra (quem é da academia vê; o admin também).
create or replace function public.minha_assinatura(p_academia uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.assinaturas;
begin
  if not (public.eh_admin() or exists (select 1 from public.academia_vinculos where user_id = auth.uid() and academia_id = p_academia)) then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  select * into s from public.assinaturas where academia_id = p_academia;
  if not found then
    return jsonb_build_object('ativa', false, 'teste_usado', false);
  end if;
  return jsonb_build_object(
    'ativa', s.encerrada_em is null,
    'plano', s.plano, 'ate', s.ate, 'depois', s.depois, 'teste', s.teste,
    'teste_usado', s.teste_usado_em is not null, 'cancelada', s.cancelada_em is not null);
end $$;

-- Muda o plano pelo caminho do responsável (o gatilho da ficha só deixa o
-- plano mudar com este aviso).
create or replace function public.trocar_plano_da_assinatura(p_academia uuid, p_plano text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('guiatennis.plano_da_academia', p_academia::text, true);
  update public.academias set plano = p_plano where id = p_academia and coalesce(plano, 'basico') <> p_plano;
  perform set_config('guiatennis.plano_da_academia', '', true);
  delete from public.pedidos_de_plano where academia_id = p_academia;
end $$;

-- O mês grátis do Premium: uma vez por academia, sem cartão.
create or replace function public.comecar_mes_gratis(p_academia uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.assinaturas;
  v_ate timestamptz := now() + interval '1 month';
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  select * into s from public.assinaturas where academia_id = p_academia for update;
  if found and s.teste_usado_em is not null then
    raise exception 'O mês grátis do Premium já foi usado por esta academia.' using errcode = '22023';
  end if;
  if (select coalesce(plano, 'basico') from public.academias where id = p_academia) = 'premium' then
    raise exception 'A academia já está no Premium.' using errcode = '22023';
  end if;
  insert into public.assinaturas (academia_id, plano, ate, depois, teste, teste_usado_em)
    values (p_academia, 'premium', v_ate, 'completo', true, now())
  on conflict (academia_id) do update set plano = 'premium', ate = v_ate, depois = 'completo', teste = true,
    teste_usado_em = now(), cancelada_em = null, aviso_em = null, encerrada_em = null, updated_at = now();
  perform public.trocar_plano_da_assinatura(p_academia, 'premium');
  return v_ate;
end $$;

-- Cancelar: o Premium fica até o fim do prazo e depois vira o plano escolhido.
create or replace function public.cancelar_assinatura(p_academia uuid, p_depois text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ate timestamptz;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal cancela a assinatura.' using errcode = '42501';
  end if;
  if coalesce(p_depois, '') not in ('basico', 'completo') then
    raise exception 'Escolha o Completo ou o Básico.' using errcode = '22023';
  end if;
  update public.assinaturas set depois = p_depois, cancelada_em = now(), updated_at = now()
    where academia_id = p_academia and encerrada_em is null
    returning ate into v_ate;
  if v_ate is null then
    raise exception 'A academia não tem assinatura ativa.' using errcode = '22023';
  end if;
  return v_ate;
end $$;

-- Desfazer o cancelamento ("Continuar no Premium").
create or replace function public.continuar_assinatura(p_academia uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ate timestamptz;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda a assinatura.' using errcode = '42501';
  end if;
  update public.assinaturas set cancelada_em = null, depois = 'completo', updated_at = now()
    where academia_id = p_academia and encerrada_em is null
    returning ate into v_ate;
  return v_ate;
end $$;

-- O pagamento confirmado soma o prazo; o resto é o confirmar_compra de antes
-- (SQL 20261120120000).
create or replace function public.confirmar_compra(p_compra uuid, p_gateway_id text, p_valor_pago numeric, p_situacao text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_mais interval;
begin
  select * into c from public.compras_de_creditos where id = p_compra for update;
  if not found then
    return 'nao_achou';
  end if;
  if c.situacao <> 'aberta' then
    return c.situacao;
  end if;
  if p_situacao = 'approved' and coalesce(p_valor_pago, 0) >= c.valor then
    update public.compras_de_creditos
      set situacao = 'paga', paga_em = now(), valor_pago = p_valor_pago,
          gateway_id = coalesce(p_gateway_id, gateway_id), updated_at = now()
      where id = p_compra;
    if c.tipo = 'plano' then
      -- Regra 310: o plano pago vale um mês (ou um ano) a partir do fim do
      -- prazo de agora (ou de hoje, sem prazo).
      v_mais := case when c.periodo = 'anual' then interval '1 year' else interval '1 month' end;
      insert into public.assinaturas (academia_id, plano, ate, depois)
        values (c.academia_id, c.plano, now() + v_mais, case when c.plano = 'premium' then 'completo' else 'basico' end)
      on conflict (academia_id) do update set
        ate = case when public.assinaturas.encerrada_em is null and public.assinaturas.plano = c.plano and public.assinaturas.ate > now()
                   then public.assinaturas.ate else now() end + v_mais,
        plano = c.plano, depois = case when c.plano = 'premium' then 'completo' else 'basico' end,
        teste = false, cancelada_em = null, aviso_em = null, encerrada_em = null, updated_at = now();
      perform public.trocar_plano_da_assinatura(c.academia_id, c.plano);
    else
      -- Regra 304: no Pix, 5% a mais em créditos.
      perform public.mexer_creditos(c.academia_id, c.valor + case when c.forma = 'pix' then public.bonus_do_pix(c.valor) else 0 end);
    end if;
    perform public.avisar_compra_paga(p_compra);
    return 'paga';
  end if;
  if p_situacao in ('rejected', 'cancelled', 'refunded', 'charged_back') then
    update public.compras_de_creditos set situacao = 'recusada', gateway_id = coalesce(p_gateway_id, gateway_id), updated_at = now()
      where id = p_compra;
    return 'recusada';
  end if;
  return 'aberta';
end $$;

-- Comprar o plano: pagar o mesmo plano vale quando há assinatura dele (pagar o
-- próximo mês, ou sair do mês grátis); o resto é o de antes (SQL 20261120120000).
create or replace function public.criar_compra_de_plano(p_academia uuid, p_plano text, p_periodo text, p_forma text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  n public.dados_para_nota;
  v_valor integer;
  v_id uuid;
begin
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  if coalesce(p_plano, '') not in ('completo', 'premium') or coalesce(p_periodo, '') not in ('mensal', 'anual') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha Pix ou cartão.' using errcode = '22023';
  end if;
  if (select coalesce(plano, 'basico') from public.academias where id = p_academia) = p_plano
     and not exists (select 1 from public.assinaturas where academia_id = p_academia and plano = p_plano and encerrada_em is null) then
    raise exception 'A academia já está nesse plano.' using errcode = '22023';
  end if;
  select valor into v_valor from public.precos_dos_planos where plano = p_plano and periodo = p_periodo;
  if v_valor is null then
    raise exception 'Plano sem preço.' using errcode = '22023';
  end if;
  -- Regra 304: no Pix, 5% de desconto no plano.
  if p_forma = 'pix' then
    v_valor := public.preco_no_pix(v_valor);
  end if;
  select * into n from public.dados_para_nota where academia_id = p_academia;
  if not found then
    raise exception 'Informe os dados para a nota fiscal.' using errcode = '22023';
  end if;
  insert into public.compras_de_creditos (academia_id, user_id, valor, forma, tipo, plano, periodo,
                                          nota_documento, nota_nome, nota_email)
    values (p_academia, auth.uid(), v_valor, p_forma, 'plano', p_plano, p_periodo, n.documento, n.nome, n.email)
    returning id into v_id;
  return v_id;
end $$;

-- Escolher o plano direto: o Premium não entra por aqui (é pelo mês grátis ou
-- pela compra). Descer de plano encerra a assinatura na hora.
create or replace function public.escolher_plano(p_academia uuid, p_plano text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes text;
begin
  if coalesce(p_plano, '') not in ('basico', 'completo', 'premium') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if not public.sou_principal_da_academia(p_academia) then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  select coalesce(plano, 'basico') into v_antes from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if p_plano = 'premium' and v_antes <> 'premium' then
    raise exception 'O Premium começa pelo mês grátis ou pelo pagamento, em Plano.' using errcode = '22023';
  end if;
  if v_antes <> p_plano then
    update public.assinaturas set encerrada_em = now(), teste = false, updated_at = now()
      where academia_id = p_academia and encerrada_em is null;
    perform public.trocar_plano_da_assinatura(p_academia, p_plano);
  end if;
  delete from public.pedidos_de_plano where academia_id = p_academia;
  return p_plano;
end $$;

-- O relógio (de hora em hora): o aviso cinco dias antes e o fim do prazo.
-- Assinatura cujo plano o admin mudou por fora só é encerrada.
create or replace function public.rodar_assinaturas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  r record;
  v_nome text;
  v_quando text;
  v_texto text;
  v_link text;
begin
  for s in select a.*, x.name, coalesce(x.plano, 'basico') as plano_agora
           from public.assinaturas a join public.academias x on x.id = a.academia_id
           where a.encerrada_em is null and a.ate <= now() loop
    update public.assinaturas set encerrada_em = now(), teste = false, updated_at = now() where academia_id = s.academia_id;
    if s.plano_agora = s.plano then
      perform public.trocar_plano_da_assinatura(s.academia_id, s.depois);
    end if;
  end loop;

  for s in select a.*, x.name from public.assinaturas a join public.academias x on x.id = a.academia_id
           where a.encerrada_em is null and a.aviso_em is null and a.ate <= now() + interval '5 days' and a.ate > now() loop
    update public.assinaturas set aviso_em = now() where academia_id = s.academia_id;
    v_nome := coalesce(s.name, 'academia');
    v_quando := to_char(s.ate at time zone 'America/Sao_Paulo', 'DD/MM');
    v_link := public.site_dos_emails() || '/parceiros/plano?abrir=' || right(replace(s.academia_id::text, '-', ''), 8) || '&utm_source=Email-assinatura';
    v_texto := case
      when s.cancelada_em is not null then
        'O Premium da ' || v_nome || ' vai até ' || v_quando || '. Depois, a academia passa para o ' || public.nome_do_plano(s.depois) || ', como vocês escolheram. Mudou de ideia? Continue no Premium em Plano.'
      when s.teste then
        'O mês grátis do Premium da ' || v_nome || ' acaba em ' || v_quando || '. Para continuar com o selo, o Patrocinado, as promoções e os números, pague o próximo mês em Plano. Sem pagamento, a academia passa para o ' || public.nome_do_plano(s.depois) || ' e nada é cobrado.'
      else
        'O ' || public.nome_do_plano(s.plano) || ' da ' || v_nome || ' vale até ' || v_quando || '. Para continuar, pague o próximo mês em Plano. Sem pagamento, a academia passa para o ' || public.nome_do_plano(s.depois) || ' e nada é cobrado.'
      end;
    for r in select * from public.principais_da_academia(s.academia_id) loop
      perform public.por_na_fila(
        'assinatura-aviso:' || s.academia_id || ':' || to_char(s.ate, 'YYYYMMDDHH24MI') || ':' || r.user_id, 'assinatura', r.email,
        case when s.teste and s.cancelada_em is null then 'O mês grátis do Premium acaba em ' || v_quando
             else 'O ' || public.nome_do_plano(s.plano) || ' da ' || v_nome || ' vai até ' || v_quando end,
        public.email_montado(case when s.teste and s.cancelada_em is null then 'O mês grátis acaba em 5 dias' else 'A assinatura vence em 5 dias' end,
          public.email_p(public.html_texto(v_texto)),
          case when s.cancelada_em is not null then 'Ver o plano' else 'Continuar no Premium' end, v_link,
          'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_nome) || ' no GuiaTennis Parceiros.'),
        v_texto || E'\n\n' || v_link);
    end loop;
  end loop;
end $$;

-- As academias fundadoras: as 30 primeiras com responsável no Parceiros. O
-- selo fica para sempre, mesmo se a academia mudar de responsável.
create table if not exists public.academias_fundadoras (
  academia_id uuid primary key references public.academias (id) on delete cascade,
  desde timestamptz not null default now()
);
alter table public.academias_fundadoras enable row level security;
revoke all on public.academias_fundadoras from anon, authenticated;

create or replace function public.marcar_academia_fundadora()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.academias_fundadoras) < 30 then
    insert into public.academias_fundadoras (academia_id) values (new.academia_id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists marcar_academia_fundadora on public.academia_vinculos;
create trigger marcar_academia_fundadora after insert on public.academia_vinculos
  for each row execute function public.marcar_academia_fundadora();

insert into public.academias_fundadoras (academia_id, desde)
select academia_id, min(created_at) from public.academia_vinculos
group by academia_id
order by min(created_at)
limit greatest(0, 30 - (select count(*) from public.academias_fundadoras))
on conflict do nothing;

create or replace function public.academias_fundadoras()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select academia_id from public.academias_fundadoras;
$$;

-- O Básico vê quantas vezes a ficha foi vista no mês (o resto dos números é
-- do Premium).
create or replace function public.vistas_do_mes(p_academia uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.eh_admin() or exists (select 1 from public.academia_vinculos where user_id = auth.uid() and academia_id = p_academia)) then
    raise exception 'Entre na conta da academia.' using errcode = '42501';
  end if;
  return (select count(*) from public.cliques
          where academia_id = p_academia and tipo = 'visualizacao'
            and created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
end $$;

revoke all on function public.sou_principal_da_academia(uuid) from public, anon;
grant execute on function public.sou_principal_da_academia(uuid) to authenticated;
revoke all on function public.minha_assinatura(uuid) from public, anon;
grant execute on function public.minha_assinatura(uuid) to authenticated;
revoke all on function public.trocar_plano_da_assinatura(uuid, text) from public, anon, authenticated;
revoke all on function public.comecar_mes_gratis(uuid) from public, anon;
grant execute on function public.comecar_mes_gratis(uuid) to authenticated;
revoke all on function public.cancelar_assinatura(uuid, text) from public, anon;
grant execute on function public.cancelar_assinatura(uuid, text) to authenticated;
revoke all on function public.continuar_assinatura(uuid) from public, anon;
grant execute on function public.continuar_assinatura(uuid) to authenticated;
revoke all on function public.confirmar_compra(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.criar_compra_de_plano(uuid, text, text, text) from public, anon;
grant execute on function public.criar_compra_de_plano(uuid, text, text, text) to authenticated;
revoke all on function public.escolher_plano(uuid, text) from public, anon;
grant execute on function public.escolher_plano(uuid, text) to authenticated;
revoke all on function public.rodar_assinaturas() from public, anon, authenticated;
revoke all on function public.marcar_academia_fundadora() from public, anon, authenticated;
revoke all on function public.academias_fundadoras() from public;
grant execute on function public.academias_fundadoras() to anon, authenticated;
revoke all on function public.vistas_do_mes(uuid) from public, anon;
grant execute on function public.vistas_do_mes(uuid) to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.confirmar_compra(uuid, text, numeric, text) to service_role;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'guiatennis-assinaturas';
    perform cron.schedule('guiatennis-assinaturas', '17 * * * *', 'select public.rodar_assinaturas()');
  end if;
exception when others then
  raise warning 'assinaturas: o relógio não ligou (%).', sqlerrm;
end $$;
