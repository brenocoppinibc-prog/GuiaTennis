-- Os textos das promoções curtos e resumidos (pedidos do Breno em 29/10/2026,
-- regras 176 a 178: "deixe um limite de caracteres que são o suficiente para
-- poder explicar sobre as promoções no leilão e na ficha"; depois, "achei
-- muita coisa nos conteúdos, precisa ser algo pequeno e resumido" e "títulos
-- também está muito grande"), como o título do Google Ads (até 30) e o texto
-- dos anúncios da Meta (~125 aparecem sem o "ver mais"):
--   título (ficha e leilão): de 60 para 30 letras;
--   detalhes da promoção na ficha: de 280 para 150;
--   mensagem do e-mail do leilão: de 500 para 300.
-- Vale para o que for salvo daqui em diante: a regra da tabela continua com
-- o teto antigo (60 e 280), para as promoções já publicadas seguirem como
-- estão. Pode rodar de novo sem estragar nada.

-- Publicar ou mudar a promoção da ficha -----------------------------------------
create or replace function public.salvar_promocao(
  p_academia uuid, p_id uuid, p_titulo text, p_detalhes text, p_semanas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  p public.promocoes;
  v_id uuid := p_id;
  v_hoje date := public.hoje_em_brasilia();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_detalhes text := nullif(btrim(coalesce(p_detalhes, '')), '');
  v_semanas integer := coalesce(p_semanas, 0);
  v_preco integer;
  v_ate date;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if not public.promocoes_liberadas(a) then
    raise exception 'As promoções na ficha são dos planos Completo e Premium.' using errcode = '42501';
  end if;
  if a.status <> 'published' then
    raise exception 'A academia ainda está em análise: a promoção pode ser criada quando ela estiver no ar.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 30 then
    raise exception 'Escreva a promoção em até 30 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(coalesce(v_detalhes, '')) > 150 then
    raise exception 'Os detalhes cabem em até 150 letras.' using errcode = '22023';
  end if;
  if v_semanas < 0 or v_semanas > 12 then
    raise exception 'Escolha de 1 a 12 semanas.' using errcode = '22023';
  end if;
  if v_id is not null then
    select * into p from public.promocoes where id = v_id and academia_id = p_academia;
    if not found then
      raise exception 'Promoção não encontrada.' using errcode = '22023';
    end if;
  end if;
  -- Nova ou reaberta: escolhe as semanas. Valendo: o texto muda de graça e
  -- dá para somar semanas.
  if (v_id is null or p.valida_ate < v_hoje) and v_semanas < 1 then
    raise exception 'Escolha de 1 a 12 semanas.' using errcode = '22023';
  end if;
  if exists (select 1 from public.promocoes
             where academia_id = p_academia and valida_ate >= v_hoje
               and (v_id is null or id <> v_id))
     and (v_id is null or p.valida_ate < v_hoje) then
    raise exception 'A academia já tem uma promoção valendo. Altere ou encerre a de agora para publicar outra.' using errcode = '22023';
  end if;
  v_ate := case when v_semanas = 0 then p.valida_ate
                when v_id is null or p.valida_ate < v_hoje then v_hoje + 7 * v_semanas - 1
                else p.valida_ate + 7 * v_semanas end;
  if v_semanas > 0 and v_ate > v_hoje + 83 then
    raise exception 'A promoção vale no máximo 12 semanas à frente.' using errcode = '22023';
  end if;
  v_preco := public.preco_da_promocao(a) * v_semanas;
  if v_preco > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou escolha menos semanas.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  if v_preco > 0 then
    perform public.mexer_creditos(p_academia, -v_preco);
  end if;
  if v_id is null then
    insert into public.promocoes (academia_id, titulo, detalhes, valida_ate, criada_por, semanas, pago)
      values (p_academia, v_titulo, v_detalhes, v_ate, auth.uid(), v_semanas, v_preco)
      returning id into v_id;
  elsif p.valida_ate < v_hoje then
    -- Reabrir conta do zero: as semanas e o pago de antes já acabaram.
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = v_ate, semanas = v_semanas, pago = v_preco,
          created_at = now(), updated_at = now()
      where id = v_id;
  else
    update public.promocoes
      set titulo = v_titulo, detalhes = v_detalhes, valida_ate = v_ate,
          semanas = semanas + v_semanas, pago = pago + v_preco, updated_at = now()
      where id = v_id;
  end if;
  return jsonb_build_object('id', v_id, 'valida_ate', v_ate, 'pago', v_preco,
    'creditos', (select envios_de_aviso from public.academias where id = p_academia));
end $$;

-- O lance do leilão ------------------------------------------------------------
create or replace function public.dar_lance(p_academia uuid, p_titulo text, p_mensagem text, p_valor integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.academias;
  cfg public.leilao_config;
  v_regiao text;
  v_fecha timestamptz := public.proximo_fechamento();
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_mensagem text := btrim(coalesce(p_mensagem, ''));
  l public.lances;
begin
  if not exists (select 1 from public.academia_vinculos
                 where user_id = auth.uid() and academia_id = p_academia) then
    raise exception 'A sua conta não administra essa academia.' using errcode = '42501';
  end if;
  select * into a from public.academias where id = p_academia;
  if not found then
    raise exception 'Academia não encontrada.' using errcode = '22023';
  end if;
  if coalesce(a.plano, 'basico') <> 'premium' then
    raise exception 'O leilão de promoções é do plano Premium.' using errcode = '42501';
  end if;
  if not public.academia_no_ar(a) then
    raise exception 'A academia precisa estar no ar para entrar no leilão.' using errcode = '22023';
  end if;
  v_regiao := public.regiao_da_academia(a);
  if v_regiao is null then
    raise exception 'Para entrar no leilão, a ficha precisa do bairro e da cidade.' using errcode = '22023';
  end if;
  if char_length(v_titulo) < 3 or char_length(v_titulo) > 30 then
    raise exception 'Escreva a promoção em até 30 letras (por exemplo, "Primeira aula grátis").' using errcode = '22023';
  end if;
  if char_length(v_mensagem) < 10 or char_length(v_mensagem) > 300 then
    raise exception 'A mensagem precisa ter de 10 a 300 letras.' using errcode = '22023';
  end if;
  select * into cfg from public.leilao_config where id = 1;
  if p_valor is null or p_valor < cfg.lance_minimo then
    raise exception 'O lance mínimo é de R$ %.', cfg.lance_minimo using errcode = '22023';
  end if;
  if p_valor > 100000 then
    raise exception 'O lance passa do limite.' using errcode = '22023';
  end if;
  if p_valor > coalesce(a.envios_de_aviso, 0) then
    raise exception 'A academia tem R$ % de créditos. Compre créditos ou dê um lance menor.', coalesce(a.envios_de_aviso, 0) using errcode = '22023';
  end if;
  insert into public.lances (academia_id, regiao, regiao_nome, fecha_em, titulo, mensagem, valor, criado_por)
    values (p_academia, v_regiao, public.nome_da_regiao(a), v_fecha, v_titulo, v_mensagem, p_valor, auth.uid())
    on conflict (academia_id, fecha_em) do update
      set titulo = excluded.titulo, mensagem = excluded.mensagem, valor = excluded.valor,
          regiao = excluded.regiao, regiao_nome = excluded.regiao_nome, updated_at = now()
      where public.lances.situacao = 'aberto'
    returning * into l;
  if l.id is null then
    raise exception 'O leilão desta semana já fechou.' using errcode = '22023';
  end if;
  return public.lance_em_json(l);
end $$;
