-- ─────────────────────────────────────────────────────────────
-- 「인생 한 턴」 · 💬 제안·제보 게시판 — Supabase 스키마
-- 프로젝트: zdcdvjlssncsawpqsjwe (reelpin 프로젝트 공용)
-- Supabase 대시보드 → SQL Editor 에 이 파일을 통째로 붙여 넣고 Run.
--
--   · public.life_sim_feedback  이벤트 제안(idea) · 버그/오타 제보(bug) 글
--   · RLS                       누구나 읽기(SELECT) · 누구나 쓰기(INSERT)
--                               · 공감은 RPC(security definer)로만 +1
--   · 앱은 anon(publishable) 키 + RLS 로만 동작한다. service_role 키는 쓰지 않는다.
-- 다시 실행해도 안전(idempotent).
-- ─────────────────────────────────────────────────────────────

-- 1. 테이블 ──────────────────────────────────────────────────
create table if not exists public.life_sim_feedback (
  id            uuid        primary key default gen_random_uuid(),
  kind          text        not null default 'idea',
  age_group     text        not null default '전체',
  title         text        not null default '',
  content       text        not null default '',
  author        text        not null default '익명',
  likes         integer     not null default 0,
  status        text        not null default 'open',
  player_age    integer,
  player_month  integer,
  created_at    timestamptz not null default now()
);

comment on table  public.life_sim_feedback is '「인생 한 턴」 제안·제보 게시판 — 이벤트 제안(idea) / 버그·오타 제보(bug)';
comment on column public.life_sim_feedback.kind is 'idea = 이벤트 제안, bug = 버그·오타 제보';
comment on column public.life_sim_feedback.age_group is '1~7세 · 8~13세 · 14~19세 · 20~24세 · 25~34세 · 35세~ · 전체';
comment on column public.life_sim_feedback.status is 'open(접수됨) · applied(반영됨) · fixed(수정됨)';
comment on column public.life_sim_feedback.player_age is '제보 시점의 플레이 나이(선택)';
comment on column public.life_sim_feedback.player_month is '제보 시점의 개월차(선택)';

-- 값 검증 — 앱 버그가 아니라 DB가 마지막으로 막아 준다.
alter table public.life_sim_feedback drop constraint if exists life_sim_feedback_kind_chk;
alter table public.life_sim_feedback add  constraint life_sim_feedback_kind_chk
  check (kind in ('idea', 'bug'));
alter table public.life_sim_feedback drop constraint if exists life_sim_feedback_status_chk;
alter table public.life_sim_feedback add  constraint life_sim_feedback_status_chk
  check (status in ('open', 'applied', 'fixed'));
alter table public.life_sim_feedback drop constraint if exists life_sim_feedback_likes_chk;
alter table public.life_sim_feedback add  constraint life_sim_feedback_likes_chk
  check (likes >= 0);

-- 목록 조회용 인덱스 — 최신순 / 공감순
create index if not exists life_sim_feedback_kind_created_idx
  on public.life_sim_feedback (kind, created_at desc);
create index if not exists life_sim_feedback_kind_likes_idx
  on public.life_sim_feedback (kind, likes desc, created_at desc);

-- 2. RLS ──────────────────────────────────────────────────────
alter table public.life_sim_feedback enable row level security;

-- 읽기: 누구나 (비로그인 플레이어 포함)
drop policy if exists life_sim_feedback_read on public.life_sim_feedback;
create policy life_sim_feedback_read
  on public.life_sim_feedback for select
  to anon, authenticated
  using (true);

-- 쓰기: 누구나, 다만 모양은 서버가 강제한다.
--   · likes/status 는 항상 0/open 으로만 들어오게 (직접 9999 공감 못 넣게)
--   · 빈 글·너무 긴 글·허용하지 않은 kind 는 거부
drop policy if exists life_sim_feedback_insert on public.life_sim_feedback;
create policy life_sim_feedback_insert
  on public.life_sim_feedback for insert
  to anon, authenticated
  with check (
    kind in ('idea', 'bug')
    and likes = 0
    and status = 'open'
    and char_length(btrim(title)) between 2 and 80
    and char_length(btrim(content)) between 5 and 1200
    and char_length(btrim(author)) between 1 and 12
    and char_length(age_group) <= 12
  );

-- 수정/삭제 정책은 만들지 않는다 — 일반 사용자는 글을 고치거나 지울 수 없다.
-- (운영자는 대시보드/서비스롤로 status 를 바꾼다: open → applied / fixed)

-- 3. 테이블 권한 ───────────────────────────────────────────────
grant select, insert on public.life_sim_feedback to anon, authenticated;

-- 4. 공감(👍) — 한 번에 +1 만 하는 함수 ─────────────────────────
create or replace function public.increment_life_sim_feedback_like(row_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_likes integer;
begin
  update public.life_sim_feedback
     set likes = likes + 1
   where id = row_id
  returning likes into v_likes;

  if v_likes is null then
    raise exception 'feedback not found' using errcode = 'P0002';
  end if;

  return v_likes;
end;
$$;

comment on function public.increment_life_sim_feedback_like(uuid) is '제안·제보 글 공감 +1 (비로그인 허용, RLS 우회 대신 이 함수로만 증가)';

revoke all on function public.increment_life_sim_feedback_like(uuid) from public;
grant execute on function public.increment_life_sim_feedback_like(uuid) to anon, authenticated;

-- 5. 안내 글 2건 (게시판이 비어 보이지 않게 · 이미 있으면 건너뜀) ──
insert into public.life_sim_feedback (kind, age_group, title, content, author, status)
select 'idea', '전체',
       '이런 상황·선택지도 넣어 주세요',
       '하고 싶은 이야기를 자유롭게 적어 주세요. 나이대와 상황, 고를 수 있는 선택지 2~4개를 함께 적어 주시면 이벤트로 만들기 좋아요.',
       '운영자', 'applied'
where not exists (
  select 1 from public.life_sim_feedback where author = '운영자' and kind = 'idea'
);

insert into public.life_sim_feedback (kind, age_group, title, content, author, status)
select 'bug', '전체',
       '오타·이상한 문장을 발견하면 알려 주세요',
       '버그나 오타를 제보할 때는 그 화면의 나이·개월차가 자동으로 채워집니다. 어떤 선택을 했을 때 그랬는지 함께 적어 주시면 빨리 고칠 수 있어요.',
       '운영자', 'fixed'
where not exists (
  select 1 from public.life_sim_feedback where author = '운영자' and kind = 'bug'
);
