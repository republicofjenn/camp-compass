-- 0007 revoked EXECUTE from PUBLIC, but verification afterward showed anon
-- and authenticated still had it -- Supabase's project setup grants EXECUTE
-- directly to anon/authenticated/service_role on every new public-schema
-- function via default privileges, which is a separate grant from PUBLIC's
-- and isn't touched by revoking from PUBLIC alone. Revoke from the actual
-- roles directly this time, then grant back explicitly where intended.

revoke execute on function public.handle_new_guardian() from anon, authenticated;

revoke execute on function public.find_guardian_by_email(text) from anon, authenticated;
grant execute on function public.find_guardian_by_email(text) to authenticated;

revoke execute on function public.get_my_connections() from anon, authenticated;
grant execute on function public.get_my_connections() to authenticated;

revoke execute on function public.is_kid_guardian(uuid) from anon, authenticated;
grant execute on function public.is_kid_guardian(uuid) to authenticated;

revoke execute on function public.can_view_kid_schedule(uuid) from anon, authenticated;
grant execute on function public.can_view_kid_schedule(uuid) to authenticated;
