-- ============================================================
-- A ficha só sai do Guia quando a academia fecha as portas (pedido do Breno
-- em 19/10/2026: "a ficha publicada irá continuar no Guia se ainda houver
-- dados públicos sobre essa academia ou se permanecer aberta, se fechar as
-- portas, é excluída")
-- ============================================================
-- Como o "Fechado permanentemente" do Google: quem administra avisa e o
-- GuiaTennis confere antes de tirar. Volta o pedido do SQL 20261008150000,
-- fechado pelo 20261020130000, só com o motivo "fechou":
--   pedir_para_sair_do_guia     o responsável principal avisa que a
--                               academia fechou (com detalhes, se quiser).
--   resolver_pedido_para_sair   o admin confirma ("Fechou: tirar do Guia",
--                               apaga a ficha) ou mantém ("Continua
--                               aberta"); os e-mails dizem que fechou.
--   tirar_academia_que_fechou   o admin tira direto a academia que fechou,
--                               sem aviso de ninguém (a ficha sem
--                               responsável, por exemplo). Quem administrava
--                               recebe o e-mail.
-- A academia aberta (ou com informações públicas) continua no Guia, mesmo
-- sem responsável; o admin só apaga, pelo site, o cadastro em análise.
-- Pode rodar de novo sem estragar nada.

create or replace function public.pedir_para_sair_do_guia(p_academia uuid, p_motivo text, p_detalhes text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  x public.academia_acessos;
  v_id uuid;
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia and papel = 'principal') then
    raise exception 'Quem avisa que a academia fechou é o responsável principal.' using errcode = '42501';
  end if;
  if coalesce(p_motivo, '') <> 'fechou' then
    raise exception 'Só a academia que fechou as portas sai do Guia. Se for por um tempo, use Pausar no site.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 500 then
    raise exception 'Os detalhes cabem em até 500 letras.' using errcode = '22023';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pedidos_para_sair where academia_id = p_academia and resolvido_em is null) then
    raise exception 'Já existe um aviso de que esta academia fechou.' using errcode = '22023';
  end if;
  insert into public.pedidos_para_sair (academia_id, academia_nome, user_id, motivo, detalhes)
    values (p_academia, a.name, auth.uid(), 'fechou', v_detalhes)
    returning id into v_id;
  select * into x from public.academia_acessos where user_id = auth.uid();
  perform public.aviso_ao_admin(
    'sair:' || v_id, 'pedido_para_sair', 'A academia fechou: ' || a.name,
    'Academia fechou as portas',
    public.email_p('<strong>' || public.html_texto(coalesce(x.nome_responsavel, x.email, 'O responsável')) || '</strong> avisou que a <strong>'
      || public.html_texto(a.name) || '</strong> fechou as portas.')
    || coalesce(public.email_p('Detalhes: ' || public.html_texto(v_detalhes) || '.'), '')
    || public.email_p('Confira se ela fechou mesmo (Google, Instagram, telefone) e responda no painel: "Fechou: tirar do Guia" ou "Continua aberta".'),
    coalesce(x.nome_responsavel, x.email, 'O responsável') || ' avisou que a ' || a.name || ' fechou as portas.'
      || coalesce(' Detalhes: ' || v_detalhes || '.', ''));
  return v_id;
end $$;

create or replace function public.resolver_pedido_para_sair(p_id uuid, p_remover boolean, p_resposta text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_para_sair;
  v_email text;
  v_nome text;
  v_quem text;
  v_resposta text := nullif(btrim(coalesce(p_resposta, '')), '');
  v_outros jsonb := '[]'::jsonb;
  v_parar text;
  v_fato text;
  o jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis resolve esse aviso.' using errcode = '42501';
  end if;
  select * into p from public.pedidos_para_sair where id = p_id and resolvido_em is null;
  if not found then
    raise exception 'Aviso não encontrado ou já resolvido.' using errcode = '22023';
  end if;
  select x.email, x.nome_responsavel into v_email, v_nome from public.academia_acessos x where x.user_id = p.user_id;
  v_quem := coalesce(nullif(btrim(v_nome), ''), 'O responsável principal');
  -- Quem avisou (ou, sem aviso, o GuiaTennis) e o que aconteceu.
  v_fato := case when p.user_id is null then 'O GuiaTennis confirmou que a ' || p.academia_nome || ' fechou as portas'
                 else v_quem || ' avisou que a ' || p.academia_nome || ' fechou as portas' end;
  if p.academia_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('user_id', q.user_id, 'email', q.email, 'token', q.token_avisos)), '[]'::jsonb)
      into v_outros
      from public.quem_recebe_da_academia(p.academia_id) q
      where q.user_id is distinct from p.user_id;
  end if;
  update public.pedidos_para_sair
    set resolvido_em = now(), resolucao = case when p_remover then 'removida' else 'mantida' end, resposta = v_resposta
    where id = p_id;
  if p_remover and p.academia_id is not null then
    delete from public.academias where id = p.academia_id;
  end if;
  -- A resposta para quem avisou.
  if v_email is not null then
    begin
      perform public.por_na_fila('sair-resposta:' || p_id, 'pedido_para_sair_resposta', v_email,
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do Guia' else 'A academia continua no Guia' end,
          public.email_p('Olá' || coalesce(', ' || public.html_texto(split_part(btrim(v_nome), ' ', 1)), '') || '!')
          || case when p_remover
               then public.email_p('Conferimos que a <strong>' || public.html_texto(p.academia_nome) || '</strong> fechou as portas, e ela não aparece mais no GuiaTennis.')
               else public.email_p('A <strong>' || public.html_texto(p.academia_nome) || '</strong> continua no GuiaTennis: ela ainda aparece aberta ou com informações públicas.')
                    || coalesce(public.email_p(public.html_texto(v_resposta)), '')
                    || public.email_p('Para tirar a ficha da busca por um tempo, use Suas academias › Pausar no site.') end,
          case when p_remover then null else 'Abrir o GuiaTennis Parceiros' end,
          case when p_remover then null else public.site_dos_emails() || '/parceiros/academias' end,
          'Aviso automático do GuiaTennis Parceiros.'),
        case when p_remover then 'Conferimos que a ' || p.academia_nome || ' fechou as portas, e ela não aparece mais no GuiaTennis.'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis: ela ainda aparece aberta ou com informações públicas.'
                  || coalesce(E'\n\n' || v_resposta, '') end);
    exception when others then
      raise warning 'resposta do aviso de que fechou: %', sqlerrm;
    end;
  end if;
  -- E para as outras pessoas da academia.
  for o in select * from jsonb_array_elements(v_outros) loop
    begin
      v_parar := public.link_parar_avisos((o->>'token')::uuid, 'parceiros');
      perform public.por_na_fila('sair-resposta:' || p_id || ':' || (o->>'user_id'), 'pedido_para_sair_resposta', o->>'email',
        case when p_remover then 'A ' || p.academia_nome || ' saiu do GuiaTennis'
             else 'A ' || p.academia_nome || ' continua no GuiaTennis' end,
        public.email_montado(case when p_remover then 'A academia saiu do Guia' else 'A academia continua no Guia' end,
          case when p_remover
            then public.email_p(public.html_texto(v_fato) || ', e ela não aparece mais no GuiaTennis. A ficha foi apagada, com as avaliações.')
            else public.email_p(public.html_texto(v_fato) || ', mas ela continua no Guia: ainda aparece aberta ou com informações públicas.')
                 || coalesce(public.email_p(public.html_texto(v_resposta)), '') end,
          case when p_remover then null else 'Abrir o GuiaTennis Parceiros' end,
          case when p_remover then null else public.site_dos_emails() || '/parceiros/academias' end,
          case when p_remover then 'Você recebe este e-mail porque administrava a ' else 'Você recebe este e-mail porque administra a ' end
          || public.html_texto(p.academia_nome) || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        case when p_remover
          then v_fato || ', e ela não aparece mais no GuiaTennis. A ficha foi apagada, com as avaliações.'
          else v_fato || ', mas ela continua no Guia: ainda aparece aberta ou com informações públicas.'
               || coalesce(E'\n\n' || v_resposta, '') end
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar);
    exception when others then
      raise warning 'resposta do aviso de que fechou (equipe): %', sqlerrm;
    end;
  end loop;
end $$;

-- O admin tira direto a academia que fechou (sem aviso de ninguém).
create or replace function public.tirar_academia_que_fechou(p_academia uuid, p_detalhes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  v_id uuid;
begin
  if not public.eh_admin() then
    raise exception 'Só o GuiaTennis tira uma academia do Guia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  update public.pedidos_para_sair set resolvido_em = now(), resolucao = 'cancelado'
    where academia_id = p_academia and resolvido_em is null;
  insert into public.pedidos_para_sair (academia_id, academia_nome, user_id, motivo, detalhes)
    values (p_academia, a.name, null, 'fechou', nullif(btrim(coalesce(p_detalhes, '')), ''))
    returning id into v_id;
  perform public.resolver_pedido_para_sair(v_id, true, null);
end $$;

revoke all on function public.pedir_para_sair_do_guia(uuid, text, text) from public, anon;
grant execute on function public.pedir_para_sair_do_guia(uuid, text, text) to authenticated;
revoke all on function public.resolver_pedido_para_sair(uuid, boolean, text) from public, anon;
grant execute on function public.resolver_pedido_para_sair(uuid, boolean, text) to authenticated;
revoke all on function public.tirar_academia_que_fechou(uuid, text) from public, anon;
grant execute on function public.tirar_academia_que_fechou(uuid, text) to authenticated;

notify pgrst, 'reload schema';
