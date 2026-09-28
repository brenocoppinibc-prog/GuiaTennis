-- GuiaTennis — retrato da estrutura do banco. Só lê: não muda nada.
select 'coluna'::text as tipo, c.table_name::text as tabela, c.column_name::text as nome,
       (c.udt_name || case when c.is_nullable = 'NO' then ' not null' else '' end
        || coalesce(' default ' || c.column_default, ''))::text as definicao
from information_schema.columns c
where c.table_schema = 'public'
union all
select 'rls', relname::text, '', case when relrowsecurity then 'ligado' else 'desligado' end
from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
union all
select 'regra', tablename::text, policyname::text,
       cmd || ' para ' || array_to_string(roles, ',')
       || coalesce(' | using: ' || qual, '') || coalesce(' | check: ' || with_check, '')
from pg_policies where schemaname = 'public'
union all
select 'trava', conrelid::regclass::text, conname::text, pg_get_constraintdef(oid)
from pg_constraint where connamespace = 'public'::regnamespace
union all
select 'indice', tablename::text, indexname::text, indexdef
from pg_indexes where schemaname = 'public'
union all
select 'gatilho', event_object_table::text, trigger_name::text, action_statement::text
from information_schema.triggers where trigger_schema = 'public'
union all
select 'funcao', '', p.proname::text, pg_get_functiondef(p.oid)
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
union all
select 'visao', '', viewname::text, definition
from pg_views where schemaname = 'public'
union all
select 'permissao', table_name::text, grantee::text, string_agg(privilege_type::text, ', ' order by privilege_type)
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
union all
select 'permissao_coluna', table_name::text, grantee::text, string_agg(column_name::text, ', ' order by column_name)
from information_schema.column_privileges
where table_schema = 'public' and grantee = 'anon' and privilege_type = 'SELECT'
group by table_name, grantee
order by 1, 2, 3;
