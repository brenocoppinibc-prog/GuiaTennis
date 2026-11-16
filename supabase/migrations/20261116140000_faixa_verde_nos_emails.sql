-- Regra 286 (16/11/2026): o nome no alto dos e-mails igual ao do site ("deixe
-- as cores que forem melhor para visualização, carregamento do site, do e-mail.
-- Pode deixar como se fosse um amarelo e fundo verde, igual ... no rodapé").
--
-- O alto de todo e-mail vira uma faixa verde (#1F4D3D) com a raquete
-- (email-logo.png) e o nome em Poppins numa imagem pequena (email-nome.png,
-- 142×20, "Guia" branco e "Tennis" dourado), como o rodapé do site. Faixa verde
-- com letra clara fica legível no modo claro e no escuro; sem as imagens, aparece
-- "GuiaTennis" em branco no verde. Antes era Arial negrito, "Guia" verde.
--
-- email_montado é a versão de 20261113130000_nome_do_logo_nos_emails, só com
-- essa troca. Pode rodar de novo sem estragar.

create or replace function public.email_montado(
  p_titulo text, p_corpo text, p_botao text, p_link text, p_rodape text)
returns text
language sql
stable
set search_path = ''
as $$
  select '<div style="margin:0;padding:24px 12px;background:#F6F1E7;font-family:Arial,Helvetica,sans-serif;color:#1F2A24">'
    || '<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:28px 24px;border:1px solid #E7DFD0">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1F4D3D" style="margin:0 0 20px;border-collapse:separate;background:#1F4D3D;border-radius:12px"><tr><td align="center" style="padding:14px 16px">'
    || '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>'
    || '<td style="vertical-align:middle;padding:0"><img src="' || public.html_texto(public.site_dos_emails()) || '/email-logo.png" width="34" height="34" alt="" style="display:block;border:0;outline:none;width:34px;height:34px"></td>'
    || '<td style="vertical-align:middle;padding:0 0 0 10px"><img src="' || public.html_texto(public.site_dos_emails()) || '/email-nome.png" width="142" height="20" alt="GuiaTennis" style="display:block;border:0;outline:none;width:142px;height:20px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#FFFFFF"></td>'
    || '</tr></table></td></tr></table>'
    || '<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#1F2A24">' || public.html_texto(p_titulo) || '</h1>'
    || coalesce(p_corpo, '')
    || case when p_botao is null then '' else
         '<p style="margin:22px 0 4px"><a href="' || public.html_texto(p_link) || '" style="display:inline-block;background:#1F4D3A;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 22px;border-radius:10px">'
         || public.html_texto(p_botao) || '</a></p>' end
    || '<p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #EFE8DA;font-size:12px;line-height:1.5;color:#6B6458">' || coalesce(p_rodape, '') || '</p>'
    || '<p style="margin:8px 0 0;font-size:12px;color:#6B6458">GuiaTennis · guiatennis.com.br</p>'
    || '</div></div>';
$$;

notify pgrst, 'reload schema';
