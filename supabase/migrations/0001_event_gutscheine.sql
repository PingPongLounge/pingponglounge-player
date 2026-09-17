-- ============================================================================
-- Gutscheine fuer PLAYER-Events — Turnier, Open Game, Single Night
-- ----------------------------------------------------------------------------
-- Rein additiv. Die Tabelle discount_codes gibt es bereits; sie gehoert dem
-- Webshop (Migration 0009 im Webseiten-Repo). Hier kommen drei Spalten dazu.
-- Bestehende Shop-Codes bekommen scope = {shop} und verhalten sich unveraendert:
-- der Shop-Checkout fragt scope gar nicht ab, und keine Event-Route akzeptiert
-- einen Code ohne passenden scope-Eintrag.
--
-- Warum eine eigene Einloesungstabelle statt eines Zaehlers:
-- der Shop schreibt times_used = gelesenerWert + 1. Zwei gleichzeitige
-- Bestellungen lesen dieselbe Zahl und schreiben dieselbe zurueck — eine
-- Einloesung verschwindet. Ausserdem zaehlt er beim START des Checkouts, also
-- verbraucht auch ein abgebrochener Kauf Kontingent. Fuer Events zaehlen wir
-- Zeilen, nicht ein Feld, und reservieren wie einen Sitzplatz.
-- ============================================================================

-- ── 1. discount_codes erweitern ─────────────────────────────────────────────
alter table public.discount_codes
  add column if not exists scope         text[] not null default '{shop}',
  add column if not exists location_name text,
  add column if not exists event_id      uuid;

comment on column public.discount_codes.scope is
  'Wo der Code gilt: shop | tournament | open_game | single_night. Mehrfach moeglich.';
comment on column public.discount_codes.location_name is
  'Optional: nur an diesem Standort (open_games.location_name / player_tournaments.city).';
comment on column public.discount_codes.event_id is
  'Optional: nur fuer genau dieses Event.';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'discount_codes_scope_chk') then
    alter table public.discount_codes add constraint discount_codes_scope_chk
      check (scope <@ array['shop','tournament','open_game','single_night']::text[]
             and cardinality(scope) > 0);
  end if;
end $$;

-- Events kennen nur vier Stufen und nur Prozent. Der Shop bleibt frei.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'discount_codes_event_stufen_chk') then
    alter table public.discount_codes add constraint discount_codes_event_stufen_chk
      check (
        not (scope && array['tournament','open_game','single_night']::text[])
        or (kind = 'percent' and value in (20,30,50,100))
      );
  end if;
end $$;

-- ── 2. Einloesungen ─────────────────────────────────────────────────────────
create table if not exists public.voucher_redemptions (
  id             uuid primary key default gen_random_uuid(),
  code           text not null,
  art            text not null,
  ref_table      text not null,
  ref_id         uuid not null,
  prozent        smallint not null,
  preis_vorher   numeric(10,2) not null,
  preis_nachher  numeric(10,2) not null,
  status         text not null default 'reserved',
  reserved_until timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint voucher_redemptions_art_chk    check (art in ('tournament','open_game','single_night')),
  constraint voucher_redemptions_status_chk check (status in ('reserved','confirmed','released')),
  constraint voucher_redemptions_stufe_chk  check (prozent in (20,30,50,100)),
  -- EINE Anmeldung traegt hoechstens EINEN Gutschein. Dieser Index ist
  -- zugleich die Idempotenz: eine Webhook-Wiederholung trifft dieselbe Zeile.
  constraint voucher_redemptions_ref_uniq   unique (ref_table, ref_id)
);

create index if not exists voucher_redemptions_code_idx
  on public.voucher_redemptions (code, status);

-- Kein Fremdschluessel auf discount_codes(code): ein geloeschter Code darf die
-- Historie nicht mitnehmen. Der Bezug steht als Text, geprueft wird beim
-- Reservieren.

alter table public.voucher_redemptions enable row level security;
-- Keine Policy: geschrieben und gelesen wird ausschliesslich mit der Service
-- Role (die RLS ohnehin umgeht). anon und authenticated kommen nicht heran.
revoke all on public.voucher_redemptions from public, anon, authenticated;

-- ── 3. Reservieren — mit Sperre, sonst ueberbucht das Kontingent ────────────
-- Zwei Personen mit dem letzten freien Platz eines Codes wuerden ohne Sperre
-- beide "noch frei" lesen. select ... for update auf der Codezeile macht die
-- zweite warten, bis die erste ihre Zeile geschrieben hat.
create or replace function public.gutschein_reservieren(
  p_code       text,
  p_art        text,
  p_ref_table  text,
  p_ref_id     uuid,
  p_preis      numeric,
  p_event_id   uuid    default null,
  p_standort   text    default null,
  p_minuten    integer default 30,
  p_sofort     boolean default false   -- true = direkt confirmed (100 %, kein Stripe)
) returns jsonb
language plpgsql
as $$
declare
  c        public.discount_codes%rowtype;
  benutzt  integer;
  neu      numeric(10,2);
  bis      timestamptz;
