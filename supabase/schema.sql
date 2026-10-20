create extension if not exists pgcrypto;

create table profiles(
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  role text not null default 'user' check(role in('user','admin')),
  created_at timestamptz default now()
);

create table categories(
  id serial primary key,
  name text unique not null,
  slug text unique not null
);

create table stories(
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles on delete cascade,
  author_name text,
  category_id int references categories,
  title text not null check(length(btrim(title)) between 1 and 200),
  slug text unique not null check(length(btrim(slug)) between 1 and 120),
  summary text not null check(length(btrim(summary)) between 1 and 500),
  content text not null check(length(btrim(content)) between 1 and 200000),
  cover_url text,
  status text not null default 'draft' check(status in('draft','pending','published','rejected')),
  featured boolean not null default false,
  views int not null default 0,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  fts tsvector generated always as (
    to_tsvector('simple',title||' '||summary||' '||content||' '||coalesce(author_name,''))
  ) stored
);

create index on stories using gin(fts);
create index on stories(status,published_at desc);

create table comments(
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories on delete cascade,
  author_id uuid not null references profiles on delete cascade,
  body text not null check(length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table reports(
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments on delete cascade,
  reporter_id uuid not null references profiles on delete cascade,
  reason text not null default 'inappropriate',
  created_at timestamptz default now(),
  unique(comment_id,reporter_id)
);

create view archive as
select to_char(published_at at time zone 'UTC','YYYY-MM') ym,
       count(*)::int n
from stories
where status='published'
group by 1
order by 1 desc;

create function is_admin() returns boolean
language sql security definer stable set search_path=public
as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;

create function set_role(uid uuid,r text) returns void
language plpgsql security definer set search_path=public
as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set role=r where id=uid;
end
$$;

create function bump_view(sid uuid) returns void
language plpgsql security definer set search_path=public
as $$
begin
  perform set_config('app.bump','1',true);
  update stories set views=views+1 where id=sid and status='published';
end
$$;

create function new_user() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  insert into profiles(id,display_name)
  values(new.id,'Writer '||substr(new.id::text,1,6));
  return new;
end
$$;

drop trigger if exists on_signup on auth.users;
create trigger on_signup after insert on auth.users
for each row execute function new_user();

create function guard_story() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if current_setting('app.bump',true)='1' then return new; end if;
  select display_name into new.author_name
  from profiles where id=new.author_id;

  if not is_admin() then
    if tg_op='INSERT' then
      new.featured:=false;
      new.published_at:=null;
      new.views:=0;
      if new.status not in('draft','pending') then new.status:='draft'; end if;
    else
      new.featured:=old.featured;
      new.published_at:=old.published_at;
      new.author_id:=old.author_id;
      new.views:=old.views;
      if new.status not in('draft','pending') then new.status:=old.status; end if;
      if old.status='published'
         and (new.title<>old.title or new.summary<>old.summary or new.content<>old.content)
      then new.status:='pending'; end if;
    end if;
  end if;

  if new.status='published' and new.published_at is null then
    new.published_at:=now();
  end if;
  new.updated_at:=now();
  return new;
end
$$;

drop trigger if exists t_guard on stories;
create trigger t_guard before insert or update on stories
for each row execute function guard_story();

create function guard_comment() returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' then
    if (select count(*) from comments
        where author_id=new.author_id
        and created_at>now()-interval '1 minute')>=3
    then raise exception 'Too many comments. Wait a minute.'; end if;
    if not is_admin() then new.hidden:=false; end if;
  else
    if not is_admin() then
      new.hidden:=old.hidden;
      new.author_id:=old.author_id;
      new.story_id:=old.story_id;
    end if;
    new.updated_at:=now();
  end if;
  return new;
end
$$;

drop trigger if exists t_gc on comments;
create trigger t_gc before insert or update on comments
for each row execute function guard_comment();

alter table profiles enable row level security;
alter table categories enable row level security;
alter table stories enable row level security;
alter table comments enable row level security;
alter table reports enable row level security;

create policy p_sel on profiles for select using(true);
create policy p_upd on profiles for update using(id=auth.uid());
revoke update on profiles from anon,authenticated;
grant update(display_name) on profiles to authenticated;

create policy c_sel on categories for select using(true);
create policy c_all on categories for all using(is_admin()) with check(is_admin());

create policy s_sel on stories for select
using(status='published' or author_id=auth.uid() or is_admin());
create policy s_ins on stories for insert with check(author_id=auth.uid());
create policy s_upd on stories for update using(author_id=auth.uid() or is_admin());
create policy s_del on stories for delete using(author_id=auth.uid() or is_admin());

create policy m_sel on comments for select
using(not hidden or author_id=auth.uid() or is_admin());
create policy m_ins on comments for insert
with check(author_id=auth.uid() and exists(
  select 1 from stories where id=story_id and status='published'
));
create policy m_upd on comments for update using(author_id=auth.uid() or is_admin());
create policy m_del on comments for delete using(author_id=auth.uid() or is_admin());

create policy r_ins on reports for insert with check(reporter_id=auth.uid());
create policy r_adm on reports for all using(is_admin()) with check(is_admin());

insert into storage.buckets(id,name,public)
values('covers','covers',true) on conflict do nothing;

create policy cov_ins on storage.objects for insert to authenticated
with check(bucket_id='covers' and (storage.foldername(name))[1]=auth.uid()::text);

insert into categories(name,slug) values
('Love','love'),
('Friendship','friendship'),
('Horror','horror'),
('Mystery','mystery'),
('Thriller','thriller'),
('Comedy','comedy'),
('Inspirational','inspirational'),
('Emotional','emotional'),
('Fantasy','fantasy'),
('Adventure','adventure'),
('Short Stories','short-stories'),
('Life Stories','life-stories');
