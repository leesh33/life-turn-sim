#!/usr/bin/env python3
"""legacy 이벤트 파일을 '개월차' 모델로 1회 변환한다.

1) `at: [나이, 일차]` 의 일차(1, 30, 60 … 330)를 개월(1~12)로 바꾼다.
2) 나이 범위가 없는(=`at` 없이 단계 풀에서 뽑히는) 이벤트에 minAge/maxAge 를 넣는다.
   영아기 이벤트가 3세에 나오는 식의 고증 오류를 막기 위한 1회성 패치다.
"""
import re
import pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'events'

# id -> (minAge, maxAge)  · at 이 없는 이벤트만
RANGES = {
    # ── 유아기 (1~7) ──
    'night_awake': (1, 1), 'baby_food': (1, 1), 'bath_time': (1, 4),
    'grandma_holiday': (2, 7), 'picky_eater': (3, 5), 'sibling_fight': (4, 7),
    'stationery_gacha': (5, 7),
    # ── 초등학교 (8~13) ──
    'friend_fight': (8, 13), 'academy_homework': (9, 13), 'lunch_tray': (8, 13),
    'lost_pocket_money': (8, 12), 'ttakji_battle': (8, 10), 'academy_van': (8, 13),
    'teacher_sticker': (8, 10), 'milk_time': (8, 11), 'swim_class': (8, 12),
    'bullying_witness': (11, 13), 'pc_bang': (11, 13),
    # ── 중학교 (14~16) ──
    'mid_academy': (14, 16), 'youtube_dream': (14, 16), 'parents_fight': (14, 16),
    'festival_band': (14, 16), 'mid_night_snack': (14, 16), 'crush_answer': (15, 16),
    'first_breakup': (15, 16), 'middle_part_time': (15, 16), 'middle_youtube_fail': (14, 16),
    # ── 고등학교 (17~19) ──
    'night_study': (17, 19), 'night_escape_bust': (18, 19), 'retry_academy': (19, 19),
    # ── 대학교 (20~24) ──
    'college_class': (20, 24), 'used_trade_report': (22, 23), 'college_diet': (20, 24),
    # ── 사회생활 (25~34) ──
    'overtime_night': (25, 34), 'job_move': (29, 34), 'salary_day_work': (25, 34),
    'lunch_menu': (25, 34), 'office_pc_change': (25, 34),
    # ── 가정 (35~49) ──
    'mortgage': (35, 40), 'car_change': (38, 49), 'parent_illness': (44, 49),
    'floor_noise': (40, 49), 'maintenance_bill': (40, 49), 'inlaw_hospital': (44, 49),
    'retirement_prep': (46, 49), 'single_life': (35, 49), 'solo_apartment': (35, 49),
    'solo_hobby': (35, 49), 'weekend_family': (35, 49), 'inlaws': (35, 49),
    'holiday_nagging': (35, 49),
    # ── 중년 (50~64) ──
    'midlife_walk': (50, 64), 'rehired': (50, 64), 'reunion': (50, 64),
    'kid_job': (50, 64), 'checkup_regular': (50, 64), 'polyp_result': (52, 54),
    'franchise_reality': (56, 62), 'hiking_club': (50, 64), 'health_scare': (52, 64),
    'stocks': (50, 64),
    # ── 노년 (65~80) ──
    'senior_walk': (65, 80), 'with_spouse': (65, 80), 'neighbor': (65, 80),
    'grandchild_care': (65, 78), 'old_age_diary': (72, 80),
    # ── 돌발 (any) ──
    'any_lottery': (19, 80), 'any_old_friend': (13, 80), 'any_burnout': (8, 80),
    'any_exercise': (15, 80), 'any_house_move': (20, 80), 'any_news_of_friend': (40, 80),
    'any_good_luck': (20, 80), 'any_year_end_tax': (20, 80), 'any_phone_lost': (8, 80),
    'any_car_touch': (22, 80), 'any_typhoon': (1, 80), 'any_invest_room': (25, 80),
    'any_smishing': (15, 80), 'any_volunteer': (14, 80), 'any_book_habit': (8, 80),
    'any_neighbor_help': (20, 80), 'any_diet_home': (20, 80),
}

AT_RE = re.compile(r'at: \[(\d+),\s*(\d+)\]')
ID_STAGE_RE = re.compile(r"(id: '([a-z0-9_]+)', stage: '[a-z]+',)")


def day_to_month(d: int) -> int:
    if d == 1:
        return 1
    return max(1, min(12, round(d / 30) + 1))


def convert(text: str) -> str:
    def at_sub(m):
        age, day = int(m.group(1)), int(m.group(2))
        return 'at: [%d, %d]' % (age, day_to_month(day))

    text = AT_RE.sub(at_sub, text)

    def id_sub(m):
        whole, eid = m.group(1), m.group(2)
        if eid in RANGES:
            lo, hi = RANGES[eid]
            return whole + ' minAge: %d, maxAge: %d,' % (lo, hi)
        return whole

    return ID_STAGE_RE.sub(id_sub, text)


if __name__ == '__main__':
    for path in sorted(BASE.glob('legacy-*.js')):
        src = path.read_text(encoding='utf-8')
        out = convert(src)
        if out != src:
            path.write_text(out, encoding='utf-8')
            print('변환:', path.name)
