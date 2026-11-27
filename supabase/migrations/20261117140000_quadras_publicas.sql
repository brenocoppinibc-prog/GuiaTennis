-- Regra 296 (17/11/2026): "quero ter a opção de adicionar quadras públicas,
-- como pode ficar a administração delas?" … "sim, quero um botão também de
-- sugerir quadras públicas ou até mesmo academia, no início do menu, para eu
-- entrar em contato".
--
-- Como os parques e praças do Google Maps e o "Find a court" da federação
-- americana: a quadra pública é uma ficha do GuiaTennis, sem dono no Parceiros.
--   academias.tipo        'academia' (de sempre) ou 'publica'.
--   academias.como_usar   na pública: como usar (chegar e jogar, agendar na
--                         prefeitura, levar a rede…), até 200 letras.
-- Só o admin cadastra e muda a pública (o site dele); o visitante lê as duas
-- colunas. A sugestão dos jogadores vai pelo chat de ajuda (sugestão), que o
-- admin já vê com o nome e o e-mail de quem mandou. Pode rodar de novo.

alter table public.academias add column if not exists tipo text not null default 'academia';
alter table public.academias add column if not exists como_usar text;

alter table public.academias drop constraint if exists academias_tipo_valido;
alter table public.academias add constraint academias_tipo_valido
  check (tipo in ('academia', 'publica'));
alter table public.academias drop constraint if exists academias_como_usar_tamanho;
alter table public.academias add constraint academias_como_usar_tamanho
  check (como_usar is null or char_length(como_usar) <= 200);

grant select (tipo, como_usar) on public.academias to anon, authenticated;

notify pgrst, 'reload schema';
