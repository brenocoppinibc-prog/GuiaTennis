-- ============================================================
-- Conta de jogador vira conta do GuiaTennis Parceiros com o mesmo e-mail
-- (pedido do Breno em 06/10/2026: "o mesmo email do jogadores pode ir para
-- o parceiros")
-- ============================================================
-- O contrário da regra 53 (a conta do Parceiros já joga). Como a conta do
-- Google, que vale para o Maps e para o Perfil da Empresa: quem tem conta
-- de jogador entra no GuiaTennis Parceiros com o mesmo e-mail e a mesma
-- senha, completa os dados de contato (tratamento, nome, cargo, WhatsApp,
-- aceite) e a mesma conta passa a valer nos dois. O e-mail confirmado no
-- site dos jogadores vale para o Parceiros.
-- Pode rodar de novo sem estragar nada.

create or replace function public.ativar_conta_do_parceiros(
  p_nome text, p_whatsapp text, p_aceite boolean,
  p_tratamento text default null, p_cargo text default null,
  p_recebe_novidades boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jogadores;
  v_whats text := public.telefone_normal(p_whatsapp);
  v_tratamento text := nullif(btrim(coalesce(p_tratamento, '')), '');
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  if exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    return;
  end if;
  select * into j from public.jogadores where user_id = auth.uid();
  if not found then
    raise exception 'Essa conta não é de jogador.' using errcode = '42501';
  end if;
  v_email := lower(btrim(j.email));
  if length(btrim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Escreva o seu nome.' using errcode = '22023';
  end if;
  if v_tratamento is not null and v_tratamento not in ('Sr.', 'Sra.', 'Prefiro não informar') then
    raise exception 'Escolha o tratamento.' using errcode = '22023';
  end if;
  if length(v_whats) not between 10 and 11 then
    raise exception 'WhatsApp inválido: use o DDD e o número.' using errcode = '22023';
  end if;
  if not coalesce(p_aceite, false) then
    raise exception 'Falta aceitar os Termos de Uso e a Política de Privacidade.' using errcode = '22023';
  end if;
  if exists (select 1 from public.academia_acessos where lower(email) = v_email or usuario = v_email) then
    raise exception 'Esse e-mail já tem conta no GuiaTennis Parceiros. Entre com a sua senha.' using errcode = '23505';
  end if;
  insert into public.academia_acessos (user_id, academia_id, usuario,
    nome_responsavel, tratamento, cargo, email, whatsapp, recebe_relatorio,
    termos_aceitos_em, dados_completos_em, senha_trocada_em, papel, email_confirmado_em)
  values (auth.uid(), null, v_email, btrim(p_nome), v_tratamento,
    nullif(btrim(coalesce(p_cargo, '')), ''), v_email, v_whats,
    coalesce(p_recebe_novidades, false), now(), now(), now(), 'principal', j.email_confirmado_em);
end $$;

revoke all on function public.ativar_conta_do_parceiros(text, text, boolean, text, text, boolean) from public, anon;
grant execute on function public.ativar_conta_do_parceiros(text, text, boolean, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
