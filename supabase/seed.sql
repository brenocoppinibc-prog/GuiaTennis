-- ============================================================
-- GuiaTennis — academias de exemplo para o banco de teste
-- ============================================================
-- Tudo aqui é inventado: nomes com "Exemplo", telefones que não existem,
-- nenhuma foto. Cobre os casos que o site precisa mostrar: aula e locação,
-- só locação, só aula, pausada, esperando aprovação, com e sem horário,
-- cancelamento igual e separado, estacionamento próprio e na rua.
--
-- Se o banco já tiver alguma academia de verdade, para antes de gravar
-- qualquer coisa: estes exemplos nunca podem ir para o guiatennis.com.br.
-- Pode rodar de novo no banco de teste sem duplicar nada.

do $$
begin
  if exists (
    select 1 from public.academias
    where id::text not like '00000000-0000-4000-8000-00000000000_'
  ) then
    raise exception 'Este banco já tem academias de verdade. Os exemplos só podem entrar no banco de teste (guiatennis-teste).';
  end if;
end $$;

insert into public.academias
  (id, name, address, numero, complemento, bairro, cidade, endereco, lat, lng,
   phone, instagram, site, price_aula, price_locacao, amenities, modalidades,
   pisos, cobertura, quadras, photos, source, status, plano, pago,
   politica, acesso, horario, pausada, pausada_ate, nome_solicitante, contato_solicitante)
values
  ('00000000-0000-4000-8000-000000000001', 'Academia Exemplo Pinheiros',
   'Rua dos Pinheiros', '100', null, 'Pinheiros', 'São Paulo',
   'Rua dos Pinheiros, 100 - Pinheiros, São Paulo', -23.5660, -46.6920,
   '11000000001', 'exemplo.pinheiros', '', '150-180', '120-140',
   '["vestiario", "wifi", "agua", "raquete", "camera"]', '["aulas_proprias", "locacao"]',
   '["saibro"]', '["coberta", "descoberta"]', '{"saibro_coberta": 2, "saibro_descoberta": 1}', '[]',
   'custom', 'published', 'completo', true,
   '{"modo": "separado", "aula": {"reposicao": "24", "foraDoPrazo": "A aula é perdida."}, "locacao": {"reposicao": "12", "foraDoPrazo": "Cobra metade do valor."}}',
   '{"fachada": "Portão verde ao lado da padaria", "entrada": "Avise na recepção que veio pelo GuiaTennis", "estacionar": "Zona azul na rua até 19h, depois libera"}',
   '{"modo": "igual", "semana": {"de": "06:00", "ate": "22:00", "fechado": false}, "sabado": {"de": "08:00", "ate": "18:00", "fechado": false}, "domingo": {"de": "", "ate": "", "fechado": true}, "nota": "Feriados das 8h às 14h"}',
   false, null, null, null),

  ('00000000-0000-4000-8000-000000000002', 'Quadra Exemplo Moema',
   'Avenida Ibirapuera', '2000', 'Fundos', 'Moema', 'São Paulo',
   'Avenida Ibirapuera, 2000 - Fundos - Moema, São Paulo', -23.6010, -46.6650,
   '11000000002', '', '', '', '100-120',
   '["estacionamento_pago", "lanchonete"]', '["locacao"]',
   '["rapida"]', '["descoberta"]', '{"rapida_descoberta": 2}', '[]',
   'custom', 'published', 'basico', false,
   '{"modo": "igual", "reposicao": "48", "foraDoPrazo": "Sem reembolso."}',
   '{}', '{}',
   false, null, null, null),

  ('00000000-0000-4000-8000-000000000003', 'Tênis Exemplo Morumbi',
   'Rua Exemplo do Morumbi', '50', null, 'Morumbi', 'São Paulo',
   'Rua Exemplo do Morumbi, 50 - Morumbi, São Paulo', -23.6000, -46.7200,
   '11000000003', '', 'https://example.com', '200', '',
   '["estacionamento_gratuito", "vestiario", "loja", "assinatura_fitness"]', '["aulas_proprias"]',
   '["saibro", "rapida"]', '["coberta"]', '{"saibro_coberta": 1, "rapida_coberta": 1}', '[]',
   'custom', 'published', 'premium', true,
   '{"modo": "igual", "reposicao": "36", "foraDoPrazo": "Remarca uma vez no mesmo mês."}',
   '{"fachada": "Prédio branco com toldo azul", "entrada": "Toque o interfone 2"}',
   '{"modo": "dia", "seg": {"de": "07:00", "ate": "21:00", "fechado": false}, "ter": {"de": "07:00", "ate": "21:00", "fechado": false}, "qua": {"de": "07:00", "ate": "21:00", "fechado": false}, "qui": {"de": "07:00", "ate": "22:00", "fechado": false}, "sex": {"de": "07:00", "ate": "22:00", "fechado": false}, "sabado": {"de": "08:00", "ate": "13:00", "fechado": false}, "domingo": {"de": "", "ate": "", "fechado": true}}',
   false, null, null, null),

  ('00000000-0000-4000-8000-000000000004', 'Academia Exemplo Pausada',
   'Rua Domingos de Morais', '300', null, 'Vila Mariana', 'São Paulo',
   'Rua Domingos de Morais, 300 - Vila Mariana, São Paulo', -23.5890, -46.6340,
   '11000000004', '', '', '130', '110',
   '["agua"]', '["aulas_proprias", "locacao"]',
   '["saibro"]', '["descoberta"]', '{"saibro_descoberta": 1}', '[]',
   'custom', 'published', 'basico', false,
   '{}', '{}', '{}',
   true, now() + interval '30 days', null, null),

  ('00000000-0000-4000-8000-000000000005', 'Academia Exemplo Pendente',
   'Rua Voluntários da Pátria', '1500', null, 'Santana', 'São Paulo',
   'Rua Voluntários da Pátria, 1500 - Santana, São Paulo', -23.5020, -46.6250,
   '11000000005', '', '', '', '',
   '["wifi"]', '["locacao"]',
   '["rapida"]', '["coberta"]', '{"rapida_coberta": 1}', '[]',
   'custom', 'pending', 'basico', false,
   '{}', '{}', '{}',
   false, null, 'Pessoa de Exemplo', '11000000009')
