-- ─────────────────────────────────────────────────────────────
-- 「인생 한 턴」 · 🗑️ 계정 및 클라우드 기록 삭제(회원탈퇴) — Supabase RPC
-- 프로젝트: zdcdvjlssncsawpqsjwe (릴스핀과 같은 프로젝트 — 아래 2번 가드가 릴스핀 기록을 지킨다)
-- Supabase 대시보드 → SQL Editor 에 이 파일을 통째로 붙여 넣고 Run. 다시 실행해도 안전(idempotent).
--
--   public.life_sim_delete_my_account()
--     · life_sim_leaderboard · life_sim_user_state 의 본인 행을 지운다
--     · 같은 계정으로 다른 앱(릴스핀 등)에 남긴 기록이 없을 때만 auth.users 행까지 지운다
--       → 다른 앱 기록이 있으면 계정은 남기고 인생 한 턴 데이터만 지운다(릴스핀 영향 0)
--     · 앱은 anon(publishable) 키 + 로그인 토큰으로만 부른다(security definer · authenticated 만 실행)
--
--   앱 쪽: assets/sync.js 의 deleteAccount() — 이 함수가 없으면 RLS 로 본인 상태행 삭제 +
--          life_sim_leaderboard_clear RPC 로 대신 지운다(그래도 앱 기록은 모두 사라진다).
-- ─────────────────────────────────────────────────────────────
create or replace function public.life_sim_delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid    uuid := auth.uid();
  v_lb     int  := 0;
  v_state  int  := 0;
  v_other  int  := 0;
  v_hit    boolean;
  r        record;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- 1) 인생 한 턴의 클라우드 기록 두 곳
  delete from public.life_sim_leaderboard where user_id = v_uid;
  get diagnostics v_lb = row_count;

  delete from public.life_sim_user_state where user_id = v_uid;
  get diagnostics v_state = row_count;

  -- 2) 같은 계정을 쓰는 다른 앱의 기록이 남아 있는지 — public 스키마에서 auth.users 를 참조하는 표를 모두 훑는다
  --    (릴스핀: pins.user_id on delete cascade · reelpin_shared_collections.owner_id)
  --    auth 스키마(identities·sessions 등)는 계정과 함께 자동으로 정리되므로 세지 않는다.
  for r in
    select c.conrelid::regclass::text as rel, a.attname as col
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'auth.users'::regclass
       and n.nspname = 'public'
       and c.conrelid <> 'public.life_sim_user_state'::regclass
       and c.conrelid <> 'public.life_sim_leaderboard'::regclass
     group by 1, 2
  loop
    execute format('select exists (select 1 from %s where %I = $1)', r.rel, r.col)
       into v_hit using v_uid;
    if coalesce(v_hit, false) then
      v_other := v_other + 1;
      exit;                                   -- 하나라도 있으면 계정은 남긴다
    end if;
  end loop;

  if v_other > 0 then
    return jsonb_build_object(
      'ok', true, 'account_deleted', false, 'kept_for_other_apps', true,
      'state_rows', v_state, 'leaderboard_rows', v_lb);
  end if;

  -- 3) 인생 한 턴에만 쓰는 계정 — 계정 자체를 지운다(같은 Google 계정으로 다시 로그인하면 새 계정)
  delete from auth.users where id = v_uid;

  return jsonb_build_object(
    'ok', true, 'account_deleted', true, 'kept_for_other_apps', false,
    'state_rows', v_state, 'leaderboard_rows', v_lb);
end;
$$;

comment on function public.life_sim_delete_my_account() is
  '「인생 한 턴」 회원탈퇴 — 본인 기록 삭제 + 다른 앱 기록이 없을 때만 계정 삭제 (App Store 5.1.1(v))';

revoke all on function public.life_sim_delete_my_account() from public;
revoke all on function public.life_sim_delete_my_account() from anon;
grant execute on function public.life_sim_delete_my_account() to authenticated;

-- 확인용 ───────────────────────────────────────────────────────
-- select proname from pg_proc where proname = 'life_sim_delete_my_account';
-- select conrelid::regclass, confrelid::regclass from pg_constraint
--  where confrelid = 'auth.users'::regclass and contype = 'f';   -- 가드가 보는 표들
