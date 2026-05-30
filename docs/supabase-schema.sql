-- candle — Supabase(Postgres) 스키마 (PRD-M5 서버 저장 & 링크 공유, PRD-S6 로그인)
-- Supabase 대시보드 > SQL Editor에 붙여넣어 실행한다.
-- 접근 제어: 편집은 소유권(owner_id, PRD-S6), 열람 공유는 view 토큰(PRD-M5).
-- 서버는 service_role 키로 접근하므로 RLS는 켜두되 정책을 추가하지 않는다
-- (서버 외 직접 접근 차단). 인증(로그인)은 Supabase Auth가 담당.

-- 디자인 문서: doc은 Design JSON(packages/shared/schema) 전체.
-- owner_id = 작성자(Supabase Auth user id). 편집은 소유자만 가능(PRD-S6).
create table if not exists public.designs (
  id          text primary key,
  owner_id    text not null,
  doc         jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists designs_owner_id_idx on public.designs (owner_id);

-- 공유 토큰: PRD-S6 이후 view 행만 발급한다(edit 토큰 제거 — 편집은 소유권).
-- check는 과거 데이터 호환을 위해 두 값을 허용하되, 신규 발급은 'view'만.
create table if not exists public.tokens (
  token       text primary key,
  design_id   text not null references public.designs(id) on delete cascade,
  role        text not null check (role in ('edit', 'view')),
  created_at  timestamptz not null default now()
);

create index if not exists tokens_design_id_idx on public.tokens (design_id);

-- RLS 활성화(정책 없음 = 익명/공개 키 직접 접근 차단). 서버의 service_role 키는
-- RLS를 우회하므로 백엔드만 읽고 쓸 수 있다.
alter table public.designs enable row level security;
alter table public.tokens  enable row level security;

-- ── 마이그레이션 (PRD-S6, 기존 designs 테이블이 있을 때) ──
-- 기존 데이터가 있으면 owner_id가 없으므로 추가 후 백필이 필요하다.
-- MVP 단계라 데이터가 적으면 재설정/삭제로 처리한다.
-- alter table public.designs add column if not exists owner_id text;
-- (백필 후) alter table public.designs alter column owner_id set not null;
-- create index if not exists designs_owner_id_idx on public.designs (owner_id);
