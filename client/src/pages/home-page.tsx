import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ProgressTracker from "@/components/progress-tracker";
import AdViewer from "@/components/ad-viewer";
import RewardClaim from "@/components/reward-claim";
import { AdView } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  
  // Fetch ad views data
  const { 
    data: adViews,
    isLoading: isLoadingAdViews,
    refetch: refetchAdViews
  } = useQuery<AdView[]>({
    queryKey: ["/api/ad-views"],
  });
  
  // Check if there's a reward claim
  const { 
    data: reward,
    isLoading: isLoadingReward,
    refetch: refetchReward
  } = useQuery({
    queryKey: ["/api/rewards"],
    retry: false,
    enabled: adViews ? adViews.length >= 4 : false, // Only fetch if 4+ ads watched
  });
  
  // Calculate progress
  const adsWatched = adViews?.length || 0;
  const progress = {
    adsWatched,
    percentage: Math.min((adsWatched / 4) * 100, 100)
  };
  
  // Check if user qualifies for reward
  const qualifiesForReward = progress.adsWatched >= 4;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto my-8 px-4">
          <ProgressTracker 
            progress={progress} 
            isLoading={isLoadingAdViews} 
          />
          
          {!qualifiesForReward && (
            <AdViewer 
              onAdComplete={() => refetchAdViews()} 
              disabled={isLoadingAdViews} 
            />
          )}
          
          {qualifiesForReward && !reward && (
            <RewardClaim 
              email={user?.email || ''} 
              onClaimSuccess={() => {
                refetchReward();
                refetchAdViews();
              }} 
              isLoading={isLoadingReward} 
            />
          )}
          
          {qualifiesForReward && reward && (
            <div className="bg-white mt-8 rounded-lg shadow-md p-6 border-2 border-green-500 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-500 mb-4">
                <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reward Successfully Claimed!</h2>
              <p className="text-gray-600 mb-2">Your $10 reward has been processed.</p>
              <p className="text-gray-600">We've sent the details to: <strong>{reward.email}</strong></p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
