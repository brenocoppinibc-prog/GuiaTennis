-- ============================================================
-- Painel do admin (pedido do Breno em 06/10/2026)
-- ============================================================
-- "Quando eu fizer o login, mude o site para eu ter o controle de tudo":
-- um painel separado (/admin), como o painel da Shopify e a central do
-- Booking. Quase tudo ele já lê com as regras de hoje (academias, cliques,
-- avaliações, contas de jogador, acessos das academias). Faltavam três
-- consultas, todas só para o admin:
--
--   emails_recentes_admin   os últimos avisos por e-mail, com a situação
--   reenviar_email_admin    manda de novo um aviso que não saiu
--   numeros_das_contas_admin  contas de jogador, avisos, buscas salvas e
--                           contas do GuiaTennis Parceiros, em números
-- Pode rodar de novo sem estragar nada.

create or replace function public.emails_recentes_admin(p_limite int default 50)
returns table (id uuid, tipo text, para text, assunto text, criado_em timestamptz,
  enviado_em timestamptz, tentativas int, erro text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.tipo, e.para, e.assunto, e.criado_em, e.enviado_em, e.tentativas, e.erro
  from public.emails_a_enviar e
  where public.eh_admin()
  order by e.criado_em desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

-- Volta para a fila, como se tivesse acabado de entrar.
create or replace function public.reenviar_email_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  update public.emails_a_enviar
    set tentativas = 0, erro = null, pedido_id = null, pedido_em = null, criado_em = now()
    where id = p_id and enviado_em is null;
end $$;

create or replace function public.numeros_das_contas_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o admin.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'jogadores', (select count(*) from public.jogadores),
    'confirmados', (select count(*) from public.jogadores where email_confirmado_em is not null),
    'novos_7_dias', (select count(*) from public.jogadores where created_at > now() - interval '7 days'),
    'aviso_cidade', (select count(*) from public.jogadores where avisos_academias),
    'aviso_viagem', (select count(*) from public.jogadores where avisos_viagem),
    'promocoes', (select count(*) from public.jogadores where promocoes),
    'novidades', (select count(*) from public.jogadores where novidades),
    'buscas_salvas', (select count(*) from public.buscas_salvas),
    'buscas_com_aviso', (select count(*) from public.buscas_salvas where avisar),
    'contas_parceiros', (select count(*) from public.academia_acessos),
    'academias_com_responsavel', (select count(distinct academia_id) from public.academia_vinculos where papel = 'principal'),
    'pedidos_abertos', (select count(*) from public.pedidos_de_acesso));
end $$;

revoke all on function public.emails_recentes_admin(int) from public, anon;
grant execute on function public.emails_recentes_admin(int) to authenticated;
revoke all on function public.reenviar_email_admin(uuid) from public, anon;
grant execute on function public.reenviar_email_admin(uuid) to authenticated;
revoke all on function public.numeros_das_contas_admin() from public, anon;
grant execute on function public.numeros_das_contas_admin() to authenticated;

notify pgrst, 'reload schema';
