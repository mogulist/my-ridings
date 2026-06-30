import { ReactionButtons } from '@/components/reaction-buttons';

type Props = {
  eventId: string;
};

export const CommentsSection = ({ eventId }: Props) => {
  return (
    <section>
      <div className="flex justify-center">
        <ReactionButtons eventId={eventId} />
      </div>
    </section>
  );
};
