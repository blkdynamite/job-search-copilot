-- FirstHour — atomic tailor-credit spend.
-- Race-safe decrement: returns the remaining credit count, or NULL when the user is out of credits
-- (the WHERE guard means no row is updated at zero). Lives in the firsthour schema; touches nothing
-- in public.

create or replace function firsthour.firsthour_spend_tailor_credit(p_user uuid)
returns integer
language sql
security definer
set search_path = firsthour
as $$
  update firsthour.firsthour_users
     set tailor_credits = tailor_credits - 1
   where id = p_user and tailor_credits > 0
  returning tailor_credits;
$$;

grant execute on function firsthour.firsthour_spend_tailor_credit(uuid) to service_role;
