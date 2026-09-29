-- Ficha básica: academia listada com dados públicos (nome, endereço,
-- telefone comercial), ainda não confirmados por ela. A ficha avisa isso e
-- mostra o link para o responsável pedir correção ou remoção.
-- Pode rodar de novo: a coluna só é criada (e as antigas marcadas) uma vez.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'academias' and column_name = 'confirmada'
  ) then
    alter table public.academias
      add column confirmada boolean not null default false;
    -- As academias que já estavam no guia foram conferidas uma a uma.
    update public.academias set confirmada = true;
  end if;
end $$;

-- No banco de teste, a Quadra Exemplo Moema mostra como fica a ficha
-- básica. Esse id não existe no banco de verdade.
update public.academias set confirmada = false
  where id = '00000000-0000-4000-8000-000000000002';

-- O visitante precisa enxergar a coluna nova.
grant select (confirmada) on public.academias to anon;

notify pgrst, 'reload schema';
