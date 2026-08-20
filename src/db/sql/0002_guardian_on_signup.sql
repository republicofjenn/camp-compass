-- Auto-creates a guardians row whenever someone signs up via Supabase Auth
-- (auth.users), keeping guardians.id in sync with the auth user's id.
-- Standard Supabase pattern: trigger on auth.users insert.

create or replace function public.handle_new_guardian()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guardians (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_guardian();
