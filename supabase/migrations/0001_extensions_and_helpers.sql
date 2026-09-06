-- Extensions
create extension if not exists "pgcrypto";

-- Generic audit trigger: stamps created_at/updated_at/updated_by on every write.
-- updated_by is derived from auth.uid() server-side so clients cannot spoof it.
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;
  return new;
end;
$$;

comment on function public.set_audit_fields() is
  'Trigger function: stamps created_at/updated_at/updated_by. updated_by always reflects the authenticated writer.';
