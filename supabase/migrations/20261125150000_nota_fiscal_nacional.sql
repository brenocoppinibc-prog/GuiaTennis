-- Regra 333 (25/11/2026): a nota fiscal automática pela NFS-e Nacional.
--
-- O primeiro "Testar com a Prefeitura" (regra 331) conectou, mas a Prefeitura
-- de São Paulo respondeu: "Erro 1647: Consta na base de dados que o
-- contribuinte está cadastrado no CNC - Cadastro Nacional de Contribuintes.
-- Assim, deve emitir nota no ambiente nacional para fatos geradores a partir de
-- 17/11/2026". A nota passa a sair pelo Sistema Nacional NFS-e (Sefin
-- Nacional), e o que muda no banco é pouco:
--   - o código do serviço é o código de tributação nacional (6 números):
--     17.25 = 172501 (Anexo I, lista de serviços nacional);
--   - a série da DPS é numérica, de 1 a 49999 (emissão por aplicativo próprio);
--   - a "chave de acesso" da nota (50 números) fica em codigo_verificacao, e o
--     link é a consulta pública da NFS-e Nacional;
--   - o cancelamento usa a chave.
-- Pode rodar de novo sem estragar nada.

alter table public.nota_configuracao alter column codigo_servico set default '172501';
alter table public.nota_configuracao alter column serie set default '1';
update public.nota_configuracao set codigo_servico = '172501', updated_at = now()
  where id = 1 and codigo_servico !~ '^[0-9]{6}$';
update public.nota_configuracao set serie = '1', updated_at = now()
  where id = 1 and (serie !~ '^[0-9]{1,5}$' or serie::bigint not between 1 and 49999);

-- O link público: a consulta da NFS-e Nacional pela chave de acesso (a mesma do
-- QR code do DANFSe). Uma nota antiga de São Paulo (número e código) continua
-- com o link da Prefeitura.
create or replace function public.link_da_nota(p_numero bigint, p_codigo text)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when coalesce(p_codigo, '') ~ '^[0-9]{50}$' then 'https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=' || p_codigo
    when p_numero is null or coalesce(p_codigo, '') = '' then null
    else 'https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?ccm='
      || (select ccm from public.nota_configuracao where id = 1)
      || '&nf=' || p_numero || '&cod=' || p_codigo end;
$$;

