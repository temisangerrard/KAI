import { MarketCommitmentsView } from '../commitments-view';

interface MarketCommitmentsPageProps {
  params: {
    id: string;
  };
}

export default function MarketCommitmentsPage({ params }: MarketCommitmentsPageProps) {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Market Commitments</h1>
        <p className="text-muted-foreground">
          View and monitor token commitments for this market in real-time
        </p>
      </div>
      
      <MarketCommitmentsView marketId={params.id} />
    </div>
  );
}

export const metadata = {
  title: 'Market Commitments - Admin',
  description: 'View and monitor market commitments with real-time updates'
};