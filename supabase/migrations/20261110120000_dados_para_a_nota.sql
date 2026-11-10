-- ============================================================
-- Dados para a nota fiscal (pedido do Breno em 10/11/2026, regra 231:
-- "mas como saber o cnpj da academia" / "sim")
-- ============================================================
-- Como os "dados de faturamento" do Google Ads e da Meta: antes da primeira
-- compra, a academia informa para quem sai a nota (CNPJ ou CPF, razão social
-- ou nome e o e-mail que recebe a nota). Ficam na academia; quem tem a função
-- Pagamentos muda na aba Pagamentos; cada compra guarda uma cópia (a nota sai
-- com os dados do dia da compra). O admin emite a nota à mão no Emissor
-- Nacional (gov.br/nfse) e marca "Nota emitida" em Compras e notas.
--   dados_para_nota              um por academia (só pelas funções abaixo).
--   documento_valido(texto)      CPF ou CNPJ (também o CNPJ com letras, de
--                                julho de 2026) com os dígitos certos.
--   dados_para_nota_da_academia  quem tem Pagamentos lê.
--   salvar_dados_para_nota       quem tem Pagamentos grava.
--   criar_compra_de_creditos,    sem os dados, recusam ("Informe os dados
--   criar_compra_de_plano        para a nota fiscal."); com eles, copiam.
--   minhas_compras               mostra se a nota já foi emitida.
--   compras_do_admin             com os dados da nota; as pagas sem nota
--                                continuam na lista depois de 30 dias.
--   marcar_nota_emitida          só o admin.
--   avisar_compra_paga           também avisa o admin: nota para emitir.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.dados_para_nota (
  academia_id uuid primary key references public.academias (id) on delete cascade,
  documento text not null,
  nome text not null,
  email text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.dados_para_nota enable row level security;
revoke all on public.dados_para_nota from anon, authenticated;

alter table public.compras_de_creditos add column if not exists nota_documento text;
alter table public.compras_de_creditos add column if not exists nota_nome text;
alter table public.compras_de_creditos add column if not exists nota_email text;
alter table public.compras_de_creditos add column if not exists nota_emitida_em timestamptz;

-- CPF (11 números) ou CNPJ (14: os 12 primeiros podem ter letras, desde
-- julho de 2026; cada letra vale o código dela menos 48, como manda a
-- Receita). Devolve só os números e letras, ou nulo.
create or replace function public.documento_valido(p_texto text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  n text := upper(regexp_replace(coalesce(p_texto, ''), '[^0-9A-Za-z]', '', 'g'));
  p1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  p2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  s int;
  d1 int;
  d2 int;
  i int;
begin
  if n ~ '^(.)\1+$' then
    return null;
  end if;
  if n ~ '^[0-9]{11}$' then
    s := 0;
    for i in 1..9 loop s := s + substr(n, i, 1)::int * (11 - i); end loop;
    d1 := (s * 10) % 11 % 10;
    s := 0;
    for i in 1..10 loop s := s + substr(n, i, 1)::int * (12 - i); end loop;
    d2 := (s * 10) % 11 % 10;
    return case when d1 = substr(n, 10, 1)::int and d2 = substr(n, 11, 1)::int then n end;
  end if;
  if n ~ '^[0-9A-Z]{12}[0-9]{2}$' then
    s := 0;
    for i in 1..12 loop s := s + (ascii(substr(n, i, 1)) - 48) * p1[i]; end loop;
    d1 := case when s % 11 < 2 then 0 else 11 - s % 11 end;
    s := 0;
    for i in 1..13 loop s := s + (ascii(substr(n, i, 1)) - 48) * p2[i]; end loop;
    d2 := case when s % 11 < 2 then 0 else 11 - s % 11 end;
    return case when d1 = substr(n, 13, 1)::int and d2 = substr(n, 14, 1)::int then n end;
  end if;
  return null;
end $$;

create or replace function public.dados_para_nota_da_academia(p_academia uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.posso(p_academia, 'pagamentos')
    then (select jsonb_build_object('documento', d.documento, 'nome', d.nome, 'email', d.email, 'updated_at', d.updated_at)
          from public.dados_para_nota d where d.academia_id = p_academia)
    else null end;
$$;

create or replace function public.salvar_dados_para_nota(p_academia uuid, p_documento text, p_nome text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc text := public.documento_valido(p_documento);
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'pagamentos');
  if v_doc is null then
    raise exception 'Confira o CNPJ ou o CPF.' using errcode = '22023';
  end if;
  if length(v_nome) < 2 or length(v_nome) > 150 then
    raise exception 'Escreva a razão social ou o nome.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'Confira o e-mail que recebe a nota.' using errcode = '22023';
  end if;
  insert into public.dados_para_nota (academia_id, documento, nome, email, updated_by, updated_at)
    values (p_academia, v_doc, v_nome, v_email, auth.uid(), now())
  on conflict (academia_id) do update
    set documento = excluded.documento, nome = excluded.nome, email = excluded.email,
        updated_by = excluded.updated_by, updated_at = now();
  return jsonb_build_object('documento', v_doc, 'nome', v_nome, 'email', v_email);
end $$;

-- As compras pedem os dados e guardam uma cópia ---------------------------------
create or replace function public.criar_compra_de_creditos(p_academia uuid, p_valor integer, p_forma text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  n public.dados_para_nota;
  v_id uuid;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  perform public.exigir_funcao(p_academia, 'pagamentos');
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') not in ('completo', 'premium') then
    raise exception 'Os créditos são do leilão do Completo e do Premium.' using errcode = '42501';
  end if;
  if p_valor is null or p_valor < 20 or p_valor > 5000 then
    raise exception 'Escolha um valor de R$ 20 a R$ 5.000.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha Pix ou cartão.' using errcode = '22023';
  end if;
  select * into n from public.dados_para_nota where academia_id = p_academia;
  if not found then
    raise exception 'Informe os dados para a nota fiscal.' using errcode = '22023';
  end if;
  insert into public.compras_de_creditos (academia_id, user_id, valor, forma, nota_documento, nota_nome, nota_email)
    values (p_academia, auth.uid(), p_valor, p_forma, n.documento, n.nome, n.email)
    returning id into v_id;
  return v_id;
end $$;

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
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Só o responsável principal muda o plano da academia.' using errcode = '42501';
  end if;
  if coalesce(p_plano, '') not in ('completo', 'premium') or coalesce(p_periodo, '') not in ('mensal', 'anual') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;
  if coalesce(p_forma, '') not in ('pix', 'cartao') then
    raise exception 'Escolha Pix ou cartão.' using errcode = '22023';
  end if;
  if (select coalesce(plano, 'basico') from public.academias where id = p_academia) = p_plano then
    raise exception 'A academia já está nesse plano.' using errcode = '22023';
  end if;
  select valor into v_valor from public.precos_dos_planos where plano = p_plano and periodo = p_periodo;
  if v_valor is null then
    raise exception 'Plano sem preço.' using errcode = '22023';
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

-- Pagamentos da academia: a nota emitida e para qual e-mail foi ------------------
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
                     'quem', (select coalesce(nullif(btrim(x.nome_responsavel), ''), x.email)
                              from public.academia_acessos x where x.user_id = c.user_id)) order by c.created_at desc)
                   from (select * from public.compras_de_creditos where academia_id = p_academia
                         order by created_at desc limit 20) c), '[]'::jsonb)
    else null end;
$$;

-- Compras e notas (admin): os dados para copiar no Emissor Nacional ----------------
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
                     'nota_emitida_em', c.nota_emitida_em) order by c.created_at desc)
                   from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
                   where c.created_at >= now() - interval '30 days'
                      or (c.situacao = 'paga' and c.nota_emitida_em is null and not c.de_teste)), '[]'::jsonb);
