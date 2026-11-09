-- A disputa é decidida pelo GuiaTennis (regra 221, pedido do Breno em
-- 09/11/2026: "não deve ganhar quem contestou e sim eu analisar o que é certo
-- ou não"). Como no Booking e no Tripadvisor, quem decide quem administra é
-- uma pessoa do GuiaTennis: o código no WhatsApp da academia vira uma prova
-- (mostra que quem contestou tem aquele WhatsApp), guardada em
-- `codigo_ok_em`, e o admin recebe o aviso para decidir. Em Pendências, o
-- admin dá a academia a quem contestou (aprovar_pedido_de_acesso) ou mantém
-- com quem administra (recusar_pedido_de_acesso). Fora da disputa, o código
-- continua liberando o acesso na hora. Pode rodar de novo sem estragar.

alter table public.pedidos_de_acesso add column if not exists codigo_ok_em timestamptz;

-- O código certo na disputa: guarda a prova e avisa o admin ('analise').
create or replace function public.confirmar_meu_codigo(p_codigo text, p_academia uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.codigos_de_verificacao;
  v_disputa boolean;
  v_codigo text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  a public.academias;
  x public.academia_acessos;
  v_quem text;
begin
  if not exists (select 1 from public.academia_acessos where user_id = auth.uid()) then
    raise exception 'Entre na sua conta do GuiaTennis Parceiros.' using errcode = '42501';
  end if;
  select k.* into c from public.codigos_de_verificacao k
    join public.pedidos_de_acesso p on p.user_id = k.user_id and p.academia_id = k.academia_id
    where k.user_id = auth.uid() and (p_academia is null or k.academia_id = p_academia)
    order by k.criado_em desc
    limit 1;
  if not found then
    if exists (select 1 from public.pedidos_de_acesso
               where user_id = auth.uid() and (p_academia is null or academia_id = p_academia)
                 and destino = 'disputa' and codigo_ok_em is not null) then
      return 'analise';
    end if;
    return 'sem_codigo';
  end if;
  v_disputa := exists (select 1 from public.pedidos_de_acesso
                       where user_id = auth.uid() and academia_id = c.academia_id and destino = 'disputa');
  if not v_disputa and exists (select 1 from public.academia_vinculos
                               where academia_id = c.academia_id and papel = 'principal') then
    delete from public.codigos_de_verificacao where user_id = auth.uid() and academia_id = c.academia_id;
    return 'sem_codigo';
  end if;
  if c.criado_em < now() - interval '72 hours' then
    return 'venceu';
  end if;
  if c.tentativas >= 5 then
    return 'tentativas';
  end if;
  if length(v_codigo) <> 6 or extensions.crypt(v_codigo, c.codigo_hash) <> c.codigo_hash then
    update public.codigos_de_verificacao set tentativas = tentativas + 1
      where user_id = auth.uid() and academia_id = c.academia_id;
    return 'errado';
  end if;
  if not v_disputa then
    perform public.ligar_conta_a_academia(auth.uid(), c.academia_id, true);
    return 'ok';
  end if;
  update public.pedidos_de_acesso set codigo_ok_em = now()
    where user_id = auth.uid() and academia_id = c.academia_id;
  delete from public.codigos_de_verificacao where user_id = auth.uid() and academia_id = c.academia_id;
  select * into a from public.academias where id = c.academia_id;
  select * into x from public.academia_acessos where user_id = auth.uid();
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  perform public.aviso_ao_admin('disputa_codigo:' || c.academia_id || ':' || auth.uid(), 'disputa',
    'Disputa: código confirmado na ' || a.name, 'Código confirmado na disputa',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> digitou o código certo na disputa da <strong>'
      || public.html_texto(a.name) || '</strong>: tem o WhatsApp da academia.')
    || public.email_p('A academia não muda sozinha. Em Pendências, analise e decida: dar a academia a quem contestou ou manter com quem administra.'),
    v_quem || ' digitou o código certo na disputa da ' || a.name
    || E': tem o WhatsApp da academia.\n\nA academia não muda sozinha. Em Pendências, analise e decida: dar a academia a quem contestou ou manter com quem administra.');
  return 'analise';
end $$;

-- O aviso de disputa nova, com o texto novo (o código não decide sozinho).
create or replace function public.aviso_de_disputa(p_academia uuid, p_user uuid, p_codigo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_quem text;
  v_o_que text;
begin
  select * into a from public.academias where id = p_academia;
  select * into x from public.academia_acessos where user_id = p_user;
  v_quem := coalesce(x.nome_responsavel, x.email) || ' (' || coalesce(x.email, x.usuario) || ')';
  v_o_que := case p_codigo
    when 'mandado' then 'O código já saiu sozinho pelo WhatsApp do GuiaTennis para o WhatsApp da academia. Se quem contestou digitar o código, você recebe outro aviso. A academia não muda sozinha: em Pendências, analise e decida.'
    when 'confirme_email' then 'Quem pediu ainda não confirmou o e-mail: confirmado, o código sai sozinho pelo WhatsApp. A academia não muda sozinha: em Pendências, analise e decida.'
    when 'sem_whatsapp' then 'A ficha não tem WhatsApp para mandar o código. Em Pendências, peça documento, analise e decida.'
    else 'Em Pendências, mande o código para o WhatsApp da academia. A academia não muda sozinha: com o código, documentos e o que diz quem administra, analise e decida.' end;
  perform public.aviso_ao_admin('disputa:' || p_academia || ':' || p_user || ':' || public.hoje_em_brasilia(), 'disputa',
    'Disputa: ' || a.name, 'Academia em disputa',
    public.email_p('<strong>' || public.html_texto(v_quem) || '</strong> contesta quem administra a <strong>'
      || public.html_texto(a.name) || '</strong> no GuiaTennis Parceiros.')
    || public.email_p(public.html_texto(v_o_que)),
    v_quem || ' contesta quem administra a ' || a.name || E' no GuiaTennis Parceiros.\n\n' || v_o_que);
end $$;

-- Os pedidos da conta e do admin passam a dizer quando o código foi confirmado.
drop function if exists public.meus_pedidos_de_acesso();
create or replace function public.meus_pedidos_de_acesso()
returns table (academia_id uuid, nome text, destino text, pedido_em timestamptz,
  status text, codigo_em timestamptz, codigo_ok_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, a.status, k.criado_em, p.codigo_ok_em
  from public.pedidos_de_acesso p
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  where p.user_id = auth.uid()
  order by p.pedido_em;
$$;

drop function if exists public.pedidos_de_acesso_admin();
create or replace function public.pedidos_de_acesso_admin()
returns table (user_id uuid, academia_id uuid, nome text, destino text, pedido_em timestamptz,
  codigo_em timestamptz, nome_responsavel text, tratamento text, cargo text, email text,
  usuario text, whatsapp text, telefone_antes text,
  whatsapp_em timestamptz, whatsapp_enviado_em timestamptz, whatsapp_origem text, whatsapp_erro text,
  codigo_ok_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.academia_id, coalesce(a.name, p.nome), p.destino, p.pedido_em, k.criado_em,
    x.nome_responsavel, x.tratamento, x.cargo, x.email, x.usuario, x.whatsapp,
    (select v.telefone_da_ficha from public.academia_vinculos v
     where v.academia_id = p.academia_id and v.papel = 'principal' and v.telefone_da_ficha is not null
     order by v.created_at limit 1),
    w.criado_em, w.enviado_em, w.origem, w.erro, p.codigo_ok_em
  from public.pedidos_de_acesso p
  join public.academia_acessos x on x.user_id = p.user_id
  left join public.academias a on a.id = p.academia_id
  left join public.codigos_de_verificacao k on k.user_id = p.user_id and k.academia_id = p.academia_id
  left join lateral (select z.criado_em, z.enviado_em, z.origem, z.erro from public.whatsapp_a_enviar z
                     where z.user_id = p.user_id and z.academia_id = p.academia_id
                     order by z.criado_em desc limit 1) w on true
  where public.eh_admin()
  order by p.pedido_em;
$$;

revoke all on function public.aviso_de_disputa(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.meus_pedidos_de_acesso() from public, anon;
revoke all on function public.pedidos_de_acesso_admin() from public, anon;
revoke all on function public.confirmar_meu_codigo(text, uuid) from public, anon;
grant execute on function public.confirmar_meu_codigo(text, uuid),
  public.meus_pedidos_de_acesso(),
  public.pedidos_de_acesso_admin()
  to authenticated;

notify pgrst, 'reload schema';