on conflict (id) do nothing;

insert into public.avaliacoes (id, academia_id, stars, comment, nome_autor, contato_autor, created_at) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 5, 'Quadras ótimas e professores atenciosos.', 'Ana (exemplo)', '11000000011', now() - interval '20 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 4, 'Bom lugar, só o estacionamento é difícil.', 'Bruno (exemplo)', '11000000012', now() - interval '8 days'),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 3, 'Quadra boa, vestiário simples.', 'Carla (exemplo)', '11000000013', now() - interval '3 days'),
  ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000000003', 5, null, 'Diego (exemplo)', '11000000014', now() - interval '1 day')
on conflict (id) do nothing;

-- Um pouco de movimento, para a home e o painel do admin terem números.
insert into public.cliques (id, academia_id, tipo, detalhe, cep, lat, lng, origem, dispositivo, created_at) values
  ('00000000-0000-4000-a000-000000000001', null, 'acesso_site', null, null, null, null, 'Instagram', 'Celular', now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000002', null, 'acesso_site', null, null, null, null, 'Google', 'Computador', now() - interval '5 days'),
  ('00000000-0000-4000-a000-000000000003', null, 'acesso_site', null, null, null, null, 'Direto', 'Celular', now() - interval '2 days'),
  ('00000000-0000-4000-a000-000000000004', null, 'busca', 'Pinheiros, São Paulo', '05422-000', -23.566, -46.692, null, 'Celular', now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000005', null, 'busca', 'Moema, São Paulo', '04077-000', -23.601, -46.665, null, 'Computador', now() - interval '5 days'),
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-8000-000000000001', 'visualizacao', 'Pinheiros, São Paulo', '05422-000', -23.566, -46.692, 'Instagram', 'Celular', now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000007', '00000000-0000-4000-8000-000000000001', 'whatsapp', 'Pinheiros, São Paulo', '05422-000', -23.566, -46.692, 'Instagram', 'Celular', now() - interval '6 days'),
  ('00000000-0000-4000-a000-000000000008', '00000000-0000-4000-8000-000000000002', 'visualizacao', 'Moema, São Paulo', '04077-000', -23.601, -46.665, 'Google', 'Computador', now() - interval '5 days'),
  ('00000000-0000-4000-a000-000000000009', '00000000-0000-4000-8000-000000000003', 'instagram', null, null, null, null, 'Direto', 'Celular', now() - interval '2 days')
on conflict (id) do nothing;
