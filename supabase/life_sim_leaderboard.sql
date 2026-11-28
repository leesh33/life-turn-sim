-- ─────────────────────────────────────────────────────────────
-- 「인생 한 턴」 · 🏆 전체 유저 익명 랭킹판 (Cloud Leaderboard) — Supabase 스키마
-- 프로젝트: zdcdvjlssncsawpqsjwe (reelpin 프로젝트 공용)
--            → 이 파일은 life_sim_* 객체만 만진다. 릴스핀 테이블·설정은 건드리지 않는다.
-- Supabase 대시보드 → SQL Editor 에 이 파일을 통째로 붙여 넣고 Run. 다시 실행해도 안전(idempotent).
--
--   · public.life_sim_leaderboard  로그인한 사람이 남긴 인생 기록 1건 = 1행
--       - 이메일·실명은 저장하지 않는다. display_name(닉네임, 기본 '익명 플레이어')과
--         캐릭터 이름·칭호·점수만 남는다.
--       - (user_id, run_key) 유니크 — 같은 인생을 다시 올리면 새 행이 아니라 갱신된다.
--   · 읽기  life_sim_leaderboard_list(p_sort, p_limit, p_my_best_score)  — anon 포함 공개
--   · 쓰기  life_sim_leaderboard_submit(...)  — 로그인한 본인만, 검증 + 속도 제한
--   · 지우기 life_sim_leaderboard_remove(p_id) / life_sim_leaderboard_clear()  — 본인 행만
--   · 테이블에는 RLS 를 켜고 정책을 두지 않는다 → 직접 select/insert 불가, RPC 로만.
--   · 앱은 anon(publishable) 키 + 로그인 토큰으로만 동작한다. service_role 키는 쓰지 않는다.
--
-- 2026-11-28 점수식 동기화 — life_sim_leaderboard_submit 의 score/재산 검증을
--   앱 엔진 lifeScore 와 같은 식(게이지 평균 × 0.40 + 재산 몫 0~56, (log10/5.3)²)으로 교체했다.
--   실서버(zdcdvjlssncsawpqsjwe)에 적용 완료(2026-11-28). 이 파일은 다시 실행해도 안전하다.
-- ─────────────────────────────────────────────────────────────

