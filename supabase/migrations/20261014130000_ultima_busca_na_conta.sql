-- A última busca também na conta (pedido do Breno em 14/10/2026: "é legal
-- aparecer as quadras mais perto da última busca da conta"). Com a conta
-- aberta, a página inicial mostra as academias perto da última busca em
-- qualquer aparelho. Nova chave em jogadores.guardados:
--     ultima_busca     {termo, bairro, cidade, lat, lng, modalidades, pisos,
--                       cobertura, em}   (o ponto já vem arredondado, ~100 m)
-- Pode rodar de novo sem estragar nada.

create or replace function public.guardar_na_conta(p_chave text, p_valor jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  if p_chave is null or p_chave not in ('favoritas', 'chamadas', 'viagens', 'preferencias', 'avaliadas', 'pedir_avaliacao', 'ultima_busca') then
    raise exception 'Não sei guardar isso.' using errcode = '22023';
  end if;
  if p_valor is null
     or (p_chave in ('preferencias', 'pedir_avaliacao', 'ultima_busca') and jsonb_typeof(p_valor) <> 'object')
     or (p_chave not in ('preferencias', 'pedir_avaliacao', 'ultima_busca') and jsonb_typeof(p_valor) <> 'array') then
    raise exception 'Formato errado.' using errcode = '22023';
  end if;
  if pg_column_size(p_valor) > 16384 then
    raise exception 'Grande demais.' using errcode = '22023';
  end if;
  update public.jogadores
    set guardados = jsonb_set(coalesce(guardados, '{}'::jsonb), array[p_chave], p_valor, true)
    where user_id = auth.uid();
  if not found then
    raise exception 'Conta de jogador não encontrada.' using errcode = '42501';
  end if;
end $$;

revoke all on function public.guardar_na_conta(text, jsonb) from public, anon;
grant execute on function public.guardar_na_conta(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
