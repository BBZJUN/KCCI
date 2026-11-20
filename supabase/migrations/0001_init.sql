-- 잡도리 초기 스키마 (Supabase PostgreSQL)
-- 원칙: 안내 메일 원문은 저장하지 않는다. 일정과 근거 문장만 보관한다.

create type stage_kind as enum ('fixed', 'range', 'tbd');
create type confidence as enum ('high', 'mid', 'low');
create type stage_status as enum ('planned', 'confirmed', 'done', 'cancelled');

-- 공고 분석 공유 캐시: 같은 공고는 1회만 LLM 분석 (사용자 수가 아닌 신규 공고 수에 비례)
create table posting_cache (
  content_hash text primary key,          -- 정규화한 공고 원문의 sha256
  source_url   text,
  company      text not null,
  title        text not null,
  extraction   jsonb not null,            -- PostingExtraction
  model        text not null,
  created_at   timestamptz not null default now()
);

-- 사용자가 수락한 지원 건
create table applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  content_hash text references posting_cache,
  company      text not null,
  title        text not null,
  color        text not null default '#2A9D8F',
  status       text not null default 'active' check (status in ('active', 'passed', 'failed', 'withdrawn')),
  created_at   timestamptz not null default now()
);

-- 지원 건별 전형 단계 (캘린더 일정)
create table stages (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  seq            int  not null,
  stage_name     text not null,
  stage_type     text not null,
  kind           stage_kind not null,
  start_date     date,
  end_date       date,
  start_time     time,
  confidence     confidence not null,
  basis          text not null check (basis in ('posting', 'rule', 'notice', 'user')),
  evidence       text not null default '',  -- 근거 문장만 저장
  status         stage_status not null default 'planned',
  updated_at     timestamptz not null default now(),
  unique (application_id, seq)
);

-- 개인·자격증 일정
create table personal_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null,
  category   text not null check (category in ('personal', 'certificate')),
  start_date date not null,
  end_date   date not null,
  source     text not null default 'user' check (source in ('user', 'qnet')),
  created_at timestamptz not null default now()
);

-- 안내 판독 이력 (원문 미저장)
create table notice_logs (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  result         text not null,
  evidence       text not null,
  applied        boolean not null default false,  -- 사용자가 승인해 반영했는지
  created_at     timestamptz not null default now()
);

-- RLS: 본인 데이터만 접근
alter table applications    enable row level security;
alter table stages          enable row level security;
alter table personal_events enable row level security;
alter table notice_logs     enable row level security;
alter table posting_cache   enable row level security;

create policy "own applications" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own stages" on stages for all
  using (exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid()))
  with check (exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "own personal events" on personal_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notice logs" on notice_logs for all
  using (exists (select 1 from applications a where a.id = application_id and a.user_id = auth.uid()));
-- posting_cache: 읽기는 로그인 사용자 전체, 쓰기는 서버(service role)만
create policy "read cache" on posting_cache for select using (auth.role() = 'authenticated');