create or replace function public.salvar_nota_configuracao(
  p_ligada boolean, p_ambiente text, p_codigo text, p_aliquota numeric, p_serie text, p_descricao text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  v_serie text := regexp_replace(coalesce(p_serie, ''), '\D', '', 'g');
  v_descricao text := regexp_replace(btrim(coalesce(p_descricao, '')), '\s+', ' ', 'g');
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis.' using errcode = '42501';
  end if;
  if p_ambiente not in ('teste', 'producao') then
    raise exception 'Escolha Teste ou Produção.' using errcode = '22023';
  end if;
  if v_codigo !~ '^[0-9]{6}$' then
    raise exception 'O código de tributação nacional tem 6 números (ex.: 172501, o item 17.25).' using errcode = '22023';
  end if;
  if p_aliquota is null or p_aliquota < 0 or p_aliquota > 0.05 then
    raise exception 'A alíquota do ISS vai de 0%% a 5%%.' using errcode = '22023';
  end if;
  if v_serie !~ '^[0-9]{1,5}$' or v_serie::bigint not between 1 and 49999 then
    raise exception 'A série da DPS é um número de 1 a 49999.' using errcode = '22023';
  end if;
  if length(v_descricao) < 10 or length(v_descricao) > 1000 then
    raise exception 'A descrição tem de 10 a 1.000 letras.' using errcode = '22023';
  end if;
  update public.nota_configuracao
    set ligada = coalesce(p_ligada, false), ambiente = p_ambiente, codigo_servico = v_codigo,
        aliquota = round(p_aliquota, 4), serie = (v_serie::bigint)::text, descricao = v_descricao, updated_at = now()
    where id = 1;
  return public.nota_configuracao_do_admin();
end $$;

-- O resultado da Sefin. Emitida: a compra fica com a nota e o e-mail com o
-- link vai para o e-mail da nota. Erro: o admin é avisado (uma vez por compra e
-- por mensagem).
create or replace function public.registrar_nota(
  p_compra uuid, p_situacao text, p_numero_nfe bigint, p_codigo text, p_mensagem text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
  v_academia text;
  v_link text;
  v_texto text;
begin
  if p_situacao not in ('emitida', 'testada', 'erro', 'cancelada') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  update public.notas_fiscais
    set situacao = p_situacao,
        numero_nfe = coalesce(p_numero_nfe, numero_nfe),
        codigo_verificacao = coalesce(nullif(p_codigo, ''), codigo_verificacao),
        mensagem = left(p_mensagem, 1000),
        emitida_em = case when p_situacao = 'emitida' then now() else emitida_em end,
        cancelada_em = case when p_situacao = 'cancelada' then now() else cancelada_em end,
        atualizada_em = now()
    where compra_id = p_compra;
  select * into c from public.compras_de_creditos where id = p_compra;
  if not found then
    return;
  end if;
  select name into v_academia from public.academias where id = c.academia_id;
  if p_situacao = 'emitida' then
    update public.compras_de_creditos set nota_emitida_em = now() where id = p_compra;
    v_link := public.link_da_nota(p_numero_nfe, p_codigo);
    if coalesce(c.nota_email, '') <> '' then
      v_texto := 'A nota fiscal da compra de R$ ' || coalesce(c.valor_pago, c.valor) || ' da ' || coalesce(v_academia, 'academia')
        || ' no GuiaTennis foi emitida'
        || case when coalesce(p_codigo, '') ~ '^[0-9]{50}$'
             then coalesce(': nota n.º ' || p_numero_nfe, '') || '. Chave de acesso: ' || p_codigo || '.'
             else ': nota n.º ' || p_numero_nfe || ', código de verificação ' || p_codigo || '.' end;
      perform public.por_na_fila(
        'nota-emitida:' || c.id, 'nota_emitida', c.nota_email,
        'Nota fiscal do GuiaTennis' || coalesce(' n.º ' || p_numero_nfe, ''),
        public.email_montado('Sua nota fiscal', public.email_p(public.html_texto(v_texto)),
          'Ver a nota fiscal', v_link,
          'Você recebe este e-mail porque este endereço recebe as notas fiscais da ' || public.html_texto(coalesce(v_academia, 'academia')) || ' no GuiaTennis Parceiros.'),
        v_texto || E'\n\nVer a nota fiscal: ' || v_link);
    end if;
  elsif p_situacao = 'erro' then
    v_texto := coalesce(v_academia, 'Academia') || ', R$ ' || coalesce(c.valor_pago, c.valor) || ': ' || coalesce(p_mensagem, 'erro sem mensagem') || '.';
    perform public.aviso_ao_admin('nota-erro:' || c.id || ':' || md5(coalesce(p_mensagem, '')), 'nota_erro',
      'A nota não saiu: ' || coalesce(v_academia, 'academia'), 'Nota fiscal com erro',
      public.email_p(public.html_texto(v_texto))
        || public.email_p('Corrija em Admin › Compras e notas › Nota fiscal automática e toque em "Emitir de novo".'),
      v_texto || E'\n\nCorrija em Admin › Compras e notas › Nota fiscal automática e toque em "Emitir de novo".',
      'compras');
  end if;
exception when others then
  raise warning 'registrar nota: %', sqlerrm;
end $$;

-- O cancelamento pela chave de acesso (evento 101101 da NFS-e Nacional).
create or replace function public.nota_para_cancelar(p_compra uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('compra', n.compra_id, 'chave', n.codigo_verificacao, 'numero_nfe', n.numero_nfe, 'ambiente', n.ambiente)
    from public.notas_fiscais n
    where n.compra_id = p_compra and n.situacao = 'cancelar' and coalesce(n.codigo_verificacao, '') ~ '^[0-9]{50}$';
$$;

revoke all on function public.link_da_nota(bigint, text) from public, anon, authenticated;
revoke all on function public.registrar_nota(uuid, text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.nota_para_cancelar(uuid) from public, anon, authenticated;
revoke all on function public.salvar_nota_configuracao(boolean, text, text, numeric, text, text) from public, anon;
grant execute on function public.salvar_nota_configuracao(boolean, text, text, numeric, text, text) to authenticated;
