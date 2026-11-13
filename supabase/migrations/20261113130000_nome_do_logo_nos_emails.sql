-- O nome no alto dos e-mails como o do site (regra 260, 13/11/2026)
--
-- O site passou a mostrar o nome do logo em Poppins Bold, com "Guia" em verde e
-- "Tennis" em dourado. E-mail não carrega fonte de fora com segurança (o Gmail e
-- o Outlook ignoram), então o nome sai em Arial negrito, a mais parecida que todo
-- programa de e-mail tem, nas mesmas duas cores. Antes era Georgia, toda verde.
--
-- email_montado é a versão de 20261008120000_icone_do_email.sql, só com essa troca. Pode rodar de novo sem
-- estragar.

create or replace function public.email_montado(
  p_titulo text, p_corpo text, p_botao text, p_link text, p_rodape text)
returns text
language sql
stable
set search_path = ''
as $$
  select '<div style="margin:0;padding:24px 12px;background:#F6F1E7;font-family:Arial,Helvetica,sans-serif;color:#1F2A24">'
    || '<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:28px 24px;border:1px solid #E7DFD0">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse"><tr>'
    || '<td style="vertical-align:middle;padding:0"><img src="' || public.html_texto(public.site_dos_emails()) || '/email-logo.png" width="40" height="40" alt="" style="display:block;border:0;outline:none;width:40px;height:40px"></td>'
    || '<td style="vertical-align:middle;padding:0 0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;letter-spacing:-0.3px;color:#1F4D3A">Guia<span style="color:#B8933F">Tennis</span></td>'
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
