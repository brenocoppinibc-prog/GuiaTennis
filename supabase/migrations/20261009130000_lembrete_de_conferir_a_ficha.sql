-- ============================================================
-- Lembrete por e-mail: a ficha está há 3 meses sem mudar (pedido do Breno
-- em 09/10/2026: "academias devem receber mensagem de atualização do
-- cadastro depois de 3 meses sem alterações")
-- ============================================================
-- Como o "Confirme as informações da sua empresa" do Google Business
-- Profile, o "Is your business information up to date?" do Yelp e os
-- lembretes do Booking para parceiros: quando a ficha da academia passa 3
-- meses sem mudar (academias.dados_atualizados_em, SQL 20261007120000),
-- quem administra recebe um e-mail para conferir e salvar. Salvar, mesmo
-- sem mudar nada, confirma que está tudo certo e a data volta a "hoje".
--
-- Sai junto com os avisos do dia (10h de Brasília). Uma vez quando a ficha
-- completa 3 meses parada e de novo a cada 3 meses enquanto ela continuar
-- parada. Só para academia no ar (pausada não recebe) e só para quem
-- recebe os avisos do Parceiros (e-mail confirmado e avisos ligados no
-- Perfil). Sem ninguém para receber, tenta de novo no dia seguinte.
--
-- Pode rodar de novo sem estragar nada.

-- Quando a academia foi lembrada pela última vez. Tabela à parte: uma
-- coluna nova em academias mudaria a data da ficha (marcar_dados_atualizados).
create table if not exists public.lembretes_de_ficha (
  academia_id uuid primary key references public.academias(id) on delete cascade,
  lembrada_em timestamptz not null default now()
);
alter table public.lembretes_de_ficha enable row level security;
revoke all on public.lembretes_de_ficha from anon, authenticated;

create or replace function public.preparar_lembretes_de_ficha()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  r record;
  v_desde date;
  v_meses int;
  v_link text;
  v_corpo text;
  v_parar text;
  v_hoje text := public.hoje_em_brasilia()::text;
  v_mandou boolean;
  v_academias int := 0;
begin
  for a in
    select x.id, x.name, x.dados_atualizados_em
    from public.academias x
    where public.academia_no_ar(x)
      and x.dados_atualizados_em < now() - interval '3 months'
      and exists (select 1 from public.academia_vinculos v where v.academia_id = x.id)
      and not exists (select 1 from public.lembretes_de_ficha l
                      where l.academia_id = x.id and l.lembrada_em > now() - interval '3 months')
  loop
    v_desde := (a.dados_atualizados_em at time zone 'America/Sao_Paulo')::date;
    v_meses := greatest(3, (extract(year from age(public.hoje_em_brasilia(), v_desde)) * 12
                            + extract(month from age(public.hoje_em_brasilia(), v_desde)))::int);
    -- ?abrir= abre esta academia no painel (a conta pode ter várias).
    v_link := public.site_dos_emails() || '/parceiros/ficha?abrir=' || right(replace(a.id::text, '-', ''), 8)
      || '&utm_source=Email-ficha';
    v_corpo := public.email_p('A ficha da <strong>' || public.html_texto(a.name) || '</strong> no GuiaTennis não muda desde <strong>'
                 || public.data_por_extenso(v_desde) || ' de ' || extract(year from v_desde) || '</strong> — há '
                 || v_meses || ' meses. Na ficha, o jogador vê quando ela foi atualizada pela última vez.')
      || public.email_p('Preço, horário, quadras e professores mudam com o tempo. Confira a ficha e salve: '
                 || 'salvar, mesmo sem mudar nada, mostra ao jogador que está tudo certo, e a ficha volta a dizer <strong>“atualizada hoje”</strong>.');
    v_mandou := false;
    for r in select * from public.quem_recebe_da_academia(a.id) loop
      v_parar := public.link_parar_avisos(r.token_avisos, 'parceiros');
      if public.por_na_fila(
        'ficha-parada:' || a.id || ':' || r.user_id || ':' || v_hoje, 'ficha_parada', r.email,
        'Confira a ficha da ' || a.name || ' no GuiaTennis',
        public.email_montado('Está tudo certo na ficha?', v_corpo, 'Conferir a ficha', v_link,
          'Você recebe este e-mail porque administra a ' || public.html_texto(a.name)
          || ' no GuiaTennis Parceiros. <a href="' || public.html_texto(v_parar)
          || '" style="color:#6B6458">Não quero mais receber avisos por e-mail</a>.'),
        'A ficha da ' || a.name || ' no GuiaTennis não muda desde ' || public.data_por_extenso(v_desde) || ' de '
          || extract(year from v_desde) || ' — há ' || v_meses || ' meses.'
          || E'\n\nPreço, horário, quadras e professores mudam com o tempo. Confira a ficha e salve: salvar, mesmo sem mudar nada, mostra ao jogador que está tudo certo.'
          || E'\n\nConferir a ficha: ' || v_link
          || E'\n\nNão quer mais receber avisos por e-mail? ' || v_parar,
        v_parar) then
        v_mandou := true;
      end if;
    end loop;
    if v_mandou then
      insert into public.lembretes_de_ficha (academia_id, lembrada_em) values (a.id, now())
      on conflict (academia_id) do update set lembrada_em = excluded.lembrada_em;
      v_academias := v_academias + 1;
    end if;
  end loop;
  return v_academias;
end $$;

-- Os avisos do dia (SQL 20261005160000) com o lembrete da ficha.
create or replace function public.preparar_avisos_do_dia()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.preparar_aviso_de_viagem(null);
  perform public.preparar_avisos_de_academias_novas();
  begin
    perform public.preparar_lembretes_de_ficha();
  exception when others then
    raise warning 'lembrete de conferir a ficha: %', sqlerrm;
  end;
  delete from public.emails_a_enviar where criado_em < now() - interval '60 days';
  begin
    execute 'delete from cron.job_run_details where end_time < now() - interval ''7 days''';
  exception when others then
    null;
  end;
end $$;

revoke all on function public.preparar_lembretes_de_ficha() from public, anon, authenticated;
revoke all on function public.preparar_avisos_do_dia() from public, anon, authenticated;