begin
  select * into c from public.discount_codes
   where upper(code) = upper(p_code)
   for update;

  if not found                                then return jsonb_build_object('ok', false, 'grund', 'unbekannt'); end if;
  if not c.is_active                          then return jsonb_build_object('ok', false, 'grund', 'inaktiv');   end if;
  if c.expires_at is not null and c.expires_at < now()
                                              then return jsonb_build_object('ok', false, 'grund', 'abgelaufen'); end if;
  if not (p_art = any(c.scope))               then return jsonb_build_object('ok', false, 'grund', 'falsche_art'); end if;
  if c.event_id is not null and c.event_id is distinct from p_event_id
                                              then return jsonb_build_object('ok', false, 'grund', 'anderes_event'); end if;
  if c.location_name is not null and lower(coalesce(p_standort,'')) <> lower(c.location_name)
                                              then return jsonb_build_object('ok', false, 'grund', 'anderer_standort'); end if;
  if c.kind <> 'percent' or c.value not in (20,30,50,100)
                                              then return jsonb_build_object('ok', false, 'grund', 'ungueltige_stufe'); end if;

  if c.max_uses is not null then
    select count(*) into benutzt from public.voucher_redemptions r
     where upper(r.code) = upper(c.code)
       and (r.status = 'confirmed'
            or (r.status = 'reserved' and r.reserved_until is not null and r.reserved_until > now()));
    if benutzt >= c.max_uses then
      return jsonb_build_object('ok', false, 'grund', 'kontingent');
    end if;
  end if;

  neu := round(p_preis * (100 - c.value) / 100.0, 2);
  bis := case when p_sofort then null else now() + make_interval(mins => p_minuten) end;

  insert into public.voucher_redemptions
    (code, art, ref_table, ref_id, prozent, preis_vorher, preis_nachher, status, reserved_until)
  values
    (upper(c.code), p_art, p_ref_table, p_ref_id, c.value::smallint, round(p_preis,2), neu,
     case when p_sofort then 'confirmed' else 'reserved' end, bis)
  on conflict (ref_table, ref_id) do update
     -- Erneuter Anlauf derselben Anmeldung (zweiter Klick, neue Stripe-Session):
     -- dieselbe Zeile wird aufgefrischt, es entsteht keine zweite Einloesung.
     set code = excluded.code, prozent = excluded.prozent,
         preis_vorher = excluded.preis_vorher, preis_nachher = excluded.preis_nachher,
         status = case when public.voucher_redemptions.status = 'confirmed'
                       then 'confirmed' else excluded.status end,
         reserved_until = excluded.reserved_until,
         updated_at = now();

  return jsonb_build_object('ok', true, 'prozent', c.value, 'preis_nachher', neu);
end $$;

-- Bestaetigen: reserved → confirmed. Trifft eine Webhook-Wiederholung keine
-- Zeile mehr, ist nichts zu tun — gezaehlt wird genau einmal.
create or replace function public.gutschein_bestaetigen(p_ref_table text, p_ref_id uuid)
returns boolean language sql as $$
  update public.voucher_redemptions
     set status = 'confirmed', reserved_until = null, updated_at = now()
   where ref_table = p_ref_table and ref_id = p_ref_id and status = 'reserved'
  returning true;
$$;

-- Freigeben: bei Abbruch, Ablauf und echter Stornierung. Kontingent zurueck.
create or replace function public.gutschein_freigeben(p_ref_table text, p_ref_id uuid)
returns boolean language sql as $$
  update public.voucher_redemptions
     set status = 'released', reserved_until = null, updated_at = now()
   where ref_table = p_ref_table and ref_id = p_ref_id and status in ('reserved','confirmed')
  returning true;
$$;

revoke all on function public.gutschein_reservieren(text,text,text,uuid,numeric,uuid,text,integer,boolean) from public, anon, authenticated;
revoke all on function public.gutschein_bestaetigen(text,uuid) from public, anon, authenticated;
revoke all on function public.gutschein_freigeben(text,uuid)  from public, anon, authenticated;
grant execute on function public.gutschein_reservieren(text,text,text,uuid,numeric,uuid,text,integer,boolean) to service_role;
grant execute on function public.gutschein_bestaetigen(text,uuid) to service_role;
grant execute on function public.gutschein_freigeben(text,uuid)  to service_role;

-- ── 4. Beim Open Game entsteht die Zeile erst nach der Zahlung ──────────────
-- Die Einloesung haengt deshalb an einer im Checkout erzeugten Kennung. Damit
-- eine Stornierung sie freigeben kann, steht sie auf der Teilnehmerzeile.
alter table public.open_game_players add column if not exists gutschein_ref uuid;
