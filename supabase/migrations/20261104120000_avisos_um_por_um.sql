-- Avisos por e-mail do GuiaTennis Parceiros um por um (regra 201, 04/11/2026:
-- "Avisos por e-mail no parceiros selecionar um por um"), como as
-- notificações do Google Business Profile e da equipe da Shopify.
--
-- Antes, uma caixa só (academia_acessos.avisos_por_email) ligava ou desligava
-- tudo. Agora cada conta guarda os avisos que desligou
-- (academia_acessos.avisos_desligados). O avisos_por_email continua: é o que
-- o link "Não quero mais receber" do e-mail desliga (para todos).
--
-- O filtro fica num lugar só, no por_na_fila: um e-mail de um tipo que a
-- pessoa desligou não entra na fila. Os e-mails de jogador e os de serviço
-- (respostas de pedidos, WhatsApp da ficha, convite, nome) não têm aviso e
-- seguem como antes. Pode rodar de novo sem estragar.

alter table public.academia_acessos add column if not exists avisos_desligados text[] not null default '{}';

-- O aviso de cada tipo de e-mail da academia (os mesmos nomes do
-- AVISOS_DOS_PARCEIROS do index.html). Tipo sem aviso: null.
create or replace function public.aviso_dos_parceiros(p_tipo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'avaliacao' then 'avaliacoes'
    when 'avaliacao_editada' then 'avaliacoes'
    when 'pedido_responsavel' then 'acessos'
    when 'pedido_equipe' then 'acessos'
    when 'pessoa_nova' then 'equipe'
    when 'plano' then 'plano'
    when 'principal_novo' then 'plano'
    when 'novo_responsavel' then 'plano'
    when 'compra_paga' then 'pagamentos'
    when 'ficha_parada' then 'ficha_parada'
    when 'resumo_do_mes' then 'resumo_do_mes'
  end;
$$;

-- A fila dos e-mails (SQL 20261005160000) com o filtro dos avisos: quem
-- desligou o aviso desse tipo (ou parou todos pelo link) não recebe.
create or replace function public.por_na_fila(
  p_chave text, p_tipo text, p_para text, p_assunto text, p_html text, p_texto text,
  p_descadastro text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_aviso text := public.aviso_dos_parceiros(p_tipo);
begin
  if not public.email_valido(p_para) then
    return false;
  end if;
  if v_aviso is not null and exists (
    select 1 from public.academia_acessos x
    where lower(btrim(x.email)) = lower(btrim(p_para))
      and (not x.avisos_por_email or v_aviso = any(x.avisos_desligados))) then
    return false;
  end if;
  insert into public.emails_a_enviar (chave, tipo, para, assunto, html, texto, descadastro)
  values (p_chave, p_tipo, lower(btrim(p_para)), left(p_assunto, 200), p_html, p_texto, p_descadastro)
  on conflict (chave) do nothing
  returning id into v_id;
  return v_id is not null;
end $$;

-- Ligar ou desligar um aviso (Perfil do Parceiros). Com tudo parado pelo link
-- do e-mail, ligar um liga só ele.
create or replace function public.mudar_aviso_dos_parceiros(p_aviso text, p_ligado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_todos text[] := array['avaliacoes', 'acessos', 'equipe', 'plano', 'pagamentos', 'ficha_parada', 'resumo_do_mes'];
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  if p_aviso is null or not (p_aviso = any(v_todos)) then
    raise exception 'Aviso desconhecido.' using errcode = '22023';
  end if;
  update public.academia_acessos x
    set avisos_desligados = case
          when coalesce(p_ligado, false) and not x.avisos_por_email then array_remove(v_todos, p_aviso)
          when coalesce(p_ligado, false) then array_remove(x.avisos_desligados, p_aviso)
          else array_append(array_remove(x.avisos_desligados, p_aviso), p_aviso)
        end,
        avisos_por_email = x.avisos_por_email or coalesce(p_ligado, false),
        updated_at = now()
    where x.user_id = auth.uid();
end $$;

revoke all on function public.aviso_dos_parceiros(text) from public, anon, authenticated;
revoke all on function public.por_na_fila(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mudar_aviso_dos_parceiros(text, boolean) from public, anon;
grant execute on function public.mudar_aviso_dos_parceiros(text, boolean) to authenticated;