-- 1. 테이블 ──────────────────────────────────────────────────
create table if not exists public.life_sim_leaderboard (
  id             uuid         primary key default gen_random_uuid(),
  user_id        uuid         not null references auth.users(id) on delete cascade,
  run_key        text         not null,                       -- 기기 전당 기록 id (같은 인생 중복 방지)
  display_name   text         not null default '익명 플레이어',  -- 닉네임. 이메일은 절대 넣지 않는다
  character_name text         not null,                       -- 캐릭터 이름
  title          text         not null default '',            -- 엔딩 칭호
  archetype      text         not null default '',            -- 인생 유형(아키타입)
  final_age      smallint     not null default 0,
  grade          text         not null default 'B',
  score          numeric(5,1) not null default 0,             -- 0~100 종합 점수
  net_assets     numeric(14,0) not null default 0,            -- 재산(만원)
  scenario       text         not null default 'kr',          -- 출발 시나리오
  generation     smallint     not null default 1,             -- 가문 대수
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

comment on table  public.life_sim_leaderboard is '「인생 한 턴」 전체 유저 익명 랭킹 — 로그인한 사람의 인생 기록(이메일·실명 없음)';
comment on column public.life_sim_leaderboard.display_name   is '랭킹에 보이는 이름(닉네임). 비어 있으면 익명 플레이어';
comment on column public.life_sim_leaderboard.character_name is '그 인생의 캐릭터 이름';
comment on column public.life_sim_leaderboard.run_key        is '앱 전당 기록 id — 같은 인생은 한 행으로 갱신';
comment on column public.life_sim_leaderboard.score          is '종합 점수(0~100) — 엔진 lifeScore: 여섯 게이지 평균 × 0.40 + 재산 몫(0~56, log10/5.3 의 제곱)';
comment on column public.life_sim_leaderboard.net_assets     is '마지막 재산(만원). 빚이면 음수';

-- 값 검증 — 앱 버그가 아니라 DB가 마지막으로 막아 준다.
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_score_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_score_chk
  check (score >= 0 and score <= 100);
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_assets_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_assets_chk
  check (net_assets >= -1000000 and net_assets <= 100000000);   -- -100억 ~ +1조(만원)
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_age_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_age_chk
  check (final_age >= 0 and final_age <= 120);
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_gen_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_gen_chk
  check (generation >= 1 and generation <= 99);
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_grade_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_grade_chk
  check (grade in ('S', 'A', 'B', 'C', 'D'));
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_name_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_name_chk
  check (char_length(character_name) between 1 and 24 and position('@' in character_name) = 0);
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_display_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_display_chk
  check (char_length(display_name) between 1 and 20 and position('@' in display_name) = 0);
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_title_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_title_chk
  check (char_length(title) <= 90);
alter table public.life_sim_leaderboard drop constraint if exists life_sim_lb_scenario_chk;
alter table public.life_sim_leaderboard add  constraint life_sim_lb_scenario_chk
  check (scenario ~ '^[a-z0-9_-]{1,16}$');

create unique index if not exists life_sim_leaderboard_run_idx
  on public.life_sim_leaderboard (user_id, run_key);
create index if not exists life_sim_leaderboard_score_idx
  on public.life_sim_leaderboard (score desc, net_assets desc, created_at asc);
create index if not exists life_sim_leaderboard_assets_idx
  on public.life_sim_leaderboard (net_assets desc, score desc, created_at asc);
create index if not exists life_sim_leaderboard_user_idx
  on public.life_sim_leaderboard (user_id, updated_at desc);

-- 2. RLS — 정책 없음 = 직접 접근 금지, SECURITY DEFINER 함수로만 ─────
alter table public.life_sim_leaderboard enable row level security;
revoke all on public.life_sim_leaderboard from anon;
revoke all on public.life_sim_leaderboard from authenticated;

-- 3. 이름 다듬기 (내부용 — 실행 권한은 주지 않는다) ────────────────
--    이메일처럼 보이는 문자열은 지우고, 제어문자·연속 공백을 정리한다.
create or replace function public.life_sim_lb_clean(p_text text, p_max int, p_fallback text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := coalesce(p_text, '');
begin
  v := regexp_replace(v, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+', '', 'g');   -- 이메일 모양 제거
  v := regexp_replace(v, '[[:cntrl:]]', ' ', 'g');                       -- 제어문자 → 공백
  v := btrim(regexp_replace(v, '[[:space:]]+', ' ', 'g'));
  if char_length(v) > p_max then v := left(v, p_max); end if;
  if v = '' then v := p_fallback; end if;
  return v;
end;
$$;
revoke all on function public.life_sim_lb_clean(text, int, text) from public;

-- 4. 등록/갱신 — 로그인한 본인만, 점수는 엔진 공식 범위 안에서만 ────────
--    p_run_key : 앱의 전당 기록 id (같으면 새 행이 아니라 갱신)
--    반환      : { ok, id, created, rank, total, score }
drop function if exists public.life_sim_leaderboard_submit(text, text, text, text, int, text, numeric, numeric, text, int, text);
create or replace function public.life_sim_leaderboard_submit(
  p_run_key        text,
  p_character_name text,
  p_title          text    default '',
  p_archetype      text    default '',
  p_final_age      int     default 0,
  p_grade          text    default 'B',
  p_score          numeric default 0,
  p_net_assets     numeric default 0,
  p_scenario       text    default 'kr',
  p_generation     int     default 1,
  p_display_name   text    default '익명 플레이어'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_name    text;
  v_nick    text;
  v_title   text;
  v_arch    text;
  v_key     text;
  v_grade   text;
  v_score   numeric;
  v_assets  numeric;
  v_age     int;
  v_gen     int;
  v_scn     text;
  v_asset_score numeric;
  v_recent  int;
  v_id      uuid;
  v_is_new  boolean := true;
  v_rank    int;
  v_total   int;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;

  v_score  := round(coalesce(p_score, 0)::numeric, 1);
  v_assets := round(coalesce(p_net_assets, 0)::numeric, 0);
  v_age    := coalesce(p_final_age, 0);
  v_gen    := coalesce(p_generation, 1);
  v_scn    := lower(coalesce(nullif(btrim(p_scenario), ''), 'kr'));
  v_grade  := upper(coalesce(nullif(btrim(p_grade), ''), 'B'));
  v_name   := public.life_sim_lb_clean(p_character_name, 24, '이름 없는 인생');
  v_nick   := public.life_sim_lb_clean(p_display_name, 20, '익명 플레이어');
  v_title  := public.life_sim_lb_clean(p_title, 90, '');
  v_arch   := public.life_sim_lb_clean(p_archetype, 24, '');
  v_key    := left(coalesce(nullif(btrim(p_run_key), ''), 'anon-' || gen_random_uuid()::text), 64);

  -- 숫자 검증
  if v_score < 0 or v_score > 100 then
    raise exception '점수는 0~100 사이여야 합니다' using errcode = '22023';
  end if;
  if v_assets < -1000000 or v_assets > 100000000 then
    raise exception '재산 값이 범위를 벗어났습니다' using errcode = '22023';
  end if;
  if v_age < 0 or v_age > 120 then
    raise exception '나이는 0~120 사이여야 합니다' using errcode = '22023';
  end if;
  if v_gen < 1 or v_gen > 99 then
    raise exception '대수는 1~99 사이여야 합니다' using errcode = '22023';
  end if;
  if v_grade not in ('S', 'A', 'B', 'C', 'D') then
    v_grade := 'B';
  end if;
  if v_scn !~ '^[a-z0-9_-]{1,16}$' then
    v_scn := 'kr';
  end if;

  -- 점수 ↔ 재산 앞뒤 맞추기 — 앱 엔진의 lifeScore(2026-11-25 통일)와 같은 식으로 검증한다.
  --   lifeScore = clamp(게이지 평균 × 0.40 + 재산 몫, 0, 100)
  --   재산 몫   = clamp((log10(재산+1) / 5.3)² × 56, 0, 56)
  -- 게이지 몫은 0~40 이므로, 받은 점수는 [재산 몫 - 0.6, 40 + 재산 몫 + 0.6] 안이어야 한다.
  -- (2026-11-28 이전에는 옛 공식 0.55·45·log10/4.6 으로 검사해, 재산 1억·게이지 낮은
  --  32점대의 정상 기록이 '점수와 재산이 맞지 않습니다'로 거부됐다.)
  v_asset_score := case when v_assets > 0
    then least(56, greatest(0,
      power(greatest(0, log(10::double precision, (v_assets + 1)::double precision) / 5.3), 2) * 56))
    else 0 end;
  if v_score < v_asset_score - 0.6 or v_score > 40 + v_asset_score + 0.6 then
    raise exception '점수와 재산이 맞지 않습니다' using errcode = '22023';
  end if;

  -- 속도 제한 — 한 사람이 1분에 10건, 1시간에 40건까지 (자동 등록이 폭주하지 않게)
  select count(*) into v_recent from public.life_sim_leaderboard
   where user_id = v_uid and updated_at > now() - interval '1 minute';
  if v_recent >= 10 then
    raise exception '잠시 뒤에 다시 시도해 주세요' using errcode = '53400';
  end if;
  select count(*) into v_recent from public.life_sim_leaderboard
   where user_id = v_uid and updated_at > now() - interval '1 hour';
  if v_recent >= 40 then
    raise exception '오늘은 기록을 충분히 올렸습니다' using errcode = '53400';
  end if;

  insert into public.life_sim_leaderboard
    (user_id, run_key, display_name, character_name, title, archetype,
     final_age, grade, score, net_assets, scenario, generation, created_at, updated_at)
  values
    (v_uid, v_key, v_nick, v_name, v_title, v_arch,
     v_age, v_grade, v_score, v_assets, v_scn, v_gen, now(), now())
  on conflict (user_id, run_key) do update
     set display_name   = excluded.display_name,
         character_name = excluded.character_name,
         title          = excluded.title,
         archetype      = excluded.archetype,
         final_age      = excluded.final_age,
         grade          = excluded.grade,
         score          = excluded.score,
         net_assets     = excluded.net_assets,
         scenario       = excluded.scenario,
         generation     = excluded.generation,
         updated_at     = now()
  returning id, (xmax = 0) into v_id, v_is_new;

  -- 한 사람당 최고 30건만 남긴다 (점수 높은 순, 같으면 자산 많은 순)
  delete from public.life_sim_leaderboard l
   where l.user_id = v_uid
     and l.id not in (
       select id from public.life_sim_leaderboard
        where user_id = v_uid
        order by score desc, net_assets desc, created_at asc
        limit 30
     );

  select count(*) into v_total from public.life_sim_leaderboard;
  select count(*) + 1 into v_rank from public.life_sim_leaderboard
   where score > v_score or (score = v_score and net_assets > v_assets);

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'created', v_is_new,
    'rank', v_rank, 'total', v_total, 'score', v_score
  );
end;
$$;

comment on function public.life_sim_leaderboard_submit(text, text, text, text, int, text, numeric, numeric, text, int, text)
  is '「인생 한 턴」 전체 랭킹 등록 — 본인 기록만, 이름/점수 검증 + 속도 제한, 이메일 저장 없음';

revoke all on function public.life_sim_leaderboard_submit(text, text, text, text, int, text, numeric, numeric, text, int, text) from public;
grant execute on function public.life_sim_leaderboard_submit(text, text, text, text, int, text, numeric, numeric, text, int, text) to authenticated;

-- 5. 목록 읽기 — 누구나(anon 포함). user_id·이메일은 돌려주지 않는다. ──────
--    p_sort           'score'(총점) | 'assets'(자산)
--    p_limit          1~100 (기본 30)
--    p_my_best_score  로그인하지 않은 사람이 '내 기록' 백분위를 볼 때 넘기는 내 최고 점수
drop function if exists public.life_sim_leaderboard_list(text, int, numeric);
create or replace function public.life_sim_leaderboard_list(
  p_sort          text    default 'score',
  p_limit         int     default 30,
  p_my_best_score numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_sort   text := case when lower(coalesce(p_sort, 'score')) = 'assets' then 'assets' else 'score' end;
  v_limit  int  := least(100, greatest(1, coalesce(p_limit, 30)));
  v_total  int;
  v_rows   jsonb;
  v_best   numeric;
  v_best_assets numeric;
  v_better int;
  v_me     jsonb := 'null'::jsonb;
begin
  select count(*) into v_total from public.life_sim_leaderboard;

  select coalesce(jsonb_agg(t.e order by t.rn), '[]'::jsonb) into v_rows from (
    select jsonb_build_object(
             'rank', row_number() over (
               order by case when v_sort = 'assets' then l.net_assets else l.score end desc,
                        case when v_sort = 'assets' then l.score else l.net_assets end desc,
                        l.created_at asc, l.id asc),
             'character_name', l.character_name,
             'display_name',   l.display_name,
             'title',          l.title,
             'archetype',      l.archetype,
             'final_age',      l.final_age,
             'grade',          l.grade,
             'score',          l.score,
             'net_assets',     l.net_assets,
             'scenario',       l.scenario,
             'generation',     l.generation,
             'created_at',     l.created_at,
             'mine',           (v_uid is not null and l.user_id = v_uid)
           ) as e,
           row_number() over (
               order by case when v_sort = 'assets' then l.net_assets else l.score end desc,
                        case when v_sort = 'assets' then l.score else l.net_assets end desc,
                        l.created_at asc, l.id asc) as rn
      from public.life_sim_leaderboard l
     limit v_limit
  ) t;

  if v_uid is not null then
    select score, net_assets into v_best, v_best_assets
      from public.life_sim_leaderboard
     where user_id = v_uid
     order by score desc, net_assets desc
     limit 1;
    if v_best is not null then
      select count(*) into v_better from public.life_sim_leaderboard l
       where l.score > v_best or (l.score = v_best and l.net_assets > coalesce(v_best_assets, 0));
    end if;
  elsif p_my_best_score is not null and p_my_best_score >= 0 and p_my_best_score <= 100 then
    v_best := round(p_my_best_score::numeric, 1);
    select count(*) into v_better from public.life_sim_leaderboard l where l.score > v_best;
  end if;

  if v_best is not null then
    v_me := jsonb_build_object(
      'signed_in', (v_uid is not null),
      'best_score', v_best,
      'total', v_total,
      'better', coalesce(v_better, 0),
      'rank', case when v_total > 0 then coalesce(v_better, 0) + 1 else null end,
      'top_percent', case when v_total > 0
        then least(100, greatest(1, ceil(100.0 * coalesce(v_better, 0) / v_total)))
        else null end
    );
  end if;

  return jsonb_build_object(
    'sort', v_sort,
    'limit', v_limit,
    'total', v_total,
    'entries', v_rows,
    'me', v_me
  );
end;
$$;

comment on function public.life_sim_leaderboard_list(text, int, numeric)
  is '「인생 한 턴」 전체 랭킹 목록 — 익명 공개 읽기. user_id·이메일은 반환하지 않는다';

revoke all on function public.life_sim_leaderboard_list(text, int, numeric) from public;
grant execute on function public.life_sim_leaderboard_list(text, int, numeric) to anon;
grant execute on function public.life_sim_leaderboard_list(text, int, numeric) to authenticated;

-- 6. 내 기록 지우기 (본인 행만) ─────────────────────────────────
create or replace function public.life_sim_leaderboard_remove(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;
  delete from public.life_sim_leaderboard where id = p_id and user_id = v_uid;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'removed', v_n);
end;
$$;
revoke all on function public.life_sim_leaderboard_remove(uuid) from public;
grant execute on function public.life_sim_leaderboard_remove(uuid) to authenticated;

create or replace function public.life_sim_leaderboard_clear()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n   int;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;
  delete from public.life_sim_leaderboard where user_id = v_uid;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'removed', v_n);
end;
$$;
revoke all on function public.life_sim_leaderboard_clear() from public;
grant execute on function public.life_sim_leaderboard_clear() to authenticated;

-- 7. 확인용 ───────────────────────────────────────────────────
-- select relrowsecurity from pg_class where oid = 'public.life_sim_leaderboard'::regclass;   -- t
-- select count(*) from public.life_sim_leaderboard;
-- select public.life_sim_leaderboard_list('score', 5, 70) -> 'entries';
