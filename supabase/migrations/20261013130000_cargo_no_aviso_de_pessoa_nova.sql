-- ============================================================
-- O cargo junto do nome e do e-mail no aviso de pessoa nova (pedido do
-- Breno em 13/10/2026: "coloque o cargo tbm, junto")
-- ============================================================
-- "Ana Souza (Recepção · ana@exemplo.com) agora também administra a…",
-- como o pedido de acesso já mostra. Só muda o texto do aviso do SQL
-- 20261013120000_avisos_para_toda_a_equipe (o gatilho continua o mesmo).
-- Pode rodar de novo sem estragar nada.

create or replace function public.aviso_de_pessoa_nova()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_academia text;
  p public.academia_acessos;
  v_quem text;
  v_email text;
  v_dados text;
  v_link text := public.site_dos_emails() || '/parceiros/pessoas?abrir=' || right(replace(new.academia_id::text, '-', ''), 8)
    || '&utm_source=Email-pessoa';
  v_parar text;
  v_corpo text;
  v_dia text := public.hoje_em_brasilia()::text;
  r record;
begin
  select name into v_academia from public.academias where id = new.academia_id;
  select * into p from public.academia_acessos where user_id = new.user_id;
  if v_academia is null or p.user_id is null then
    return new;
  end if;
  v_quem := coalesce(nullif(btrim(p.nome_responsavel), ''), case when public.email_valido(p.email) then p.email end, 'Uma pessoa');
  v_email := case when public.email_valido(p.email) and lower(p.email) <> lower(v_quem) then p.email end;
  v_dados := concat_ws(' · ', nullif(btrim(coalesce(p.cargo, '')), ''), v_email);
  for r in
    select q.user_id, q.email, q.token_avisos, v.papel
    from public.quem_recebe_da_academia(new.academia_id) q
    join public.academia_vinculos v on v.user_id = q.user_id and v.academia_id = new.academia_id
    where q.user_id <> new.user_id and q.user_id is distinct from auth.uid()
  loop
    v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
    v_corpo := public.email_p('<strong>' || public.html_texto(v_quem) || '</strong>'
        || case when v_dados <> '' then ' (' || public.html_texto(v_dados) || ')' else '' end
        || ' agora também administra a <strong>' || public.html_texto(v_academia) || '</strong> no GuiaTennis Parceiros'
        || case when new.papel = 'principal' then ', como responsável principal.' else '.' end)
      || public.email_p(case when r.papel = 'principal'
           then 'Não conhece essa pessoa? Tire o acesso dela em <strong>Pessoas</strong>, no painel da academia.'
           else 'Não conhece essa pessoa? Fale com o responsável principal da academia ou com o GuiaTennis.' end);
    perform public.por_na_fila(
      'pessoa-nova:' || new.academia_id || ':' || new.user_id || ':' || r.user_id || ':' || v_dia, 'pessoa_nova', r.email,
      v_quem || ' agora administra a ' || v_academia || ' com você',
      public.email_montado('Pessoa nova na academia', v_corpo,
        case when r.papel = 'principal' then 'Ver as pessoas' else 'Abrir o GuiaTennis Parceiros' end,
        case when r.papel = 'principal' then v_link
             else public.site_dos_emails() || '/parceiros/painel?utm_source=Email-pessoa' end,
        'Você recebe este e-mail porque administra a ' || public.html_texto(v_academia)
        || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
        || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
      v_quem || case when v_dados <> '' then ' (' || v_dados || ')' else '' end
        || ' agora também administra a ' || v_academia || ' no GuiaTennis Parceiros'
        || case when new.papel = 'principal' then ', como responsável principal.' else '.' end
        || E'\n\n' || case when r.papel = 'principal'
             then 'Não conhece essa pessoa? Tire o acesso dela em Pessoas, no painel da academia: ' || v_link
             else 'Não conhece essa pessoa? Fale com o responsável principal da academia ou com o GuiaTennis.' end
        || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
      v_parar);
  end loop;
  return new;
exception when others then
  raise warning 'aviso de pessoa nova: %', sqlerrm;
  return new;
end $$;

revoke all on function public.aviso_de_pessoa_nova() from public, anon, authenticated;
