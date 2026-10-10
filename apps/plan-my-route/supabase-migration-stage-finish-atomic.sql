-- Apply in a test database before enabling the new mobile finish endpoint.
CREATE TABLE IF NOT EXISTS public.stage_finish_request (
 request_id uuid PRIMARY KEY,
 plan_id uuid NOT NULL REFERENCES public.plan(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 input jsonb NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stage_finish_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stage_finish_request FROM anon, authenticated;
GRANT ALL ON public.stage_finish_request TO service_role;

CREATE OR REPLACE FUNCTION public.finish_plan_stage_atomic(p_plan_id uuid,p_user_id uuid,p_request_id uuid,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
 c public.stage%ROWTYPE; n public.stage%ROWTYPE; prior public.stage_finish_request%ROWTYPE;
 next_id uuid; boundary numeric; result jsonb; poi_ids uuid[]; moved integer;
BEGIN
 -- Serialize finish requests for the same plan; never rely on client-supplied ownership.
 PERFORM p.id FROM public.plan p JOIN public.route r ON r.id=p.route_id
 WHERE p.id=p_plan_id AND r.user_id=p_user_id FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
 SELECT * INTO prior FROM public.stage_finish_request WHERE request_id=p_request_id;
 IF FOUND THEN
  IF prior.plan_id<>p_plan_id OR prior.user_id<>p_user_id OR prior.input<>p_input THEN RAISE EXCEPTION 'Request changed'; END IF;
  RETURN prior.result;
 END IF;
 SELECT * INTO c FROM public.stage WHERE id=(p_input->>'currentStageId')::uuid AND plan_id=p_plan_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stage not found'; END IF;
 SELECT id INTO next_id FROM public.stage WHERE plan_id=p_plan_id AND start_distance>c.start_distance ORDER BY start_distance,id LIMIT 1;
 IF next_id IS NULL OR next_id<>(p_input->>'nextStageId')::uuid THEN RAISE EXCEPTION 'Next stage changed'; END IF;
 SELECT * INTO n FROM public.stage WHERE id=next_id AND plan_id=p_plan_id FOR UPDATE;
 boundary=(p_input->>'newEndM')::numeric;
 IF c.start_distance IS NULL OR c.end_distance IS NULL OR n.start_distance IS NULL OR n.end_distance IS NULL
 OR c.start_distance<>(p_input->>'expectedCurrentStartM')::numeric OR c.end_distance<>(p_input->>'expectedCurrentEndM')::numeric
 OR n.start_distance<>(p_input->>'expectedNextStartM')::numeric OR n.end_distance<>(p_input->>'expectedNextEndM')::numeric
 OR c.end_distance<>n.start_distance OR boundary<=c.start_distance OR boundary>=c.end_distance OR boundary>=n.end_distance THEN RAISE EXCEPTION 'Boundary changed'; END IF;
 SELECT coalesce(array_agg(value::uuid),ARRAY[]::uuid[]) INTO poi_ids FROM jsonb_array_elements_text(p_input->'poiIds');
 -- Verify every requested POI still belongs to this stage/plan before changing anything.
 IF (SELECT count(*) FROM public.plan_poi WHERE id=ANY(poi_ids) AND plan_id=p_plan_id AND stage_id=c.id AND assignment_mode='stage')<>cardinality(poi_ids) THEN RAISE EXCEPTION 'POI changed'; END IF;
 PERFORM id FROM public.plan_poi WHERE id=ANY(poi_ids) ORDER BY id FOR UPDATE;
 UPDATE public.stage SET end_distance=boundary,end_name=NULL,elevation_gain=(p_input->>'currentGainM')::numeric,elevation_loss=(p_input->>'currentLossM')::numeric,updated_at=now() WHERE id=c.id;
 UPDATE public.stage SET start_distance=boundary,start_name=NULL,elevation_gain=(p_input->>'nextGainM')::numeric,elevation_loss=(p_input->>'nextLossM')::numeric,updated_at=now() WHERE id=n.id;
 UPDATE public.plan_poi SET stage_id=n.id,updated_at=now() WHERE id=ANY(poi_ids) AND plan_id=p_plan_id AND stage_id=c.id AND assignment_mode='stage';
 GET DIAGNOSTICS moved=ROW_COUNT;
 IF moved<>cardinality(poi_ids) THEN RAISE EXCEPTION 'POI changed during save'; END IF;
 result=jsonb_build_object('endM',boundary,'movedPoiCount',moved);
 INSERT INTO public.stage_finish_request(request_id,plan_id,user_id,input,result) VALUES(p_request_id,p_plan_id,p_user_id,p_input,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.finish_plan_stage_atomic(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_plan_stage_atomic(uuid,uuid,uuid,jsonb) TO service_role;
