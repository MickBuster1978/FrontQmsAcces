-- supabase/migrations/006_valgfrie_attributter.sql
-- Gør alle attributter valgfrie i stedet for påkrævede.
--
-- Begrundelse: et trin skal kunne gemmes hurtigt og fyldes ud i takt med
-- at man har informationen, ikke blokeres af et påkrævet felt man ikke
-- har svaret på endnu. Formularen læser required direkte fra denne
-- tabel (ingen kodeændring nødvendig for den del af fixet).
--
-- Idempotent – en UPDATE kan køres flere gange uden anden effekt.

update public.attribute_definitions
set required = false;

-- ============================================================
-- VERIFIKATION – alle rækker skal nu vise required = false
-- ============================================================

select id, label, required
from public.attribute_definitions
order by sort_order;
