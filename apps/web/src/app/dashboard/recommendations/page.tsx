import { PlaceholderPage } from "@/components/app/placeholder-page";

export default function RecommendationsPage() {
  return (
    <PlaceholderPage
      title="Recommendations"
      subtitle="A ranked list of what to stop, fix or scale — with profit impact attached"
      icon="recommendations"
      emptyTitle="Recommendations appear after your first sync"
      emptyDescription="Each recommendation comes with an estimated weekly profit impact and a confidence level, so you act on the highest-value move first."
    />
  );
}
