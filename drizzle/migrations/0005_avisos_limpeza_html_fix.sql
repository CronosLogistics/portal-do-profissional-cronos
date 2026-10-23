CREATE OR REPLACE FUNCTION public.limpar_html_aviso(_html text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  r text := coalesce(_html, '');
  anterior text;
BEGIN
  LOOP
    anterior := r;
    r := regexp_replace(r, '<(script|style|iframe|object|embed|svg|math)\y[^>]*>.*?</\1\s*>', '', 'gi');
    r := regexp_replace(r, '<!--.*?-->', '', 'g');
    r := regexp_replace(r, '<(?!/?(b|strong|i|em|u|ul|ol|li|p|br|div|a)(\s|/|>))[^>]*>?', '', 'gi');
    EXIT WHEN r = anterior;
  END LOOP;
  r := regexp_replace(r, '<(/?)(b|strong|i|em|u|ul|ol|li|p|br|div)(\s[^>]*)?/?>', '<\1\2>', 'gi');
  r := regexp_replace(r, '<a\s[^>]*?href\s*=\s*["'']\s*((https?:|mailto:)[^"''<>\s]*)\s*["''][^>]*>', '<a href="\1">', 'gi');
  r := regexp_replace(r, '<a(?!\s+href="(https?:|mailto:)[^"]*">)(\s[^>]*)?>', '<a>', 'gi');
  r := regexp_replace(r, '</a\s[^>]*>', '</a>', 'gi');
  RETURN r;
END $$;