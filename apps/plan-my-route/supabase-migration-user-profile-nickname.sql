-- 공유 플랜 등에 표시할 사용자 닉네임 (이메일 대신)
CREATE TABLE IF NOT EXISTS public.user_profile (
    user_id uuid NOT NULL,
    nickname text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profile_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES next_auth.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT user_profile_nickname_length CHECK (
        nickname IS NULL OR (char_length(trim(nickname)) >= 1 AND char_length(nickname) <= 40)
    )
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.user_profile TO postgres;
GRANT ALL ON TABLE public.user_profile TO service_role;
