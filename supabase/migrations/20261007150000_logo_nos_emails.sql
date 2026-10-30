-- ============================================================
-- A logo do GuiaTennis nos e-mails (pedido do Breno em 07/10/2026: "eu
-- quero poder ter minha logo nos emails")
-- ============================================================
-- Como Airbnb, Booking e Google: a logo pequena no alto de todo aviso, ao
-- lado do nome. A imagem é o ícone do site (favicon-192.png, já no ar em
-- guiatennis.com.br), em PNG: o Gmail e o Outlook não mostram SVG. Em
-- tabela, que todo programa de e-mail entende. Se o programa bloquear
-- imagens, o nome continua lá.
--
-- (A logo redonda ao lado do remetente, na lista do Gmail, é outra coisa:
-- o BIMI, que pede um certificado pago — GUIATENNIS-CONTEXTO.md, regra 67.)
--
-- Pode rodar de novo sem estragar nada.

create or replace function public.email_montado(
  p_titulo text, p_corpo text, p_botao text, p_link text, p_rodape text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '<div style="margin:0;padding:24px 12px;background:#F6F1E7;font-family:Arial,Helvetica,sans-serif;color:#1F2A24">'
    || '<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:28px 24px;border:1px solid #E7DFD0">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse"><tr>'
    || '<td style="vertical-align:middle;padding:0"><img src="https://guiatennis.com.br/favicon-192.png" width="40" height="40" alt="" style="display:block;border:0;outline:none;width:40px;height:40px"></td>'
    || '<td style="vertical-align:middle;padding:0 0 0 10px;font-family:Georgia,''Times New Roman'',serif;font-size:22px;font-weight:bold;color:#1F4D3A">GuiaTennis</td>'
    || '</tr></table>'
    || '<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#1F2A24">' || public.html_texto(p_titulo) || '</h1>'
    || coalesce(p_corpo, '')
    || case when p_botao is null then '' else
         '<p style="margin:22px 0 4px"><a href="' || public.html_texto(p_link) || '" style="display:inline-block;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">'
         || public.html_texto(p_botao) || '</a></p>' end
    || '<p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #EFE8DA;font-size:12px;line-height:1.5;color:#6B6458">' || coalesce(p_rodape, '') || '</p>'
    || '<p style="margin:8px 0 0;font-size:12px;color:#6B6458">GuiaTennis · guiatennis.com.br</p>'
    || '</div></div>';
$$;

