-- candle — Supabase(Postgres) 스키마 (PRD-M5 서버 저장 & 링크 공유)
-- Supabase 대시보드 > SQL Editor에 붙여넣어 실행한다.
-- 비로그인 전제: 접근 제어는 share 토큰이 담당하고, 서버는 service_role 키로
-- 접근하므로 RLS는 켜두되 정책을 추가하지 않는다(서버 외 직접 접근 차단).

-- 디자인 문서: doc은 Design JSON(packages/shared/schema) 전체.
create table if not exists public.designs (
  id          text primary key,
  doc         jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 공유 토큰: 한 디자인당 edit/view 두 행. 토큰은 추측 불가능한 난수(서버 생성).
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
