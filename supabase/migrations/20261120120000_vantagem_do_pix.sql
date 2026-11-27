-- Vantagem do Pix (regra 304, 20/11/2026: "repassar as taxas para os clientes
-- não é algo melhor?"; "faça os dois"). Como o "desconto no Pix" do Mercado
-- Livre e da Magalu, e não uma "taxa do cartão" (Lei 13.455/2017 permite preço
-- diferente por forma de pagamento, informado antes de pagar):
--   * créditos pagos com Pix valem 5% a mais (arredondado para cima: R$ 50 → 53,
--     R$ 100 → 105), sempre pelo menos 5%;
--   * o plano pago com Pix tem 5% de desconto (o preço arredondado para baixo:
--     R$ 49 → 46, R$ 490 → 465).
-- O valor cobrado continua saindo do banco (nunca do navegador). Pode rodar de
-- novo sem estragar (create or replace).

create or replace function public.bonus_do_pix(p_valor integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select ceil(coalesce(p_valor, 0) * 0.05)::integer $$;

create or replace function public.preco_no_pix(p_valor integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select floor(coalesce(p_valor, 0) * 0.95)::integer $$;

grant execute on function public.bonus_do_pix(integer) to anon, authenticated;
grant execute on function public.preco_no_pix(integer) to anon, authenticated;

create or replace function public.confirmar_compra(p_compra uuid, p_gateway_id text, p_valor_pago numeric, p_situacao text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.compras_de_creditos;
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
      perform set_config('guiatennis.plano_da_academia', c.academia_id::text, true);
      update public.academias set plano = c.plano where id = c.academia_id and coalesce(plano, 'basico') <> c.plano;
      perform set_config('guiatennis.plano_da_academia', '', true);
      delete from public.pedidos_de_plano where academia_id = c.academia_id;
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

notify pgrst, 'reload schema';