end $$;

create or replace function public.marcar_nota_emitida(p_compra uuid, p_emitida boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v timestamptz;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin marca a nota.' using errcode = '42501';
  end if;
  update public.compras_de_creditos
     set nota_emitida_em = case when coalesce(p_emitida, false) then coalesce(nota_emitida_em, now()) end
   where id = p_compra and situacao = 'paga'
  returning nota_emitida_em into v;
  if not found then
    raise exception 'Compra paga não encontrada.' using errcode = '22023';
  end if;
  return v;
end $$;

-- A compra paga avisa também o admin: nota para emitir -----------------------------
create or replace function public.avisar_compra_paga(p_compra uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_academia text;
  v_quem text;
  v_que text;
  v_texto text;
  v_link text;
  v_doc text;
  r record;
begin
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found or c.situacao <> 'paga' then
    return;
  end if;
  select name into v_academia from public.academias where id = c.academia_id;
  v_quem := coalesce((select coalesce(nullif(btrim(nome_responsavel), ''), email) from public.academia_acessos where user_id = c.user_id),
                     'Alguém da academia');
  v_que := case when c.tipo = 'plano'
    then 'o plano ' || public.nome_do_plano(c.plano) || case when c.periodo = 'anual' then ' anual' else ' mensal' end
    else 'créditos de promoções' end;
  v_link := public.site_dos_emails() || '/parceiros/pagamentos?abrir=' || right(replace(c.academia_id::text, '-', ''), 8)
    || '&utm_source=Email-compra';
  for r in select * from public.principais_da_academia(c.academia_id) loop
    v_texto := case when r.user_id = c.user_id then 'Você comprou ' else v_quem || ' comprou ' end
      || v_que || ' para a ' || v_academia || ': R$ ' || c.valor || ', com ' || case when c.forma = 'pix' then 'Pix' else 'cartão' end || '.';
    perform public.por_na_fila(
      'compra-paga:' || c.id || ':' || r.user_id, 'compra_paga', r.email,
      'Compra na ' || v_academia || ': R$ ' || c.valor,
      public.email_montado('Compra confirmada', public.email_p(public.html_texto(v_texto))
          || public.email_p('Não reconhece essa compra? Fale com o GuiaTennis pelo chat de ajuda.'),
        'Ver os pagamentos', v_link,
        'Você recebe este e-mail porque é responsável principal da ' || public.html_texto(v_academia) || ' no GuiaTennis Parceiros.'),
      v_texto || E'\n\nNão reconhece essa compra? Fale com o GuiaTennis pelo chat de ajuda.\n\n' || v_link);
  end loop;
  -- A compra de teste (só no banco de teste) também avisa, para testar na prévia.
  begin
    v_doc := coalesce(c.nota_documento, 'sem CNPJ ou CPF');
    v_texto := v_academia || ' pagou R$ ' || c.valor || ' (' || v_que || '). Nota para '
      || coalesce(c.nota_nome, v_academia) || ', ' || v_doc || coalesce(', ' || c.nota_email, '') || '.';
    perform public.aviso_ao_admin('nota-a-emitir:' || c.id, 'nota_a_emitir',
      case when c.de_teste then 'Teste: ' else '' end || 'Emitir a nota: ' || v_academia || ', R$ ' || c.valor, 'Nota fiscal para emitir',
      public.email_p(public.html_texto(v_texto))
        || public.email_p('Emita no Emissor Nacional (gov.br/nfse) e marque "Nota emitida" em Compras e notas.'),
      v_texto || E'\n\nEmita no Emissor Nacional (gov.br/nfse) e marque "Nota emitida" em Compras e notas.',
      'compras');
  end;
exception when others then
  raise warning 'aviso de compra paga: %', sqlerrm;
end $$;

revoke all on function public.documento_valido(text) from public;
grant execute on function public.documento_valido(text) to anon, authenticated;
revoke all on function public.dados_para_nota_da_academia(uuid) from public, anon;
grant execute on function public.dados_para_nota_da_academia(uuid) to authenticated;
revoke all on function public.salvar_dados_para_nota(uuid, text, text, text) from public, anon;
grant execute on function public.salvar_dados_para_nota(uuid, text, text, text) to authenticated;
revoke all on function public.criar_compra_de_creditos(uuid, integer, text) from public, anon;
grant execute on function public.criar_compra_de_creditos(uuid, integer, text) to authenticated;
revoke all on function public.criar_compra_de_plano(uuid, text, text, text) from public, anon;
grant execute on function public.criar_compra_de_plano(uuid, text, text, text) to authenticated;
revoke all on function public.minhas_compras(uuid) from public, anon;
grant execute on function public.minhas_compras(uuid) to authenticated;
revoke all on function public.compras_do_admin() from public, anon;
grant execute on function public.compras_do_admin() to authenticated;
revoke all on function public.marcar_nota_emitida(uuid, boolean) from public, anon;
grant execute on function public.marcar_nota_emitida(uuid, boolean) to authenticated;
revoke all on function public.avisar_compra_paga(uuid) from public, anon, authenticated;
