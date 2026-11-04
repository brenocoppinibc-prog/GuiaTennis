-- ============================================================
-- O que a pessoa guarda vai para a conta (pedido do Breno em 08/10/2026:
-- "eu quero que somente as vistas recentes fiquem salvas no celular, de
-- resto tudo pela conta")
-- ============================================================
-- Como o Airbnb (a lista de favoritos é da conta e aparece em qualquer
-- aparelho; sem conta, o coração pede para entrar). No celular ficam só as
-- vistas recentemente e a última busca, que aparece junto delas.
--
--   jogadores.guardados  jsonb, uma chave para cada lista:
--     favoritas        ["<id da academia>", …]
--     chamadas         [{id, tipo, em}, …]   (as academias que a pessoa chamou)
--     viagens          [{id, uf, cidade, ida, volta, ficar, lat, lng}, …]
--     preferencias     {uf, cidade, modalidade, lat, lng}
--     avaliadas        ["<id>", …]           ("Jogou aqui? Avalie": já avaliou)
--     pedir_avaliacao  {"<id>": {vezes, adiado, nunca}}
--   guardar_na_conta(chave, valor)  troca só a lista daquela chave (outro
--                    aparelho mexendo em outra lista não se perde)
--
-- Excluir a conta apaga tudo junto (a linha de jogadores sai).
-- Pode rodar de novo sem estragar nada.

alter table public.jogadores add column if not exists guardados jsonb not null default '{}'::jsonb;
alter table public.jogadores drop constraint if exists jogadores_guardados_ok;
alter table public.jogadores add constraint jogadores_guardados_ok
  check (jsonb_typeof(guardados) = 'object' and pg_column_size(guardados) <= 65536);

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
  if p_chave is null or p_chave not in ('favoritas', 'chamadas', 'viagens', 'preferencias', 'avaliadas', 'pedir_avaliacao') then
    raise exception 'Não sei guardar isso.' using errcode = '22023';
  end if;
  if p_valor is null
     or (p_chave in ('preferencias', 'pedir_avaliacao') and jsonb_typeof(p_valor) <> 'object')
     or (p_chave not in ('preferencias', 'pedir_avaliacao') and jsonb_typeof(p_valor) <> 'array') then
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
