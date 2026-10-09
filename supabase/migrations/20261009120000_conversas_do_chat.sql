-- ============================================================
-- O chat de ajuda do Parceiros fica guardado na conta (pedido do Breno em
-- 09/10/2026: "faça que o chat de parceiros fique salvo na conta também e
-- tenha histórico e que pode iniciar novo chat")
-- ============================================================
-- Com a conta aberta no GuiaTennis Parceiros, cada conversa do chat de
-- ajuda fica guardada na conta: a pessoa vê as conversas anteriores em
-- "Conversas", continua qualquer uma ou começa outra em "Nova conversa".
-- Sem conta, nada é guardado (o chat continua só na tela).
--
--   conversas_de_ajuda          uma linha por conversa: o título (a
--                               primeira dúvida), as mensagens e quando
--                               mudou. site diz de qual chat ela é.
--   guardar_conversa_de_ajuda   cria ou atualiza a conversa da própria
--                               conta. Guarda as 50 mais recentes.
--
-- Só a própria conta lê e apaga; excluir a conta apaga as conversas junto.
-- Pode rodar de novo sem estragar nada.

create table if not exists public.conversas_de_ajuda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site text not null default 'parceiros',
  titulo text not null,
  mensagens jsonb not null default '[]'::jsonb,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
alter table public.conversas_de_ajuda drop constraint if exists conversas_de_ajuda_ok;
alter table public.conversas_de_ajuda add constraint conversas_de_ajuda_ok
  check (site in ('parceiros', 'jogadores')
         and char_length(titulo) between 1 and 80
         and jsonb_typeof(mensagens) = 'array'
         and jsonb_array_length(mensagens) <= 120
         and pg_column_size(mensagens) <= 65536);
create index if not exists conversas_de_ajuda_da_conta
  on public.conversas_de_ajuda (user_id, atualizada_em desc);

alter table public.conversas_de_ajuda enable row level security;
drop policy if exists "Ver as proprias conversas" on public.conversas_de_ajuda;
create policy "Ver as proprias conversas" on public.conversas_de_ajuda
  for select using (user_id = auth.uid());
drop policy if exists "Apagar as proprias conversas" on public.conversas_de_ajuda;
create policy "Apagar as proprias conversas" on public.conversas_de_ajuda
  for delete using (user_id = auth.uid());

revoke all on table public.conversas_de_ajuda from anon, authenticated;
grant select, delete on table public.conversas_de_ajuda to authenticated;
grant all on table public.conversas_de_ajuda to service_role;

-- O site manda a conversa inteira a cada mensagem (no máximo as 120 últimas).
-- Cada mensagem é {de: 'eu' | 'gt', texto, ...}; o que a pessoa escreve tem
-- até 300 letras, e as respostas do chat são do próprio site.
create or replace function public.guardar_conversa_de_ajuda(p_id uuid, p_site text, p_titulo text, p_mensagens jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_titulo text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para guardar a conversa.' using errcode = '42501';
  end if;
  if p_site is null or p_site not in ('parceiros', 'jogadores') then
    raise exception 'Chat inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_mensagens) is distinct from 'array' or jsonb_array_length(p_mensagens) = 0
     or jsonb_array_length(p_mensagens) > 120 or pg_column_size(p_mensagens) > 65536 then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_mensagens) m
             where jsonb_typeof(m) is distinct from 'object'
                or coalesce(m->>'de', '') not in ('eu', 'gt')
                or jsonb_typeof(m->'texto') is distinct from 'string'
                or char_length(m->>'texto') > 2000
                or (m->>'de' = 'eu' and char_length(m->>'texto') > 300)) then
    raise exception 'Conversa inválida.' using errcode = '22023';
  end if;
  v_titulo := nullif(left(btrim(coalesce(p_titulo, '')), 80), '');
  if v_titulo is null then
    select nullif(left(btrim(e.m->>'texto'), 80), '') into v_titulo
      from jsonb_array_elements(p_mensagens) with ordinality e(m, i)
      where e.m->>'de' = 'eu' order by e.i limit 1;
  end if;
  if v_titulo is null then
    raise exception 'Escreva a sua dúvida antes.' using errcode = '22023';
  end if;

  if p_id is not null then
    update public.conversas_de_ajuda
      set mensagens = p_mensagens, titulo = v_titulo, atualizada_em = now()
      where id = p_id and user_id = auth.uid()
      returning id into v_id;
  end if;
  -- Conversa nova (ou apagada em outro aparelho enquanto estava aberta).
  if v_id is null then
    insert into public.conversas_de_ajuda (user_id, site, titulo, mensagens)
      values (auth.uid(), p_site, v_titulo, p_mensagens)
      returning id into v_id;
    delete from public.conversas_de_ajuda
      where id in (select c.id from public.conversas_de_ajuda c
                   where c.user_id = auth.uid()
                   order by c.atualizada_em desc, c.criada_em desc
                   offset 50);
  end if;
  return v_id;
end $$;

revoke all on function public.guardar_conversa_de_ajuda(uuid, text, text, jsonb) from public, anon;
grant execute on function public.guardar_conversa_de_ajuda(uuid, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
