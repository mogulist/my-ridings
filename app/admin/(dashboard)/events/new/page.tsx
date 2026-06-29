import { EventForm } from "../event-form";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Event</h1>
      </div>
      <EventForm />
    </div>
  );
}
