create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  failed_pins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index users_name_ci on users (lower(name));

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course text not null,
  kind text not null check (kind in ('practice','mock')),
  filters jsonb not null default '{}',
  question_ids text[] not null,
  flagged text[] not null default '{}',
  started_at timestamptz not null default now(),
  time_limit_s int,
  submitted_at timestamptz,
  archived_at timestamptz
);
create index sessions_open on sessions (user_id, course, kind) where archived_at is null and submitted_at is null;

create table attempts (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  course text not null,
  session_id uuid not null references sessions(id) on delete cascade,
  qid text not null,
  domain int not null,
  objective text not null,
  chosen text[] not null,
  correct boolean not null,
  ms int not null,
  created_at timestamptz not null default now()
);
create index attempts_user_course on attempts (user_id, course, created_at);
create index attempts_session on attempts (session_id);

create table ratings (
  user_id uuid not null references users(id) on delete cascade,
  course text not null,
  qid text not null,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, qid)
);
