-- Órbita · esquema Postgres (subconjunto del modelo de 02-mcp, con FK reales)
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  name text not null,
  initials text not null,
  color text not null default '#2b59c3',
  bio text,
  industry text,
  role text not null default 'member' check (role in ('admin','moderator','member')),
  created_at timestamptz not null default now()
);

create table if not exists spaces (
  id serial primary key,
  slug text unique not null,
  group_name text not null,
  group_pos int not null,
  position int not null,
  emoji text not null,
  name text not null,
  kind text not null check (kind in ('posts','anon','course','locked','events','link')),
  admin_only_post boolean not null default false,
  url text
);

create table if not exists posts (
  id serial primary key,
  space_id int not null references spaces(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  title text not null check (length(title) between 1 and 140),
  body text not null check (length(body) between 1 and 10000),
  anonymous boolean not null default false,
  video_duration text,
  created_at timestamptz not null default now()
);
create index if not exists posts_space_created on posts (space_id, created_at desc);
create index if not exists posts_created on posts (created_at desc);

create table if not exists comments (
  id serial primary key,
  post_id int not null references posts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post on comments (post_id, created_at);

create table if not exists likes (
  user_id uuid not null references users(id) on delete cascade,
  post_id int not null references posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists bookmarks (
  user_id uuid not null references users(id) on delete cascade,
  post_id int not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists reports (
  id serial primary key,
  post_id int not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists space_reads (
  user_id uuid not null references users(id) on delete cascade,
  space_id int not null references spaces(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, space_id)
);

create table if not exists courses (
  id serial primary key,
  slug text unique not null,
  space_id int references spaces(id) on delete set null,
  title text not null,
  emoji text not null default '⚡',
  locked boolean not null default false,
  access_ends date
);

create table if not exists sections (
  id serial primary key,
  course_id int not null references courses(id) on delete cascade,
  title text not null,
  position int not null
);

create table if not exists lessons (
  id serial primary key,
  section_id int not null references sections(id) on delete cascade,
  title text not null,
  position int not null,
  duration text not null default '00:00',
  video_url text
);

create table if not exists progress (
  user_id uuid not null references users(id) on delete cascade,
  lesson_id int not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists events (
  id serial primary key,
  title text not null,
  kind text not null,
  starts_at timestamptz not null,
  base_going int not null default 0
);

create table if not exists rsvps (
  event_id int not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (event_id, user_id)
);

create table if not exists points_ledger (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  action text not null,
  ref text,
  points int not null,
  created_at timestamptz not null default now()
);
create index if not exists points_user_created on points_ledger (user_id, created_at);

create table if not exists notifications (
  id serial primary key,
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  href text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user on notifications (user_id, created_at desc);

create table if not exists messages (
  id serial primary key,
  sender_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists msg_pair on messages (sender_id, recipient_id, created_at);
create index if not exists msg_recipient on messages (recipient_id, read);

-- Endurecimiento previo al lanzamiento (2026-10-31)
create table if not exists auth_events (
  id bigserial primary key,
  kind text not null check (kind in ('login_ok','login_fail','register','register_fail')),
  email text,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists auth_events_email on auth_events (email, created_at);
create index if not exists auth_events_ip on auth_events (ip, created_at);

-- un mismo hecho solo puntúa una vez (cierra carreras de like/lección/comentario)
create unique index if not exists points_ledger_ref on points_ledger (ref) where ref is not null;

-- notificaciones de like sin duplicados
alter table notifications add column if not exists ref text;
create unique index if not exists notifications_ref on notifications (ref) where ref is not null;
