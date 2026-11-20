-- ─────────────────────────────────────────────────────────────
-- 「인생 한 턴」 · ☁️ 구글 로그인 · 클라우드 동기화 — Supabase 스키마
-- 프로젝트: zdcdvjlssncsawpqsjwe (reelpin 프로젝트 공용)
-- Supabase 대시보드 → SQL Editor 에 이 파일을 통째로 붙여 넣고 Run.
--
--   · public.life_sim_user_state  구글 로그인한 사람의 게임 상태(전당·칭호·진행 중 인생)
--   · RLS                         자기 행만 읽고 쓰기 — auth.uid() = user_id
--   · 저장은 RPC(security definer) life_sim_put_state 하나로만 한다.
--                                 (기기 시계가 뒤로 가도 최신 기록이 되돌아가지 않게)
--   · 앱은 anon(publishable) 키 + 로그인 토큰 + RLS 로만 동작한다. service_role 키는 쓰지 않는다.
-- 다시 실행해도 안전(idempotent).
-- ─────────────────────────────────────────────────────────────

-- 1. 테이블 ──────────────────────────────────────────────────
create table if not exists public.life_sim_user_state (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  data        jsonb       not null default '{}'::jsonb,
  revised_at  bigint      not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.life_sim_user_state is '「인생 한 턴」 클라우드 동기화 — 사람 1명당 1행(전당 기록·칭호·진행 중 인생)';
comment on column public.life_sim_user_state.data is '{ v, at, save, saveAt, hall:{seeded,records[]}, titles{}, device } — 앱이 합쳐서 올린 한 덩어리';
comment on column public.life_sim_user_state.revised_at is '앱이 붙인 논리 시각(ms). 이보다 과거 상태로는 덮어쓰지 않는다';

-- 값 검증 — 앱 버그가 아니라 DB가 마지막으로 막아 준다.
alter table public.life_sim_user_state drop constraint if exists life_sim_user_state_data_obj_chk;
alter table public.life_sim_user_state add  constraint life_sim_user_state_data_obj_chk
  check (jsonb_typeof(data) = 'object');
alter table public.life_sim_user_state drop constraint if exists life_sim_user_state_data_size_chk;
alter table public.life_sim_user_state add  constraint life_sim_user_state_data_size_chk
  check (pg_column_size(data) <= 2097152);          -- 2MB (전당 240건 + 진행 중 인생이면 100KB 남짓)
alter table public.life_sim_user_state drop constraint if exists life_sim_user_state_revised_chk;
alter table public.life_sim_user_state add  constraint life_sim_user_state_revised_chk
  check (revised_at >= 0);

-- 2. RLS ──────────────────────────────────────────────────────
alter table public.life_sim_user_state enable row level security;

-- 읽기: 로그인한 본인 행만
drop policy if exists life_sim_user_state_read on public.life_sim_user_state;
create policy life_sim_user_state_read
  on public.life_sim_user_state for select
  to authenticated
  using (auth.uid() = user_id);

-- 쓰기: 로그인한 본인 행만 (앱은 RPC를 쓰지만, 직접 upsert도 같은 규칙으로 막아 둔다)
drop policy if exists life_sim_user_state_insert on public.life_sim_user_state;
create policy life_sim_user_state_insert
  on public.life_sim_user_state for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists life_sim_user_state_update on public.life_sim_user_state;
create policy life_sim_user_state_update
  on public.life_sim_user_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists life_sim_user_state_delete on public.life_sim_user_state;
create policy life_sim_user_state_delete
  on public.life_sim_user_state for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3. 테이블 권한 (anon 에게는 아무것도 주지 않는다) ─────────────
revoke all on public.life_sim_user_state from anon;
grant select, insert, update, delete on public.life_sim_user_state to authenticated;

-- 4. 저장 함수 — 최신 기록만 남기는 upsert ────────────────────
--    · auth.uid() 가 없으면 거부 (비로그인 저장 불가)
--    · 들어온 revised_at 이 저장된 것보다 과거면 덮어쓰지 않고 지금 상태를 돌려준다
--      → 앱은 돌려받은 값이 자기 것과 다르면 다시 합쳐서 올린다
create or replace function public.life_sim_put_state(p_data jsonb, p_revised_at bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'data must be a json object' using errcode = '22023';
  end if;
  if p_revised_at is null or p_revised_at < 0 then
    raise exception 'revised_at must be >= 0' using errcode = '22023';
  end if;

  insert into public.life_sim_user_state (user_id, data, revised_at, created_at, updated_at)
  values (v_uid, p_data, p_revised_at, now(), now())
  on conflict (user_id) do update
     set data       = case when excluded.revised_at >= public.life_sim_user_state.revised_at then excluded.data
                           else public.life_sim_user_state.data end,
         revised_at = greatest(public.life_sim_user_state.revised_at, excluded.revised_at),
         updated_at = case when excluded.revised_at >= public.life_sim_user_state.revised_at then now()
                           else public.life_sim_user_state.updated_at end
  returning data into v_out;

  return v_out;
end;
$$;

comment on function public.life_sim_put_state(jsonb, bigint) is '「인생 한 턴」 동기화 저장 — 본인 행 upsert, 과거 상태는 무시하고 현재 상태를 돌려준다';

revoke all on function public.life_sim_put_state(jsonb, bigint) from public;
grant execute on function public.life_sim_put_state(jsonb, bigint) to authenticated;

-- 5. 확인용 ───────────────────────────────────────────────────
-- select relrowsecurity from pg_class where oid = 'public.life_sim_user_state'::regclass;  -- t
-- select policyname, cmd from pg_policies where tablename = 'life_sim_user_state';
