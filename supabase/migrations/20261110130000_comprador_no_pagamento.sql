-- ============================================================
-- O comprador no pagamento (pedido do Breno em 10/11/2026, regra 232:
-- "primeiro perguntando os dados do comprador e depois realiza o pagamento
-- com o gateway conectado com o cpf ou cnpj")
-- ============================================================
-- A compra começa pelos dados do comprador (os mesmos da nota fiscal, SQL
-- 20261110120000), e a função do Netlify (pagamento.mjs) manda ao Mercado
-- Pago o CPF ou CNPJ, o nome e o e-mail como os do pagador. Aqui, só a
-- leitura da compra para cobrar passa a trazer esses dados.
-- Pode rodar de novo sem estragar nada.

create or replace function public.compra_para_cobrar(p_compra uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'valor', c.valor, 'forma', c.forma, 'situacao', c.situacao,
    'gateway_id', c.gateway_id, 'academia', a.name, 'tipo', c.tipo, 'plano', c.plano, 'periodo', c.periodo,
    'email', coalesce((select x.email from public.academia_acessos x where x.user_id = c.user_id and public.email_valido(x.email) limit 1),
                      (select j.email from public.jogadores j where j.user_id = c.user_id), ''),
    'nota_documento', c.nota_documento, 'nota_nome', c.nota_nome, 'nota_email', c.nota_email)
  from public.compras_de_creditos c join public.academias a on a.id = c.academia_id
  where c.id = p_compra;
$$;

revoke all on function public.compra_para_cobrar(uuid) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.compra_para_cobrar(uuid) to service_role;
  end if;
end $$;
