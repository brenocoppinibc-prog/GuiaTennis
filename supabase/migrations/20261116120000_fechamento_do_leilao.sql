-- Regra 284 (16/11/2026): "eu quero alterar as datas que finalizam o leilão".
--
-- O leilão das promoções por e-mail fechava sempre no domingo às 20h de
-- Brasília (proximo_fechamento, SQL 20261019120000). Agora o dia da semana e a
-- hora ficam em leilao_config e o admin troca no painel (Leilões › "Quando o
-- leilão fecha"):
--
--   leilao_config.dia_fechamento   0 = domingo … 6 = sábado (começa no domingo)
--   leilao_config.hora_fechamento  0 a 23, hora cheia de Brasília (começa 20)
--   proximo_fechamento()           o próximo dia e hora da config
--   mudar_fechamento_do_leilao     só o admin; os lances abertos da semana passam
--                                  para o fechamento novo
--
-- Os envios seguem contados a partir do fechamento (o 1º lugar 1 dia e 14 horas
-- depois; o 2º, 4 dias e 14 horas depois), como antes. Pode rodar de novo.

alter table public.leilao_config add column if not exists dia_fechamento integer not null default 0;
alter table public.leilao_config add column if not exists hora_fechamento integer not null default 20;
alter table public.leilao_config drop constraint if exists leilao_config_fechamento_ok;
alter table public.leilao_config add constraint leilao_config_fechamento_ok
  check (dia_fechamento between 0 and 6 and hora_fechamento between 0 and 23);

-- O próximo fechamento pela config (security definer: a config tem RLS e quem
-- chama nem sempre lê a tabela). Sem config, domingo às 20h, como era.
create or replace function public.proximo_fechamento(p_agora timestamptz default now())
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
         select coalesce((select c.dia_fechamento from public.leilao_config c where c.id = 1), 0) as dia,
                coalesce((select c.hora_fechamento from public.leilao_config c where c.id = 1), 20) as hora),
       l as (select (p_agora at time zone 'America/Sao_Paulo') as agora),
       d as (select l.agora, make_time(cfg.hora, 0, 0) as hora,
                    l.agora::date + ((cfg.dia - extract(dow from l.agora)::integer + 7) % 7) as dia
             from l, cfg)
  select ((case when d.dia = d.agora::date and d.agora::time >= d.hora then d.dia + 7 else d.dia end) + d.hora)
         at time zone 'America/Sao_Paulo'
  from d;
$$;

create or replace function public.mudar_fechamento_do_leilao(p_dia integer, p_hora integer)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo timestamptz;
begin
  if not public.eh_admin() then
    raise exception 'Só o admin muda o fechamento do leilão.' using errcode = '42501';
  end if;
  if p_dia is null or p_dia < 0 or p_dia > 6 then
    raise exception 'Escolha um dia da semana.' using errcode = '22023';
  end if;
  if p_hora is null or p_hora < 0 or p_hora > 23 then
    raise exception 'Escolha uma hora de 0 a 23.' using errcode = '22023';
  end if;
  update public.leilao_config
     set dia_fechamento = p_dia, hora_fechamento = p_hora, updated_at = now()
   where id = 1;
  v_novo := public.proximo_fechamento();
  -- Os lances da semana, ainda abertos, passam para o fechamento novo.
  update public.lances
     set fecha_em = v_novo, updated_at = now()
   where situacao = 'aberto' and fecha_em > now() and fecha_em <> v_novo;
  return v_novo;
end $$;

revoke all on function public.mudar_fechamento_do_leilao(integer, integer) from public, anon;
grant execute on function public.mudar_fechamento_do_leilao(integer, integer) to authenticated;
