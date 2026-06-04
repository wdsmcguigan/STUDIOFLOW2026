-- ============================================================================
-- Phase 2: Atomic character merge. Re-points all scene_characters from the
-- absorbed character to the survivor (dedupe on (scene_id, character_id) by
-- keeping the survivor's existing link), unions aliases (+ absorbed primary_name),
-- then deletes the absorbed character. One statement-set, one transaction.
-- security invoker (default) → the caller's RLS still gates every row touched.
-- ============================================================================
create or replace function public.merge_characters(p_survivor uuid, p_absorbed uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if p_survivor = p_absorbed then
    raise exception 'cannot merge a character into itself';
  end if;

  -- Re-point links that don't collide with an existing survivor link in the same scene.
  update public.scene_characters sc
     set character_id = p_survivor
   where sc.character_id = p_absorbed
     and not exists (
       select 1 from public.scene_characters s2
        where s2.scene_id = sc.scene_id and s2.character_id = p_survivor);

  -- Drop the absorbed's now-duplicate links (survivor already present in that scene).
  delete from public.scene_characters where character_id = p_absorbed;

  -- Union aliases (+ the absorbed primary_name) into the survivor.
  update public.characters s
     set aliases = (
       select array(
         select distinct x from unnest(
           s.aliases || a.aliases || array[a.primary_name]
         ) as x where x is not null and x <> ''
       ))
    from public.characters a
   where s.id = p_survivor and a.id = p_absorbed;

  delete from public.characters where id = p_absorbed;
end $$;

grant execute on function public.merge_characters(uuid, uuid) to authenticated;
